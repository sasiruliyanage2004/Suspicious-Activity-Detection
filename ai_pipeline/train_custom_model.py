"""
HOW TO TRAIN A CUSTOM YOLOv8 MODEL FOR WEAPON & VIOLENCE DETECTION
==================================================================
1. Go to Google Colab (https://colab.research.google.com/)
2. Create a "New Notebook"
3. Change Runtime -> T4 GPU (Runtime > Change runtime type > Hardware accelerator > T4 GPU)
4. Copy and paste the code below into Colab cells and run them.

--- CELL 1: Install Dependencies ---
!pip install ultralytics
import ultralytics
ultralytics.checks()

--- CELL 2: Download Dataset ---
# Paste the code you copied from Roboflow here. It should look exactly like this
# (but with your real api_key):
!pip install roboflow
from roboflow import Roboflow
rf = Roboflow(api_key="PASTE_YOUR_API_KEY_HERE")
project = rf.workspace("maheshchhetri").project("weapon-detection-e6otc")
version = project.version(4)
dataset = version.download("yolov8")

--- CELL 3: Train the Model ---
from ultralytics import YOLO

# Load a pre-trained model
model = YOLO('yolov8n.pt')

# Train the model on your dataset for 50 epochs
# (Change dataset.location to your downloaded dataset path)
results = model.train(data=f"{dataset.location}/data.yaml", epochs=50, imgsz=640)

--- CELL 4: Evaluate and Download ---
# Validate the model
metrics = model.val()
print("Training Complete!")

# Download your best.pt file!
from google.colab import files
files.download('/content/runs/detect/train/weights/best.pt')

==================================================================
Once you download 'best.pt', copy it to your 'ai_pipeline' folder 
and change 'yolov8n.pt' to 'best.pt' in your detector.py!
"""
