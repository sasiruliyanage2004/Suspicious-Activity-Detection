import threading
import cv2
import re

_reader = None
_reader_lock = threading.Lock()

def get_reader():
    global _reader
    if _reader is None:
        with _reader_lock:
            if _reader is None:
                try:
                    import easyocr
                    _reader = easyocr.Reader(["en"], gpu=True)
                except Exception as e:
                    print(f"Error loading EasyOCR: {e}")
    return _reader

class ALPREngine:
    def __init__(self):
        self.scanned_plates = {}
        self.processing_ids = set()
        self._lock = threading.Lock()

    def get_plate(self, vehicle_id):
        with self._lock:
            return self.scanned_plates.get(vehicle_id)

    def is_processing(self, vehicle_id):
        with self._lock:
            return vehicle_id in self.processing_ids

    def process_async(self, vehicle_id, vehicle_crop):
        with self._lock:
            if vehicle_id in self.processing_ids or vehicle_id in self.scanned_plates:
                return
            self.processing_ids.add(vehicle_id)
        
        t = threading.Thread(target=self._process_crop, args=(vehicle_id, vehicle_crop), daemon=True)
        t.start()

    def _process_crop(self, vehicle_id, vehicle_crop):
        try:
            reader = get_reader()
            if reader is None or vehicle_crop is None or vehicle_crop.size == 0:
                return
                
            h, w = vehicle_crop.shape[:2]
            bottom_crop = vehicle_crop[int(h * 0.4):h, 0:w]
            gray = cv2.cvtColor(bottom_crop, cv2.COLOR_BGR2GRAY)
            
            results = reader.readtext(gray, detail=1, paragraph=False)
            
            best_plate = None
            best_conf = 0.0
            
            for (bbox, text, prob) in results:
                clean_text = text.replace(" ", "").upper()
                clean_text = re.sub(r"[^A-Z0-9-]", "", clean_text)
                
                if 4 <= len(clean_text) <= 10 and prob > 0.3:
                    if prob > best_conf:
                        best_conf = prob
                        best_plate = text.upper().strip()
                        
            with self._lock:
                if best_plate:
                    self.scanned_plates[vehicle_id] = best_plate
                else:
                    self.scanned_plates[vehicle_id] = "NOT_FOUND"
                    
        except Exception as e:
            print(f"ALPR Error: {e}")
        finally:
            with self._lock:
                if vehicle_id in self.processing_ids:
                    self.processing_ids.remove(vehicle_id)

