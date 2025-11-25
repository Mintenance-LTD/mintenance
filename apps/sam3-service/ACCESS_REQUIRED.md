# SAM 3 Model Access Required

## ⚠️ Important: Gated Repository Access

The SAM 3 model repository is **gated** on Hugging Face and requires manual approval.

### Steps to Get Access

1. **Visit the model page:**
   - Go to: https://huggingface.co/facebook/sam3

2. **Request Access:**
   - Click "Request access" or "Request access to model" button
   - You may need to log in with your Hugging Face account
   - The account `MINTENANCE` is already authenticated with token

3. **Wait for Approval:**
   - Meta/Facebook will review your request
   - This usually takes 1-3 business days
   - You'll receive an email when approved

4. **Verify Access:**
   - Once approved, the service will automatically download checkpoints on first run
   - Checkpoint files are ~2-4GB total

### Alternative: Manual Checkpoint Download

If you have access but want to download manually:

```bash
huggingface-cli download facebook/sam3 sam3.pt
huggingface-cli download facebook/sam3 config.json
```

Then set `load_from_HF=False` and provide the checkpoint path:

```python
build_sam3_image_model(
    device="cpu",
    load_from_HF=False,
    checkpoint_path="/path/to/sam3.pt"
)
```

### Current Status

- ✅ Hugging Face authenticated as: **MINTENANCE**
- ✅ Model access: **GRANTED** (Approved on Nov 20, 2025)
- ✅ Ready to download checkpoints on first service run

---

**Next Steps**: The service will automatically download checkpoints (~2-4GB) on first run. No manual action required.

