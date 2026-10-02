"""
Aethra Vision Core - Complete System Orchestrator
Launches Backend (Port 8000), AI Agent (Port 8002), and Frontend (Port 5050)
"""

import os
import sys
import subprocess
import signal
import time
import threading

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
AI_AGENT_DIR = os.path.join(ROOT_DIR, "ai_pipeline")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Determine Python executable
VENV_PYTHON = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
PYTHON_EXE = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

# Determine npm command
NPM_CMD = "npm.cmd" if sys.platform == "win32" else "npm"

processes = []

def stream_output(process, prefix):
    try:
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            line_str = line.strip()
            if line_str:
                print(f"[{prefix}] {line_str}", flush=True)
    except Exception:
        pass

def print_banner():
    banner = r"""
===================================================================
     A E T H R A   V I S I O N   C O R E   -   S Y S T E M
===================================================================
 [BACKEND API]  -> http://127.0.0.1:8000 (Swagger: /docs)
 [AI AGENT]     -> http://127.0.0.1:8002 (Streams: /api/video_feed/1)
 [FRONTEND UI]  -> http://localhost:5050

 Logins:
  - Admin:    liyanagesasiru@gmail.com  /  admin123  (2FA OTP: 892014)
  - Operator: SEC-OP-1024-A  /  PIN: 1234

 Press Ctrl+C to safely shut down all services.
===================================================================
"""
    print(banner, flush=True)

def start_backend():
    print("[Launcher] Starting Backend API on http://127.0.0.1:8000...", flush=True)
    p = subprocess.Popen(
        [PYTHON_EXE, "main.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("Backend", p))
    t = threading.Thread(target=stream_output, args=(p, "Backend"), daemon=True)
    t.start()
    return p

def start_ai_agent():
    print("[Launcher] Starting AI Agent on http://127.0.0.1:8002...", flush=True)
    p = subprocess.Popen(
        [PYTHON_EXE, "main.py"],
        cwd=AI_AGENT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("AI-Agent", p))
    t = threading.Thread(target=stream_output, args=(p, "AI-Agent"), daemon=True)
    t.start()
    return p

def start_frontend():
    print("[Launcher] Starting Frontend on http://localhost:5050...", flush=True)
    p = subprocess.Popen(
        [NPM_CMD, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("Frontend", p))
    t = threading.Thread(target=stream_output, args=(p, "Frontend"), daemon=True)
    t.start()
    return p

def shutdown(sig=None, frame=None):
    print("\n[Launcher] Shutting down all services...", flush=True)
    for name, p in processes:
        try:
            print(f"[Launcher] Stopping {name}...", flush=True)
            p.terminate()
            p.poll()
        except Exception:
            pass
    time.sleep(1)
    for name, p in processes:
        try:
            if p.poll() is None:
                p.kill()
        except Exception:
            pass
    print("[Launcher] All services stopped cleanly. Goodbye!", flush=True)
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    print_banner()

    # 1. Start Backend first
    start_backend()
    time.sleep(2)

    # 2. Start AI Agent
    start_ai_agent()
    time.sleep(2)

    # 3. Start Frontend
    start_frontend()

    try:
        while True:
            time.sleep(1)
            # Check if any process terminated unexpectedly
            for name, p in processes:
                if p.poll() is not None:
                    print(f"[Launcher] Warning: {name} process exited with code {p.returncode}", flush=True)
    except KeyboardInterrupt:
        shutdown()

if __name__ == "__main__":
    main()
