# SAM 3 Setup - Known Issues

## NumPy Version Conflict

**Issue:** SAM 3 requires `numpy==1.26`, but Python 3.13 installs `numpy>=2.0` by default.

**Error:**
```
ERROR: Could not find a version that satisfies the requirement numpy==1.26
```

**Status:** ⚠️ **Known compatibility issue with Python 3.13**

**Workarounds:**

1. **Use Python 3.12** (recommended):
   ```bash
   # Create new venv with Python 3.12
   python3.12 -m venv venv
   ```

2. **Or wait for SAM 3 compatibility update** - SAM 3 may update to support numpy 2.x

3. **Or use Docker** with Python 3.12 image:
   ```dockerfile
   FROM python:3.12-slim
   # ... rest of Dockerfile
   ```

## Windows Long Path Support

**Issue:** Installing numpy 1.26 from source can fail due to Windows path length limits.

**Error:**
```
ERROR: Could not install packages due to an OSError: [Errno 2] No such file or directory
```

**Solution:** Enable Windows Long Path Support:
- Run PowerShell as Administrator
- Run: `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
- Restart computer

## Missing SAM 3 Module

**Issue:** `ModuleNotFoundError: No module named 'sam3.sam'`

**Status:** SAM 3 package structure issue - needs to be installed from source properly.

**Solution:** Install SAM 3 from source with editable mode:
```bash
pip install -e git+https://github.com/facebookresearch/sam3.git#egg=sam3
```

---

## Current Status

✅ **Completed:**
- Virtual environment created
- Hugging Face authenticated
- PyTorch installed (with CUDA support)
- FastAPI and dependencies installed
- SAM 3 package installed

⚠️ **Issues:**
- NumPy version conflict (Python 3.13 compatibility)
- SAM 3 module import error

🔧 **Recommended Next Steps:**
1. Use Python 3.12 for SAM 3 compatibility
2. Or test if SAM 3 works with numpy 2.x (may work despite requirement)
3. Or wait for SAM 3 numpy 2.x compatibility update

