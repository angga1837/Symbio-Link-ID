from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.organization import Organization
from models.user import User
from schemas.organization import OrganizationResponse, OrganizationUpdate
from schemas.esg import ComplianceDocCreate, ComplianceDocResponse
from models.esg import ComplianceDocument

router = APIRouter(prefix="/api/v1/organizations", tags=["Organizations"])


@router.get("/me", response_model=OrganizationResponse)
async def get_my_org(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get the current user's organization."""
    org = await db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/me", response_model=OrganizationResponse)
async def update_my_org(
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update organization details (owner/admin only)."""
    if user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owner/admin can update org")
    org = await db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await db.flush()
    await db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_org(org_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get organization by ID (public profile)."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# --- Compliance / KYC Documents ---

@router.post("/me/compliance", response_model=ComplianceDocResponse, status_code=201)
async def upload_compliance_doc(
    data: ComplianceDocCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a compliance/KYC document (ISO cert, permit, etc.)."""
    doc = ComplianceDocument(
        org_id=user.org_id,
        doc_type=data.doc_type,
        file_url=data.file_url,
        file_hash=data.file_hash,
        issued_date=data.issued_date,
        expiry_date=data.expiry_date,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


@router.get("/me/compliance", response_model=list[ComplianceDocResponse])
async def list_compliance_docs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all compliance documents for my organization."""
    result = await db.execute(
        select(ComplianceDocument)
        .where(ComplianceDocument.org_id == user.org_id)
        .order_by(ComplianceDocument.uploaded_at.desc())
    )
    return result.scalars().all()
