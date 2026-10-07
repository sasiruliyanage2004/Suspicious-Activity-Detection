# Aethra Vision Core — Enterprise Production Architecture & Scalability Blueprint

## 1. Executive System Overview
Aethra Vision Core is an autonomous, mission-critical AI surveillance and threat-detection platform engineered for high-concurrency physical security operations (banks, corporate headquarters, transit hubs, and defense installations).

The system integrates real-time computer vision, biomechanical pose estimation, multi-camera re-identification (Re-ID), lethal weapon interception, and tactical audio notifications into an unified glassmorphic command grid.

---

## 2. Multi-Tier Production Architecture

```
                                  +----------------------------------------------------+
                                  |            Edge Video Acquisition Tier             |
                                  |  (Hikvision / Dahua / Axis ONVIF & USB DirectShow)  |
                                  +-------------------------+--------------------------+
                                                            |
                                                   RTSP / TCP Streams
                                                            v
+------------------------------------------------------------------------------------------------------------------+
|                                           High-Throughput Vision AI Tier                                          |
|                                                                                                                  |
|   +-----------------------------+     +-------------------------------+     +--------------------------------+   |
|   |   YOLOv11 Pose Estimator    |     |   Dedicated Threat Detector   |     |    Global Tracker & Re-ID      |   |
|   |  (Biomechanics, Loitering,  |     |   (Guns, Firearms, Knives,    |     |  (HSV Color Signatures, Cross- |   |
|   |      Fall, Smoking)         |     |     Blades, Unattended Bags)  |     |   Camera Handoff Protocols)    |   |
|   +-----------------------------+     +-------------------------------+     +--------------------------------+   |
|                                                                                                                  |
|   [Hardware Acceleration Layer: Nvidia TensorRT (.engine) / ONNX Runtime C++ Kernels / PyTorch JIT]             |
+-----------------------------------------------------------+------------------------------------------------------+
                                                            |
                                        REST (FastAPI) & WebSockets Broadcast
                                                            v
+------------------------------------------------------------------------------------------------------------------+
|                                          Enterprise Command Center Tier                                          |
|                                                                                                                  |
|   +-----------------------------+     +-------------------------------+     +--------------------------------+   |
|   |  TypeScript Typed UI (React)|     |    Biometric & Watchlist DB   |     |   Audio Cyber-Siren Engine     |   |
|   | (Glassmorphism Command Grid,|     |   (Cosine Similarity 128-D    |     |  (Dual Tactical Chimes, Vocal  |   |
|   |   Live HUD, TV Wall Matrix) |     |    Corporate Staff Whitelist) |     |   Warnings, Lockout Alarms)    |   |
|   +-----------------------------+     +-------------------------------+     +--------------------------------+   |
+------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Technology Stack & Language Selection Rationale

| Architectural Tier | Current Production Engine | High-Scale Industrial Blueprint (100+ Cams) | Rationale & Performance Characteristics |
|---|---|---|---|
| **Command Center UI** | **TypeScript / React 19 / Vite** | **TypeScript / React + Tauri Native** | Strict static type definitions eliminate runtime bugs. Tauri provides sub-50MB native desktop distribution with direct GPU rendering. |
| **Edge Vision Inference** | **Python / PyTorch + Ultralytics** | **C++ with Nvidia DeepStream / TensorRT** | Python allows agile threat model training and tuning. In enterprise deployments, models compile to C++ TensorRT engines for sub-5ms GPU latency. |
| **Video Ingestion & NVR** | **OpenCV Threaded Ring Buffer** | **Rust / C++ GStreamer Pipelines** | Zero-copy frame decoding with Nvidia NVDEC, eliminating CPU video decoding bottlenecks. |
| **Streaming Relay Gateway** | **FastAPI Async MJPEG / WebSocket** | **Go (Golang) WebRTC Gateway (MediaMTX)** | Microsecond sub-frame WebRTC streaming across thousands of distributed concurrent operator terminals. |
| **Persistent Audit Store** | **SQLite (ACID Compliant)** | **PostgreSQL + TimescaleDB** | High-ingestion telemetry and forensic metadata retention for regulatory compliance. |

---

## 4. Key AI Vision Capabilities

### 4.1 Lethal Weapon & Threat Interception
- **Primary Model:** Custom YOLO threat detection weight (`models/best.pt`) classifying firearms (Guns), explosives, and bladed instruments (Knives).
- **Secondary COCO Defense:** Secondary tracking for concealed or improvised weapons (Class 43 Knife, Class 76 Scissors, Class 34 Bat/Club).
- **Alert Cadence:** High-confidence detections trigger immediate red bounding boxes, audio sirens, and audit dispatch.

### 4.2 Suspicious Behavioral Analytics
- **Loitering Detection:** Evaluates temporal dwelling within spatial radius (`movement_threshold = 50.0px`). Incursions exceeding 8.0s activate verified loitering alerts.
- **Biomechanical Fall Detection:** Analyzes cranial coordinates relative to hip joints (nose-below-hip ratio) coupled with horizontal aspect ratios (>1.20) enduring for >2.0s.
- **Restricted Tripwire Intrusions:** Polygon containment algorithms (`cv2.pointPolygonTest`) alerting against customizable restricted perimeters.
- **Unattended Baggage Detection:** Identifies stationary luggage items (Class 24 Backpack, 26 Handbag, 28 Suitcase) separated from person proximity (>220px) for over 4 seconds, triggering dual tactical chimes and vocal alerts.

### 4.3 Multi-Camera Re-Identification (Re-ID) & Handoff
- As subjects transition between camera views, the system extracts a 3D HSV color and textural signature.
- Edge boundary exits (`LEFT`, `RIGHT`, `TOP`, `BOTTOM`) are correlated against incoming detections on neighboring cameras (`score > 0.60`), ensuring unbroken multi-camera tracking.

---

## 5. Deployment & System Orchestration
1. **Local Orchestration:** Execute `start.bat` for unified local launch of FastAPI backend (Port 8000), AI Vision pipeline (Port 8002), and Vite command grid (Port 5050).
2. **Cloud Hybrid Deployment:** Backend deployable to high-availability cloud endpoints (e.g., Render / AWS ECS), coupled with edge-accelerated local camera nodes.
