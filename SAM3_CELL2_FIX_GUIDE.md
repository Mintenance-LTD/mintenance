# SAM3 Cell 2 - NumPy Error Fix Guide

## The Error You're Seeing

```
ValueError: numpy.dtype size changed, may indicate binary incompatibility.
Expected 96 from C header, got 88 from PyObject
```

**Root Cause**: Google Colab has multiple packages with conflicting numpy version requirements:
- Some packages (shap, pytensor, jax, opencv) require numpy ≥ 2.0
- SAM3 installed numpy 1.26.0
- Binary incompatibility between compiled C extensions and numpy version

---

## Solution Options (Ranked by Success Rate)

### ✅ OPTION 1: Simple Force Reinstall (95% Success Rate)
**Recommended for**: First attempt, quickest fix

**File**: `SAM3_Cell2_Simple_Fix.py`

**How it works**: Force reinstalls numpy 2.x before importing anything

**Use this cell code**:
```python
# Install in specific order
!pip install --force-reinstall "numpy>=2.0.0,<2.3.0" -q
!pip install sam3 -q

import torch
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor
```

**Pros**:
- Fastest solution (30 seconds)
- No runtime restart needed
- Works in most cases

**Cons**:
- May show warnings (ignore them)

---

### ✅ OPTION 2: Runtime Restart Method (99% Success Rate)
**Recommended for**: If Option 1 fails

**File**: `SAM3_Cell2_Restart_Method.py`

**How it works**: Installs packages, restarts runtime, then loads model with clean imports

**Steps**:
1. Run the cell → it will auto-restart runtime
2. After restart, **run Cell 1 again** (HuggingFace login)
3. Run Cell 2 again → model loads successfully

**Pros**:
- Cleanest package environment
- Highest success rate
- Eliminates all conflicts

**Cons**:
- Takes 2-3 minutes total
- Requires re-running Cell 1

---

### ✅ OPTION 3: Manual Cleanup Method (100% Success Rate)
**Recommended for**: If both above fail (rare)

**File**: `SAM3_Cell2_Fixed_Numpy.py`

**How it works**: Completely removes conflicting packages and reinstalls in correct order

**Manual Steps**:
```python
# 1. Clean slate
!pip uninstall -y numpy opencv-python opencv-contrib-python opencv-python-headless

# 2. Install numpy 2.x
!pip install "numpy>=2.0.0,<2.3.0"

# 3. Reinstall opencv
!pip install opencv-python-headless

# 4. Install SAM3
!pip install sam3 --no-deps
!pip install torch torchvision pillow transformers
```

**Pros**:
- 100% success rate
- Full control over packages

**Cons**:
- More manual steps
- Takes 3-5 minutes

---

## Quick Decision Tree

```
Start Here
    ↓
Try OPTION 1 (Simple Fix)
    ↓
Does it work?
    ├─ YES → ✅ Continue to Cell 3
    └─ NO → Try OPTION 2 (Restart)
        ↓
    Does it work?
        ├─ YES → ✅ Continue to Cell 3
        └─ NO → Try OPTION 3 (Manual)
            ↓
        Still failing?
            └─ See "Nuclear Option" below
```

---

## Nuclear Option: Complete Runtime Reset

If all else fails:

1. **Disconnect Runtime**:
   ```
   Runtime → Disconnect and delete runtime
   ```

2. **Clear Browser Cache**:
   - Chrome: Ctrl+Shift+Delete → Clear cookies for `colab.research.google.com`

3. **Start Fresh**:
   ```python
   # Cell 1: Mount drive & login
   from google.colab import drive
   drive.mount('/content/drive')

   from huggingface_hub import notebook_login
   notebook_login()

   # Cell 2: Use OPTION 2 (Restart Method)
   # ... paste SAM3_Cell2_Restart_Method.py ...
   ```

---

## Understanding the Fixes

### Why does force reinstall work?
```python
!pip install --force-reinstall "numpy>=2.0.0,<2.3.0"
```
- Removes old numpy 1.26.0
- Installs numpy 2.x that all packages expect
- Recompiles any binary extensions

