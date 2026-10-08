import os
from dotenv import load_dotenv
import requests
import cv2
import threading
import time
from datetime import datetime

load_dotenv()

class TelegramNotifier:
    def __init__(self):
        # 1. First check environment variables
        self.bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
        
        # 2. If missing, look in license files
        if not (self.bot_token and self.chat_id):
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            license_paths = [
                os.path.join(root_dir, "aethra.license.json"),
                os.path.join(root_dir, "frontend", "public", "aethra.license.json"),
            ]
            for p in license_paths:
                if os.path.exists(p):
                    try:
                        import json
                        with open(p, "r", encoding="utf-8") as f:
                            lic = json.load(f)
                            if not self.bot_token:
                                self.bot_token = lic.get("telegram_bot_token", "").strip()
                            if not self.chat_id:
                                self.chat_id = str(lic.get("telegram_chat_id", "")).strip()
                    except Exception:
                        pass
        
        # 3. Fallback to active system master bot and user chat
        if not self.bot_token:
            self.bot_token = "8337361642:AAHkEadKvtWMWnHaLVMnAM1COY97VYPiK-w"
        if not self.chat_id:
            self.chat_id = "1331146374"

        self.enabled = bool(self.bot_token and self.chat_id)
        self.welcome_image_path = os.path.join(os.path.dirname(__file__), "welcome.png")
        self._last_send_time = 0.0
        self._category_cooldowns = {}
        self._send_lock = threading.Lock()
        
        # Start the polling thread if enabled
        if self.enabled:
            threading.Thread(target=self._poll_updates, daemon=True).start()
            
    def _poll_updates(self):
        offset = 0
        while True:
            try:
                url = f"https://api.telegram.org/bot{self.bot_token}/getUpdates?offset={offset}&timeout=10"
                resp = requests.get(url, timeout=15)
                data = resp.json()
                
                if data.get("ok"):
                    for result in data.get("result", []):
                        offset = result["update_id"] + 1
                        
                        message = result.get("message", {})
                        text = message.get("text", "")
                        chat_id = message.get("chat", {}).get("id")
                        
                        if text == "/start":
                            if str(chat_id) == str(self.chat_id):
                                self._send_welcome(chat_id)
                            else:
                                self._send_access_denied(chat_id)
            except Exception as e:
                # Silently pass on network errors during polling
                pass
            time.sleep(2)
            
    def _send_access_denied(self, chat_id):
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            data = {
                "chat_id": chat_id, 
                "text": "⛔ <b>Access Denied</b>\n\nYou are not an authorized user for Aethra Vision Command Center. Please contact your system administrator to link your Telegram account.", 
                "parse_mode": "HTML"
            }
            requests.post(url, data=data, timeout=5)
        except Exception:
            pass
            
    def _send_welcome(self, chat_id):
        welcome_text = (
            "🛡️ <b>Welcome to Aethra Vision Command Center</b> 🛡️\n\n"
            "I am the central notification node for your AI Security System. "
            "I am online 24/7 to provide you with real-time updates directly from your surveillance feeds.\n\n"
            "<b>Capabilities:</b>\n"
            "⚠️ Real-time weapon detection alerts\n"
            "🥊 Violence and anomalous behavior tracking\n"
            "📸 Instant snapshot evidence delivery\n"
            "📍 Intrusion zone monitoring\n\n"
            "System status: <i>Online and monitoring.</i>"
        )
        
        try:
            if os.path.exists(self.welcome_image_path):
                url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
                with open(self.welcome_image_path, "rb") as f:
                    files = {"photo": ("welcome.png", f, "image/png")}
                    data = {"chat_id": chat_id, "caption": welcome_text, "parse_mode": "HTML"}
                    resp = requests.post(url, data=data, files=files, timeout=10)
                    print(f"Telegram Photo Response: {resp.status_code} {resp.text}")
            else:
                url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
                data = {"chat_id": chat_id, "text": welcome_text, "parse_mode": "HTML"}
                resp = requests.post(url, data=data, timeout=5)
                print(f"Telegram Msg Response: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Failed to send welcome message: {e}")
        
    def send_alert(self, message: str, frame=None, clip_url: str = "", category: str = "general"):
        if not self.enabled:
            return

        now = time.time()
        # Cooldown per category to prevent flood and Telegram 429
        cooldown_map = {
            "weapon": 8.0,
            "knife": 8.0,
            "tripwire": 10.0,
            "intrusion": 10.0,
            "violence": 10.0,
            "person": 45.0,
            "general": 4.0
        }
        req_cooldown = cooldown_map.get(category.lower(), 5.0)

        with self._send_lock:
            # Check global minimum spacing (1.5s between any telegram api calls)
            if now - self._last_send_time < 1.5:
                return
            # Check category specific cooldown
            last_cat_time = self._category_cooldowns.get(category.lower(), 0.0)
            if now - last_cat_time < req_cooldown:
                return
            self._last_send_time = now
            self._category_cooldowns[category.lower()] = now
            
        # Run in a separate thread so we don't block the video stream
        threading.Thread(target=self._send_sync, args=(message, frame, clip_url), daemon=True).start()
        
    def _send_sync(self, message: str, frame, clip_url: str = ""):
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            backend_host = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
            clip_text = f"\n\n🔗 <b>Evidence Clip:</b> {backend_host}{clip_url}" if clip_url else ""
            timestamp_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            caption_text = (
                f"🚨 <b>AETHRA VISION TACTICAL ALERT</b> 🚨\n\n"
                f"{message}\n"
                f"⏱️ <i>Time: {timestamp_str}</i>"
                f"{clip_text}"
            )
            
            # If we have an image, send a photo instead
            if frame is not None:
                photo_url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
                
                # Resize if frame is too huge for telegram upload (>1280px)
                upload_frame = frame
                h, w = frame.shape[:2]
                if w > 1280:
                    scale = 1280.0 / w
                    upload_frame = cv2.resize(frame, (1280, int(h * scale)))

                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', upload_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                if ret:
                    files = {'photo': ('alert.jpg', buffer.tobytes(), 'image/jpeg')}
                    data = {'chat_id': self.chat_id, 'caption': caption_text, 'parse_mode': 'HTML'}
                    
                    response = requests.post(photo_url, data=data, files=files, timeout=7)
                    if response.status_code == 200:
                        return
                    else:
                        print(f"Telegram Photo Error ({response.status_code}): {response.text}")
            
            # Fallback to text message if no image or encoding/photo failed
            data = {
                "chat_id": self.chat_id,
                "text": caption_text,
                "parse_mode": "HTML"
            }
            requests.post(url, data=data, timeout=5)
            
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")

# Global instance
notifier = TelegramNotifier()
