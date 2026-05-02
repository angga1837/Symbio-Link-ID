import pulp

def solve_symbiosis_milp(sender_id: str, volume_kg: float):

    # mcok data
    destinations = ["PT_Semen_B", "PT_Beton_C"]
    
    supply_data = {sender_id: volume_kg}
    
    #mockdata
    demand_data = {
        "PT_Semen_B": volume_kg * 0.6,
        "PT_Beton_C": volume_kg * 0.4
    }
    
    # Mock Cost Matrix
    # Biaya per kg berdasarkan jarak imajiner
    cost_matrix = {
        sender_id: {
            "PT_Semen_B": 15.0,  # Misal 15 km
            "PT_Beton_C": 25.0   # Misal 25 km
        }
    }

    sources = list(supply_data.keys())

    prob = pulp.LpProblem("Industrial_Symbiosis_Optimization", pulp.LpMinimize)
    routes = pulp.LpVariable.dicts("Route", (sources, destinations), lowBound=0, cat='Continuous')
    prob += pulp.lpSum([routes[i][j] * cost_matrix[sender_id][j] for i in sources for j in destinations]), "Total_Cost"

    for i in sources:
        prob += pulp.lpSum([routes[i][j] for j in destinations]) <= supply_data[i], f"Supply_Constraint_{i}"

    for j in destinations:
        prob += pulp.lpSum([routes[i][j] for i in sources]) >= demand_data[j], f"Demand_Constraint_{j}"

    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    if pulp.LpStatus[prob.status] != 'Optimal':
        return {"status": "INFEASIBLE", "optimal_cost": None, "routes": {}}

    optimal_routes = {}
    for i in sources:
        for j in destinations:
            vol = routes[i][j].varValue
            if vol and vol > 0:
                optimal_routes[f"{i}->{j}"] = vol

    return {
        "status": "OPTIMAL",
        "optimal_cost": pulp.value(prob.objective),
        "routes": optimal_routes
    }