import os
import requests
import cv2
import threading
from datetime import datetime

class TelegramNotifier:
    def __init__(self):
        self.bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
        self.enabled = bool(self.bot_token and self.chat_id)
        
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
                    data = {'chat_id': self.chat_id, 'caption': f"🚨 AEGIS CRITICAL ALERT 🚨\n{message}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"}
                    
                    response = requests.post(photo_url, data=data, files=files, timeout=5)
                    return
            
            # Fallback to text message if no image or encoding failed
            data = {
                "chat_id": self.chat_id,
                "text": f"🚨 AEGIS CRITICAL ALERT 🚨\n{message}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }
            requests.post(url, data=data, timeout=5)
            
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")

# Global instance
notifier = TelegramNotifier()
