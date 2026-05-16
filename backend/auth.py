from contextlib import asynccontextmanager
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from db import get_db, init_db
import models
from auth_schemas import UserCreate, UserOut, Token, LoginRequest
from security import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


# on_event("startup") on a Router is deprecated in FastAPI 0.93+ and ignored in
# 0.111.  Move table creation to init_db() called from main.py lifespan instead.
# We keep a convenience function here so main.py can call it.
def ensure_tables():
    init_db()


@router.post("/signup", response_model=UserOut)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    stmt = select(models.User).where(models.User.email == payload.email)
    existing = db.execute(stmt).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    stmt = select(models.User).where(models.User.email == payload.email)
    user = db.execute(stmt).scalars().first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
