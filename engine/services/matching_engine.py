import pulp
import math
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.material_listing import MaterialListing
from models.facility import Facility
from models.match import SymbiosisMatch
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

TRANSPORT_COST_PER_KG_KM = 0.002   # USD per kg·km  (Indonesian logistics estimate)
EMISSION_FACTOR_KG_CO2_PER_KG_KM = 0.00015  # kg CO₂ per kg·km (road freight estimate)
EMISSION_PENALTY_WEIGHT = 0.5       # λ — weight of EmissionPenalty in objective


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS points (km)."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def run_matching(listing_id: str, db: AsyncSession) -> list[SymbiosisMatch]:
    """
    Multi-Objective MILP Matchmaking:

    Z = min Σ (Cost_ij · X_ij) + λ · Σ (EmissionPenalty_ij · X_ij)
            - CO2_bonus_per_kg · Σ X_ij

    Where:
      Cost_ij          = distance_km × TRANSPORT_COST_PER_KG_KM
      EmissionPenalty  = distance_km × EMISSION_FACTOR_KG_CO2_PER_KG_KM
      λ                = EMISSION_PENALTY_WEIGHT
      CO2_bonus        = settings.CO2_FACTOR × 0.01  (reward for reuse)

    Constraints:
      Supply ≤ total listed volume
      Min utilization ≥ 80% (ensure material is mostly consumed)
      Max single receiver ≤ 70% (distribute risk)
    """
    listing = await db.get(MaterialListing, listing_id)
    if not listing:
        raise ValueError("Listing not found")

    sender_facility = await db.get(Facility, listing.facility_id)
    if not sender_facility:
        raise ValueError("Sender facility not found")

    # Find eligible receiver facilities from different orgs
    receiver_query = (
        select(Facility)
        .where(Facility.org_id != listing.org_id)
        .where(Facility.is_active == True)
        .where(Facility.facility_type.in_(["processing_plant", "factory"]))
    )
    result = await db.execute(receiver_query)
    receiver_facilities = result.scalars().all()

    if not receiver_facilities:
        logger.warning("No eligible receiver facilities found")
        return []

    supply = listing.volume_kg
    receivers = {str(f.id): f for f in receiver_facilities}

    # Build MILP problem
    prob = pulp.LpProblem("Symbiosis_MultiObjective_Matching", pulp.LpMinimize)

    x = {}
    transport_costs = {}
    emission_penalties = {}
    distances = {}

    for rid, rfac in receivers.items():
        x[rid] = pulp.LpVariable(f"ship_{rid[:8]}", lowBound=0, upBound=supply, cat="Continuous")
        dist = haversine_km(
            sender_facility.latitude, sender_facility.longitude,
            rfac.latitude, rfac.longitude,
        )
        distances[rid] = dist
        transport_costs[rid] = dist * TRANSPORT_COST_PER_KG_KM
        emission_penalties[rid] = dist * EMISSION_FACTOR_KG_CO2_PER_KG_KM

    # Multi-objective: min transport cost + emission penalty − CO2 reuse bonus
    co2_reuse_bonus_per_kg = settings.CO2_FACTOR * 0.01
    prob += pulp.lpSum([
        x[rid] * (
            transport_costs[rid]
            + EMISSION_PENALTY_WEIGHT * emission_penalties[rid]
            - co2_reuse_bonus_per_kg
        )
        for rid in receivers
    ]), "MultiObjective_Total_Cost"

    # Supply constraint: can't ship more than listed
    prob += pulp.lpSum([x[rid] for rid in receivers]) <= supply, "Supply_Limit"

    # Minimum utilization: ship at least 80% of listed volume
    prob += pulp.lpSum([x[rid] for rid in receivers]) >= supply * 0.8, "Min_Utilization"

    # Max per receiver: no single receiver gets more than 70%
    for rid in receivers:
        prob += x[rid] <= supply * 0.7, f"Max_Recv_{rid[:8]}"

    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    if pulp.LpStatus[prob.status] != "Optimal":
        logger.warning(f"MILP solver returned: {pulp.LpStatus[prob.status]}")
        return []

    # Build match records
    matches = []
    for rid, rfac in receivers.items():
        vol = x[rid].varValue
        if vol and vol > 1.0:
            dist = distances[rid]
            co2_saved = vol * settings.CO2_FACTOR
            transport_cost = round(vol * transport_costs[rid], 2)
            match = SymbiosisMatch(
                listing_id=listing.id,
                sender_org_id=listing.org_id,
                receiver_org_id=rfac.org_id,
                sender_facility=listing.facility_id,
                receiver_facility=rfac.id,
                matched_volume_kg=round(vol, 2),
                transport_cost=transport_cost,
                transport_distance_km=round(dist, 2),
                co2_saved_kg=round(co2_saved, 2),
                milp_objective_value=round(pulp.value(prob.objective), 4),
                match_score=round(co2_saved / max(transport_cost, 0.01), 3),
            )
            db.add(match)
            matches.append(match)

    await db.flush()
    logger.info(
        f"Generated {len(matches)} matches for listing {listing_id} "
        f"(MILP obj={pulp.value(prob.objective):.4f})"
    )
    return matches
