import cv2
cap = cv2.VideoCapture("rtsp://admin:Hikvision1@192.168.1.51:554/Streaming/Channels/102", cv2.CAP_FFMPEG)
print("CAM2 Open FFmpeg:", cap.isOpened())
cap.release()
cap = cv2.VideoCapture("rtsp://admin:Hikvision1@192.168.1.51:554/Streaming/Channels/102")
print("CAM2 Open Default:", cap.isOpened())
cap.release()
