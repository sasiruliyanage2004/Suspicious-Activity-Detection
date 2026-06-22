import requests
from datetime import datetime

class APIClient:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
    
    def send_alert(self, camera_id: str, behavior_type: str, confidence: float, details: str = ""):
        payload = {
            "camera_id": camera_id,
            "behavior_type": behavior_type,
            "confidence": confidence,
            "details": details
        }
        try:
            response = requests.post(f"{self.base_url}/alerts/", json=payload)
            if response.status_code == 200:
                print(f"[{datetime.now()}] Alert sent successfully: {behavior_type}")
            else:
                print(f"Failed to send alert: {response.text}")
        except Exception as e:
            print(f"Error connecting to backend: {e}")
