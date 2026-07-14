from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import json
from database import engine, Base, get_db
import routers.alerts as alerts
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from models import User
from pydantic import BaseModel
import psutil

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "scifi_cyber_secret_key"
ALGORITHM = "HS256"

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Suspicious Behavior Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router)

from ws_manager import manager

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Simply keep the connection open and wait for incoming messages (if any)
            # In a real app, the backend might send a stream of events here.
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
    # We take the higher of the two to represent 'System Load' broadly, 
    # or just return both.
    return {"cpu_percent": cpu, "memory_percent": memory}

# --- Authentication APIs ---

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

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

class CameraRegister(BaseModel):
    camera_id: str
    ip_address: str
    port: int

@app.post("/api/cameras/register")
async def register_camera(cam: CameraRegister):
    msg = {
        "type": "new_camera",
        "camera_id": cam.camera_id,
        "stream_url": f"http://{cam.ip_address}:{cam.port}/video_feed"
    }
    await manager.broadcast(json.dumps(msg))
    return {"status": "success", "message": "Registered"}