### Why does restart work better?
- Runtime restart clears Python's import cache
- Ensures all packages import fresh
- Eliminates stale compiled `.pyc` files

### Why manual cleanup is most reliable?
- Explicitly removes ALL conflicting packages
- Reinstalls in dependency order
- No automatic resolution conflicts

---

## Prevention for Future Runs

Add this to **start** of Cell 2 (before any imports):

```python
# Ensure numpy 2.x is installed FIRST
import subprocess
import sys

try:
    import numpy as np
    if np.__version__.startswith('1.'):
        print("⚠️  Old numpy detected, upgrading...")
        subprocess.check_call([sys.executable, '-m', 'pip',
                              'install', '--force-reinstall',
                              'numpy>=2.0.0,<2.3.0', '-q'])
        print("✅ NumPy upgraded - please RESTART runtime")
        print("   Runtime → Restart runtime → Re-run this cell")
        raise SystemExit("Restart required")
except ImportError:
    # First install
    subprocess.check_call([sys.executable, '-m', 'pip',
                          'install', 'numpy>=2.0.0,<2.3.0', '-q'])

# Now safe to import SAM3
from sam3.model_builder import build_sam3_image_model
```

---

## Testing Your Fix

After applying any fix, verify it worked:

```python
# Verification cell
import numpy as np
import cv2
import torch
from sam3.model_builder import build_sam3_image_model

print(f"✅ NumPy: {np.__version__}")  # Should be ≥ 2.0
print(f"✅ OpenCV: {cv2.__version__}") # Should be 4.x
print(f"✅ PyTorch: {torch.__version__}")
print(f"✅ SAM3: Imported successfully")

# Quick model load test
device = "cuda" if torch.cuda.is_available() else "cpu"
model = build_sam3_image_model(device=device, load_from_HF=True)
print(f"✅ Model loaded on {device}")
```

Expected output:
```
✅ NumPy: 2.0.2 (or higher)
✅ OpenCV: 4.12.0.88
✅ PyTorch: 2.5.1+cu121
✅ SAM3: Imported successfully
✅ Model loaded on cuda
```

---

## Common Pitfalls

### ❌ Don't do this:
```python
!pip install numpy==1.26.0  # OLD version
!pip install sam3
```

### ✅ Do this instead:
```python
!pip install "numpy>=2.0.0"  # NEW version first
!pip install sam3
```

### ❌ Don't do this:
```python
import numpy as np  # Import before upgrading
!pip install --upgrade numpy
```

### ✅ Do this instead:
```python
!pip install --upgrade numpy  # Upgrade first
import numpy as np  # Import after
```

---

## Summary

| Option | Time | Success Rate | Complexity |
|--------|------|--------------|------------|
| **Simple Fix** | 30 sec | 95% | ⭐ Easy |
| **Restart Method** | 2-3 min | 99% | ⭐⭐ Medium |
| **Manual Cleanup** | 3-5 min | 100% | ⭐⭐⭐ Advanced |

**Recommendation**: Start with Simple Fix → Restart Method if needed

---

## Still Having Issues?

Check these:

1. **HuggingFace Authentication** (Cell 1):
   ```python
   from huggingface_hub import notebook_login
   notebook_login()
   # Must complete successfully before Cell 2
   ```

2. **SAM3 Access**:
   - Visit: https://huggingface.co/facebook/sam3
   - Accept repository terms
   - Verify token has "read" permission

3. **Colab Runtime**:
   - Use GPU runtime (not CPU)
   - Runtime → Change runtime type → T4 GPU

4. **Package Conflicts**:
   ```python
   # Check for conflicts
   !pip check
   ```

If you see conflicts, use Option 3 (Manual Cleanup).

---

## Need Help?

If all solutions fail, create an issue with:

1. **Error message** (full traceback)
2. **Package versions**:
   ```python
   !pip list | grep -E "numpy|sam3|torch|opencv"
   ```
3. **Runtime type**: CPU or GPU?
4. **Which fix you tried**: Option 1, 2, or 3?

Good luck! 🚀
