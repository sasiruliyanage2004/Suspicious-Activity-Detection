from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, index=True)
    behavior_type = Column(String, index=True)
    confidence = Column(Float)
    details = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
