from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import datetime
from sqlalchemy.orm import Session
from db import models
from db.database import get_db

router = APIRouter(
    prefix="/api/operators",
    tags=["operators"]
)

class OperatorCreate(BaseModel):
    badge_id: str
    pin: str
    name: str
    nic: str
    shift: str
    role: str
    is_active: int = 1

class OperatorUpdate(BaseModel):
    pin: Optional[str] = None
    name: Optional[str] = None
    nic: Optional[str] = None
    shift: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None

class OperatorResponse(BaseModel):
    badge_id: str
    pin: str
    name: str
    nic: str
    shift: str
    role: str
    is_active: int
    is_online: int = 0
    last_login: Optional[datetime.datetime] = None
    last_active_ping: Optional[datetime.datetime] = None
    activity_score: int = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[OperatorResponse])
def get_operators(db: Session = Depends(get_db)):
    return db.query(models.Operator).order_by(models.Operator.created_at.desc()).all()

@router.post("/", response_model=OperatorResponse)
def create_operator(operator: OperatorCreate, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == operator.badge_id).first()
    if db_op:
        raise HTTPException(status_code=400, detail="Badge ID already exists")
    new_op = models.Operator(**operator.model_dump())
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    return new_op

@router.patch("/{badge_id}", response_model=OperatorResponse)
def update_operator(badge_id: str, updates: OperatorUpdate, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == badge_id).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_op, key, value)
        
    db.commit()
    db.refresh(db_op)
    return db_op

@router.delete("/{badge_id}")
def delete_operator(badge_id: str, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == badge_id).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    db.delete(db_op)
    db.commit()
    return {"status": "success"}

@router.post("/{badge_id}/login")
def login_operator(badge_id: str, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == badge_id).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Operator not found")
    db_op.is_online = 1
    db_op.last_login = datetime.datetime.utcnow()
    db.commit()
    return {"status": "success", "is_online": 1}

@router.post("/{badge_id}/logout")
def logout_operator(badge_id: str, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == badge_id).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Operator not found")
    db_op.is_online = 0
    db.commit()
    return {"status": "success", "is_online": 0}

class HeartbeatPayload(BaseModel):
    activity_count: int = 0

@router.post("/{badge_id}/heartbeat")
def operator_heartbeat(badge_id: str, payload: HeartbeatPayload, db: Session = Depends(get_db)):
    db_op = db.query(models.Operator).filter(models.Operator.badge_id == badge_id).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    db_op.last_active_ping = datetime.datetime.utcnow()
    # Increment score based on clicks/keys
    db_op.activity_score = (db_op.activity_score or 0) + payload.activity_count
    
    db.commit()
    return {"status": "success"}
