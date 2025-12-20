"""
Convert PyTorch YOLO model to ONNX format for local inference
"""
import torch
import sys
import os

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

MODEL_PATH = "./best_model_final_v2.pt"
OUTPUT_PATH = "./best_model_final_v2.onnx"

def convert_to_onnx():
    """Convert PyTorch model to ONNX format"""
    print("=== CONVERTING PYTORCH MODEL TO ONNX ===\n")

    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model file not found: {MODEL_PATH}")
        return False

    try:
        # Load the PyTorch model
        print(f"Loading PyTorch model: {MODEL_PATH}")
        model = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)

        if isinstance(model, dict) and 'model' in model:
            yolo_model = model['model']
            print("✅ Extracted YOLO model from checkpoint\n")
        else:
            yolo_model = model
            print("✅ Model loaded\n")

        # Check if model has export method (Ultralytics models do)
        if hasattr(yolo_model, 'export'):
            print("🔄 Exporting using Ultralytics built-in export...")
            # Ultralytics models have a built-in export method
            yolo_model.export(format='onnx', opset=12, simplify=True)
            print(f"✅ Model exported to ONNX format\n")
        else:
            print("⚠️  Model doesn't have built-in export method")
            print("ℹ️  For Ultralytics YOLO models, use:")
            print("     from ultralytics import YOLO")
            print("     model = YOLO('./best_model_final_v2.pt')")
            print("     model.export(format='onnx')\n")
            return False

        # Check if ONNX file was created
        onnx_path = MODEL_PATH.replace('.pt', '.onnx')
        if os.path.exists(onnx_path):
            size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
            print(f"=== CONVERSION SUCCESSFUL ===")
            print(f"✅ ONNX model created: {onnx_path}")
            print(f"✅ File size: {size_mb:.2f} MB")
            print(f"\n=== NEXT STEPS ===")
            print(f"1. Upload to Supabase Storage: yolo-models bucket")
            print(f"2. Update .env.local:")
            print(f"   NEXT_PUBLIC_YOLO_MODEL_URL=https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/public/yolo-models/best_model_final_v2.onnx")
            print(f"3. Restart Next.js dev server")
            return True
        else:
            print(f"❌ ONNX file not found after export")
            return False

    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()

        # Provide alternative method using Ultralytics CLI
        print("\n=== ALTERNATIVE METHOD ===")
        print("Install ultralytics and use CLI:")
        print("  pip install ultralytics")
        print(f"  yolo export model={MODEL_PATH} format=onnx opset=12 simplify=True")
        return False

if __name__ == "__main__":
    # Try using Ultralytics library directly
    try:
        from ultralytics import YOLO
        print("=== USING ULTRALYTICS LIBRARY ===\n")

        print(f"Loading model: {MODEL_PATH}")
        model = YOLO(MODEL_PATH)

        print("🔄 Exporting to ONNX format...")
        model.export(format='onnx', opset=12, simplify=True)

        onnx_path = MODEL_PATH.replace('.pt', '.onnx')
        if os.path.exists(onnx_path):
            size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
            print(f"\n✅ CONVERSION SUCCESSFUL")
            print(f"✅ ONNX model: {onnx_path}")
            print(f"✅ Size: {size_mb:.2f} MB\n")

            print("=== NEXT STEPS ===")
            print("1. Upload to Supabase Storage bucket: yolo-models")
            print("2. Update .env.local with model URL")
            print("3. Restart Next.js dev server")
            sys.exit(0)
        else:
            print("❌ ONNX file not created")
            sys.exit(1)

    except ImportError:
        print("⚠️  Ultralytics library not installed")
        print("\nInstall with:")
        print("  pip install ultralytics")
        print("\nThen run this script again, or use the CLI command:")
        print(f"  yolo export model={MODEL_PATH} format=onnx opset=12 simplify=True")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
