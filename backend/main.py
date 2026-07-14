from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
from database import engine, Base
import routers.alerts as alerts

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
