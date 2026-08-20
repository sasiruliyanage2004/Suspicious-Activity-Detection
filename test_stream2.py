import urllib.request
try:
    response = urllib.request.urlopen("http://127.0.0.1:8002/api/video_feed/2", timeout=5)
    print("Headers:", response.headers)
    chunk = response.read(1024)
    print("Read bytes:", len(chunk))
    print("Starts with:", chunk[:20])
except Exception as e:
    print("Error:", e)
