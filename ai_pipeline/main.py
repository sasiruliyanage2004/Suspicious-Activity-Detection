import cv2
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from detector import Detector
from behavior_analyzer import BehaviorAnalyzer
from api_client import APIClient

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ThresholdSetting(BaseModel):
    threshold: float

GLOBAL_WEAPON_THRESHOLD = 0.65

@app.post("/api/settings/threshold")
def update_threshold(setting: ThresholdSetting):
    global GLOBAL_WEAPON_THRESHOLD
    GLOBAL_WEAPON_THRESHOLD = setting.threshold
    return {"status": "success", "threshold": GLOBAL_WEAPON_THRESHOLD}

# Initialize components globally so they stay loaded
detector = Detector()
analyzer = BehaviorAnalyzer()
api = APIClient()

def generate_frames():
    # Open Webcam using DirectShow on Windows
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    # Set resolution to 720p for clearer video
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("Started Suspicious Behavior Detection MVP Pipeline")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Flip the frame horizontally to fix mirror effect
            frame = cv2.flip(frame, 1)
            
            # 1. Detect & Track
            pose_results, weapon_results = detector.process_frame(frame)
            
            # 2. Analyze Weapon Behavior
            weapon_alert = analyzer.analyze_weapons(weapon_results, threshold=GLOBAL_WEAPON_THRESHOLD)
            if weapon_alert:
                if weapon_alert.get("is_new"):
                    api.send_alert(
                        camera_id="webcam_1",
                        behavior_type=weapon_alert["behavior"],
                        confidence=weapon_alert["confidence"],
                        details=weapon_alert["details"]
                    )
                cv2.putText(frame, f"CRITICAL: {weapon_alert['behavior']}", (10, 90), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

            # Base frame for drawing
            annotated_frame = frame.copy()

            # 3. Analyze Human Behavior
            if pose_results[0].boxes.id is not None:
                boxes = pose_results[0].boxes.xyxy.cpu().numpy()
                track_ids = pose_results[0].boxes.id.int().cpu().tolist()
                class_ids = pose_results[0].boxes.cls.int().cpu().tolist()
                confs = pose_results[0].boxes.conf.cpu().tolist()
                
                # Extract keypoints if Pose model is used
                all_keypoints = None
                if hasattr(pose_results[0], 'keypoints') and pose_results[0].keypoints is not None:
                    all_keypoints = pose_results[0].keypoints.xy.cpu().numpy()
                
                for i, (box, track_id, class_id, conf) in enumerate(zip(boxes, track_ids, class_ids, confs)):
                    # In Pose model, person is class 0
                    if class_id == 0:
                        person_keypoints = all_keypoints[i] if all_keypoints is not None else None
                        alert = analyzer.analyze(track_id, box, person_keypoints, conf)
                        
                        # Draw person bounding box manually (removes skeleton lines)
                        x1, y1, x2, y2 = box
                        cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 3)
                        cv2.putText(annotated_frame, f"ID:{track_id} Person {conf:.2f}", (int(x1), int(y1)-10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                        
                        # 3. Trigger Alert
                        if alert:
                            if alert.get("is_new"):
                                api.send_alert(
                                    camera_id="webcam_1",
                                    behavior_type=alert["behavior"],
                                    confidence=alert["confidence"],
                                    details=alert["details"]
                                )
                            
                            # Draw warning on frame continuously
                            cv2.putText(annotated_frame, f"ALERT: {alert['behavior']}", (10, 50), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            # Render weapon detection results on top
            if weapon_results and len(weapon_results) > 0 and weapon_results[0].boxes is not None and len(weapon_results[0].boxes) > 0:
                for box in weapon_results[0].boxes:
                    # Dynamic threshold
                    if box.conf.item() > GLOBAL_WEAPON_THRESHOLD:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        cls_id = int(box.cls.item())
                        weapon_type = weapon_results[0].names[cls_id].upper()
                        
                        # Filter out mobile phones
                        width = x2 - x1
                        height = y2 - y1
                        if weapon_type == "GUN" and height > width * 1.5:
                            continue
                        
                        cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 4)
                        cv2.putText(annotated_frame, weapon_type, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

            
            # Encode the frame in JPEG format with optimized quality for faster streaming
            ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_bytes = buffer.tobytes()
            
            # Yield the output frame in the byte format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")
