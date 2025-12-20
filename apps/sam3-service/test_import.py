try:
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    print("✅ SAM 3 imports SUCCESS")
    print(f"build_sam3_image_model: {build_sam3_image_model}")
    print(f"Sam3Processor: {Sam3Processor}")
except ImportError as e:
    print(f"❌ SAM 3 import FAILED: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")
