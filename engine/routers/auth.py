from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from database import get_db
from models.organization import Organization
from models.user import User
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from middleware.auth import get_current_user
from config import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new organization + owner user."""
    # Check email uniqueness
    existing_user = await db.execute(select(User).where(User.email == data.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
        
    # Check tax_id uniqueness
    existing_org = await db.execute(select(Organization).where(Organization.tax_id == data.tax_id))
    if existing_org.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tax ID already registered")

    # Create org
    org = Organization(
        name=data.org_name,
        org_type=data.org_type,
        tax_id=data.tax_id,
    )
    db.add(org)
    await db.flush()

    # Create owner user
    user = User(
        org_id=org.id,
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        full_name=data.full_name,
        role="owner",
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "org_id": str(org.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        org_id=str(org.id),
        org_name=org.name,
        role=user.role,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and get JWT token."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    org = await db.get(Organization, user.org_id)
    token = create_access_token({"sub": str(user.id), "org_id": str(user.org_id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        org_id=str(user.org_id),
        org_name=org.name if org else "",
        role=user.role,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return user
