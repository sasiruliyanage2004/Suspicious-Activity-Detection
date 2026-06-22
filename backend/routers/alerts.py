from fastapi import APIRouter, Depends, BackgroundTasks
import json
from ws_manager import manager
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime
import models
from database import get_db

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"]
)

class AlertCreate(BaseModel):
    camera_id: str
    behavior_type: str
    confidence: float
    details: str = ""

class AlertResponse(AlertCreate):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=AlertResponse)
def create_alert(alert: AlertCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Broadcast new alert to all connected websocket clients
    alert_dict = {
        "id": db_alert.id,
        "camera_id": db_alert.camera_id,
        "behavior_type": db_alert.behavior_type,
        "confidence": db_alert.confidence,
        "details": db_alert.details,
        "timestamp": db_alert.timestamp.isoformat()
    }
    background_tasks.add_task(manager.broadcast, json.dumps(alert_dict))
    
    return db_alert

@router.get("/", response_model=list[AlertResponse])
def read_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.id.desc()).offset(skip).limit(limit).all()
    return alerts
