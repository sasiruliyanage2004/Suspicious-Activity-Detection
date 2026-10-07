"""
Aethra Vision Core - High-Performance AI Acceleration Engine
==============================================================
Provides automated hardware acceleration orchestration:
1. Native C++ ONNX Runtime Engine (Direct GPU/CPU Execution)
2. Nvidia TensorRT Engine (.engine compilation)
3. Fallback to TorchScript / PyTorch JIT
"""

import os
import sys
import time

class AccelerationEngine:
    @staticmethod
    def get_hardware_capabilities():
        """Detects available hardware accelerators for maximum inference FPS."""
        info = {
            "device": "cpu",
            "cuda_available": False,
            "device_name": "Standard Host CPU",
            "recommended_backend": "PyTorch / ONNX C++ Runtime"
        }
        try:
            import torch
            if torch.cuda.is_available():
                info["cuda_available"] = True
                info["device"] = "cuda:0"
                info["device_name"] = torch.cuda.get_device_name(0)
                info["recommended_backend"] = "Nvidia TensorRT / CUDA C++"
        except Exception:
            pass
        return info

    @staticmethod
    def export_to_onnx(model_path, imgsz=(480, 640)):
        """
        Exports a PyTorch model (.pt) to optimized C++ ONNX format (.onnx).
        ONNX engines run via compiled C++ kernels with zero Python interpreter overhead.
        """
        try:
            from ultralytics import YOLO
            if not os.path.exists(model_path):
                print(f"[AccelerationEngine] File not found: {model_path}")
                return None
            
            onnx_path = model_path.replace(".pt", ".onnx")
            if os.path.exists(onnx_path):
                print(f"[AccelerationEngine] Compiled ONNX engine already exists: {onnx_path}")
                return onnx_path

            print(f"[AccelerationEngine] Exporting {model_path} to compiled C++ ONNX format...")
            model = YOLO(model_path)
            exported = model.export(format="onnx", imgsz=imgsz, simplify=True, dynamic=False)
            print(f"[AccelerationEngine] Successfully exported to: {exported}")
            return exported
        except Exception as e:
            print(f"[AccelerationEngine] ONNX Export notice: {e}")
            return None

    @staticmethod
    def export_to_tensorrt(model_path):
        """
        Exports model to Nvidia TensorRT (.engine) for microsecond C++ GPU execution.
        Requires Nvidia GPU with CUDA drivers.
        """
        try:
            from ultralytics import YOLO
            model = YOLO(model_path)
            exported = model.export(format="engine", half=True)
            print(f"[AccelerationEngine] TensorRT engine compiled: {exported}")
            return exported
        except Exception as e:
            print(f"[AccelerationEngine] TensorRT requires Nvidia CUDA environment: {e}")
            return None

accelerator = AccelerationEngine()
