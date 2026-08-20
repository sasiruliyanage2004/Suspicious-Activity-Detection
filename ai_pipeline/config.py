import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    WEAPON_CONFIDENCE_THRESHOLD = float(os.getenv("WEAPON_CONFIDENCE_THRESHOLD", 0.35))
    CAMERA_1_RTSP_URL = os.getenv("CAMERA_1_RTSP_URL", "0")
    CAMERA_2_RTSP_URL = os.getenv("CAMERA_2_RTSP_URL", "rtsp://admin:Hikvision321@192.168.1.2:554/Streaming/Channels/102")
    CAMERA_1_IP = os.getenv("CAMERA_1_IP", "192.168.1.64")
    CAMERA_1_PORT = int(os.getenv("CAMERA_1_PORT", 80))
    CAMERA_1_USER = os.getenv("CAMERA_1_USER", "admin")
    CAMERA_1_PASS = os.getenv("CAMERA_1_PASS", "Hikvision321")
    CAMERA_2_IP = os.getenv("CAMERA_2_IP", "192.168.1.2")
    CAMERA_2_PORT = int(os.getenv("CAMERA_2_PORT", 80))
    CAMERA_2_USER = os.getenv("CAMERA_2_USER", "admin")
    CAMERA_2_PASS = os.getenv("CAMERA_2_PASS", "Hikvision321")
    BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

settings = Settings()
