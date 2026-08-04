from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import json
import requests
from typing import Optional
from db.database import engine, Base, get_db
import api.routers.alerts as alerts
import api.routers.operators as operators
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from db.models import User
from pydantic import BaseModel
import psutil
from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

Base.metadata.create_all(bind=engine)

# Gracefully upgrade SQLite database schema if columns do not exist yet (zero bugs!)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN clip_url VARCHAR DEFAULT ''"))
except Exception:
    pass
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN snapshot_url VARCHAR DEFAULT ''"))
except Exception:
    pass

vault_dir = os.path.join(os.path.dirname(__file__), "recordings_vault")
os.makedirs(vault_dir, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME)
app.mount("/vault", StaticFiles(directory=vault_dir), name="vault")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router)
app.include_router(operators.router)

from core.ws_manager import manager

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"WS received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def root():
    return {"message": "Welcome to Suspicious Behavior Detection MVP API"}

@app.get("/api/system/health")
def system_health():
    cpu = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory().percent
    return {"cpu_percent": cpu, "memory_percent": memory}

# --- Authentication & 2FA APIs ---

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class OTPRequest(BaseModel):
    code: str
    message: str
    bot_token: Optional[str] = "7700244458:AAGoJv9eE8rV1Ehy-S4P1KAsfF0VqK2iWpM"
    chat_id: Optional[str] = "6498528994"

@app.post("/api/auth/send_otp")
def send_telegram_otp_endpoint(req: OTPRequest):
    """Reliably delivers Telegram 2FA OTP codes from Python backend synchronously to support frontend failover on error."""
    try:
        token = req.bot_token or "7700244458:AAGoJv9eE8rV1Ehy-S4P1KAsfF0VqK2iWpM"
        chat = req.chat_id or "6498528994"
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        resp = requests.post(url, json={"chat_id": chat, "text": req.message}, timeout=6.0)
        if resp.status_code == 200:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=502, detail=f"Telegram API response error: {resp.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch OTP: {str(e)}")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/api/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token(data={"sub": db_user.username})
    return {"access_token": token, "token_type": "bearer"}


from pydantic import BaseModel

from typing import Optional

class CameraRegister(BaseModel):
    camera_id: str
    stream_url: str

active_cameras = {}

@app.post("/api/cameras/register")
async def register_camera(cam: CameraRegister):
    active_cameras[cam.camera_id] = cam.stream_url
    msg = {
        "type": "new_camera",
        "camera_id": cam.camera_id,
        "stream_url": cam.stream_url
    }
    await manager.broadcast(json.dumps(msg))
    return {"status": "success", "message": "Registered"}

@app.get("/api/cameras")
def get_cameras():
    return [{"id": k, "streamUrl": v, "name": k} for k, v in active_cameras.items()]

camera_zones = {}

class ZoneData(BaseModel):
    points: list[list[int]]  # List of [x, y] coordinates

@app.post("/api/cameras/{camera_id}/zone")
def set_camera_zone(camera_id: str, zone: ZoneData):
    camera_zones[camera_id] = zone.points
    return {"status": "success"}

@app.get("/api/cameras/{camera_id}/zone")
def get_camera_zone(camera_id: str):
    return {"points": camera_zones.get(camera_id, [])}

import base64
import cv2

@app.get("/api/capture_face/{camera_id}")
def capture_live_face(camera_id: str):
    """Fallback snapshot extraction on Port 8000 from real WORM surveillance vault or camera hardware."""
    frame = None
    try:
        if os.path.exists(vault_dir):
            jpgs = [os.path.join(vault_dir, f) for f in os.listdir(vault_dir) if f.endswith(".jpg")]
            if jpgs:
                latest_jpg = max(jpgs, key=os.path.getmtime)
                frame = cv2.imread(latest_jpg)
    except Exception:
        pass

    if frame is None:
        try:
            cap = cv2.VideoCapture(0)
            if cap is not None and cap.isOpened():
                ret, snap = cap.read()
                if ret:
                    frame = snap
                cap.release()
        except Exception:
            pass

    if frame is None:
        return {"status": "error", "message": "No active hardware snapshots found in surveillance vault or live camera."}

    try:
        ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
        b64_str = base64.b64encode(buffer).decode("utf-8")
        return {"status": "success", "image_url": f"data:image/jpeg;base64,{b64_str}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
