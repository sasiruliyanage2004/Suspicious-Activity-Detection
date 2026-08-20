# Aethra Vision Core - Suspicious Activity Detection System

Aethra Vision Core is an enterprise-grade, AI-powered CCTV surveillance and threat detection system. Built for high-security environments, it leverages state-of-the-art Deep Learning models to analyze real-time RTSP video streams, automatically track suspicious individuals, and push zero-latency alerts to human operators.

## System Architecture

The project is divided into three main microservices:

1. **AI Agent Pipeline (`/ai_pipeline`)**
   - Built on Python, OpenCV, and YOLO.
   - Handles real-time video processing from multiple camera feeds.
   - Detects Weapons (Guns, Knives), Violence/Fights, Unattended Luggage, Loitering, and extracts License Plates (ALPR).
   - Controls physical PTZ (Pan-Tilt-Zoom) cameras to physically track subjects across a room.
   - Integrates with DeepFace for Emotion & Stress Analysis.

2. **Frontend Dashboard (`/frontend`)**
   - React + Vite application.
   - Live stream viewing of multiple cameras.
   - Real-time threat log and security governance dashboard.
   - Interactive settings to configure AI thresholds, PTZ rotation limits, and toggle specific AI modules.

3. **Backend API (`/backend`)**
   - FastAPI server.
   - Manages centralized configuration, dual-control (2PI) audit logging, and data retention policies.

## Key Features

- **Heuristic Threat Filtering:** Consecutive frame analysis and spatial overlap verification (e.g., weapon must intersect with a human) to achieve near 0% false positive rates.
- **PTZ Auto-Tracking:** Seamlessly commands Hikvision/Dahua cameras to pan and tilt, locking onto targets without manual intervention. Features a configurable max-rotation limit to prevent cable snagging.
- **Telegram Webhook Integration:** Instantly pushes annotated threat frames and clip links to a designated Telegram channel.
- **Cross-Camera Re-Identification:** Tracks a single suspicious individual across multiple separate camera feeds.

## Getting Started

*(Note: Ensure you configure your `.env` variables and install the respective dependencies for each module before running).*

To launch the entire stack locally:
```bash
start.bat
```
This will spin up the Backend API, the AI Processing Engine, and the React Frontend simultaneously.

