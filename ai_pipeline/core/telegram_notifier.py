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
        self.bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
        self.enabled = bool(self.bot_token and self.chat_id)
        self.welcome_image_path = os.path.join(os.path.dirname(__file__), "welcome.png")
        
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
                            self._send_welcome(chat_id)
            except Exception as e:
                # Silently pass on network errors during polling
                pass
            time.sleep(2)
            
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
        
    def send_alert(self, message: str, frame=None):
        if not self.enabled:
            return
            
        # Run in a separate thread so we don't block the video stream
        threading.Thread(target=self._send_sync, args=(message, frame), daemon=True).start()
        
    def _send_sync(self, message: str, frame):
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            
            # If we have an image, send a photo instead
            if frame is not None:
                photo_url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    files = {'photo': ('alert.jpg', buffer.tobytes(), 'image/jpeg')}
                    data = {'chat_id': self.chat_id, 'caption': f"🚨 AETHRA VISION ALERT 🚨\n{message}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"}
                    
                    response = requests.post(photo_url, data=data, files=files, timeout=5)
                    return
            
            # Fallback to text message if no image or encoding failed
            data = {
                "chat_id": self.chat_id,
                "text": f"🚨 AETHRA VISION ALERT 🚨\n{message}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }
            requests.post(url, data=data, timeout=5)
            
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")

# Global instance
notifier = TelegramNotifier()
