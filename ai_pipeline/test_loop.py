import cv2
import time

cap = cv2.VideoCapture('sample_cam.mp4')
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Total frames: {total_frames}")

for i in range(total_frames + 10):
    ret, frame = cap.read()
    if not ret:
        print(f"EOF reached at iteration {i}. Trying to reset POS_FRAMES...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret2, frame2 = cap.read()
        print(f"Read after reset: {ret2}")
        break
    
    current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
    if current_frame >= total_frames - 2:
        print(f"Near end (frame {current_frame}). Resetting to 0.")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

cap.release()
