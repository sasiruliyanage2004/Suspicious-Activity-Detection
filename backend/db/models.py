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
    clip_url = Column(String, default="")
    snapshot_url = Column(String, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)

class Operator(Base):
    __tablename__ = "operators"

    badge_id = Column(String, primary_key=True, index=True)
    pin = Column(String)
    name = Column(String)
    nic = Column(String)
    shift = Column(String)
    role = Column(String)
    is_active = Column(Integer, default=1) # 1 for True, 0 for False (SQLite boolean fallback)
    is_online = Column(Integer, default=0) # Track active sessions
    last_login = Column(DateTime, nullable=True)
    last_active_ping = Column(DateTime, nullable=True) # Track real-time background presence
    activity_score = Column(Integer, default=0) # Track engagement
    created_at = Column(DateTime, default=datetime.utcnow)
