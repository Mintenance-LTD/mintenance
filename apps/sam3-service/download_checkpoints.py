"""
Download SAM 3 model checkpoints from Hugging Face
Run this script to pre-download checkpoints before starting the service
"""

import os
import sys
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download
from huggingface_hub.utils import HfHubHTTPError

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def download_sam3_checkpoints():
    """Download SAM 3 model checkpoints from Hugging Face"""
    
    repo_id = "facebook/sam3"
    
    print("🚀 Starting SAM 3 checkpoint download...")
    print(f"📦 Repository: {repo_id}")
    print("⚠️  This may take several minutes (~2-4GB download)...\n")
    
    try:
        # Check if already authenticated
        from huggingface_hub import whoami
        try:
            user_info = whoami()
            print(f"✅ Authenticated as: {user_info.get('name', 'Unknown')}")
        except Exception as e:
            print(f"⚠️  Authentication check failed: {e}")
            print("💡 Make sure you've run: hf auth login")
        
        # Download the entire repository (includes checkpoints and config)
        print("\n📥 Downloading model files...")
        cache_dir = snapshot_download(
            repo_id=repo_id,
            repo_type="model",
            local_dir=None,  # Use default cache location
            local_dir_use_symlinks=False,
            resume_download=True
        )
        
        print(f"\n✅ Download complete!")
        print(f"📁 Checkpoints cached at: {cache_dir}")
        print("\n🎉 SAM 3 checkpoints are ready. You can now start the service.")
        
    except HfHubHTTPError as e:
        if e.response.status_code == 403:
            print("\n❌ Access denied!")
            print("💡 Make sure you have:")
            print("   1. Requested access at: https://huggingface.co/facebook/sam3")
            print("   2. Received approval email")
            print("   3. Authenticated with: hf auth login")
        else:
            print(f"\n❌ Download failed: {e}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Verify access: https://huggingface.co/facebook/sam3")
        print("   2. Check authentication: hf auth login")
        print("   3. Check internet connection")


if __name__ == "__main__":
    download_sam3_checkpoints()

