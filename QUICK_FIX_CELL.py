# ========================================
# QUICK FIX FOR PYTORCH 2.6 UNPICKLING ERROR
# Copy and paste this into your Colab Cell 6
# ========================================

from ultralytics import YOLO
import torch
import shutil

# Checkpoint path
checkpoint_path = '/content/drive/MyDrive/yolo-training/last.pt'
print(f"📥 Loading checkpoint: {checkpoint_path}")

# ========================================
# FIX 1: Add safe globals (PyTorch 2.6)
# ========================================
print("🔧 Fixing PyTorch 2.6 compatibility...")
torch.serialization.add_safe_globals([
    'ultralytics.nn.tasks.DetectionModel',
    'ultralytics.nn.modules',
    'collections.OrderedDict'
])
print("   ✓ Added safe globals for Ultralytics")

# ========================================
# FIX 2: Load with weights_only=False
# ========================================
checkpoint = torch.load(
    checkpoint_path,
    map_location='cuda:0',
    weights_only=False  # Safe: it's your own checkpoint
)
print("   ✓ Checkpoint loaded")

# ========================================
# FIX 3: Remove GradScaler (CPU→GPU issue)
# ========================================
if 'scaler' in checkpoint:
    del checkpoint['scaler']
    print("   ✓ Removed GradScaler state")

# ========================================
# FIX 4: Disable AMP (compatibility)
# ========================================
if 'args' in checkpoint and isinstance(checkpoint['args'], dict):
    checkpoint['args']['amp'] = False
    print("   ✓ Disabled AMP in checkpoint")

# ========================================
# Save cleaned checkpoint
# ========================================
cleaned_checkpoint_path = '/content/last_cleaned.pt'
torch.save(checkpoint, cleaned_checkpoint_path)
print(f"✅ Cleaned checkpoint saved: {cleaned_checkpoint_path}")

# ========================================
# Load model from cleaned checkpoint
# ========================================
model = YOLO(cleaned_checkpoint_path)

print("\n" + "="*60)
print("✅ SUCCESS! Checkpoint loaded without errors")
print("🚀 Ready to resume training from epoch 57")
print("="*60 + "\n")

# ========================================
# Now run training (Cell 7)
# ========================================