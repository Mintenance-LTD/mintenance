#!/usr/bin/env python3

"""
Quick PNG asset creator for Mintenance app
Creates basic PNG files to satisfy build requirements
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    
import os

def create_basic_assets():
    """Create basic PNG assets for building"""
    assets_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    
    if PIL_AVAILABLE:
        print("🎨 Creating PNG assets with PIL...")
        
        # App icon (1024x1024)
        icon = Image.new('RGB', (1024, 1024), '#007AFF')
        draw = ImageDraw.Draw(icon)
        # Draw a simple "M" in the center
        try:
            font = ImageFont.truetype("arial.ttf", 200)
        except:
            font = ImageFont.load_default()
        draw.text((512, 512), "M", fill="white", font=font, anchor="mm")
        icon.save(os.path.join(assets_dir, 'icon.png'))
        print("✅ Created icon.png")
        
        # Splash screen (1242x2436) 
        splash = Image.new('RGB', (1242, 2436), '#ffffff')
        draw = ImageDraw.Draw(splash)
        # Draw app logo in center
        draw.rectangle([521, 1118, 721, 1318], fill='#007AFF')
        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            font = ImageFont.load_default()
        draw.text((621, 1218), "M", fill="white", font=font, anchor="mm")
        draw.text((621, 1400), "Mintenance", fill="#666666", font=font, anchor="mm")
        splash.save(os.path.join(assets_dir, 'splash.png'))
        print("✅ Created splash.png")
        
        # Adaptive icon (1024x1024)
        adaptive = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
        draw = ImageDraw.Draw(adaptive)
        # Draw circular background
        draw.ellipse([172, 172, 852, 852], fill='#007AFF')
        try:
            font = ImageFont.truetype("arial.ttf", 160)
        except:
            font = ImageFont.load_default()
        draw.text((512, 512), "M", fill="white", font=font, anchor="mm")
        adaptive.save(os.path.join(assets_dir, 'adaptive-icon.png'))
        print("✅ Created adaptive-icon.png")
        
        # Favicon (48x48)
        favicon = Image.new('RGB', (48, 48), '#007AFF')
        draw = ImageDraw.Draw(favicon)
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        draw.text((24, 24), "M", fill="white", font=font, anchor="mm")
        favicon.save(os.path.join(assets_dir, 'favicon.png'))
        print("✅ Created favicon.png")
        
    else:
        print("❌ PIL not available. Creating minimal placeholder files...")
        # Create minimal 1x1 pixel files that will satisfy the build
        minimal_assets = [
            ('icon.png', 1024, 1024),
            ('splash.png', 1242, 2436),
            ('adaptive-icon.png', 1024, 1024),
            ('favicon.png', 48, 48)
        ]
        
        # Create very basic images by copying a minimal PNG structure
        minimal_png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDAT\x08\x1dc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        
        for asset_name, width, height in minimal_assets:
            filepath = os.path.join(assets_dir, asset_name)
            with open(filepath, 'wb') as f:
                f.write(minimal_png_data)
            print(f"✅ Created minimal {asset_name}")

if __name__ == "__main__":
    if not os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'assets')):
        os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'assets'))
    
    create_basic_assets()
    print("\n🎉 Basic PNG assets created!")
    print("📝 These are minimal assets to satisfy build requirements.")
    print("🎨 Replace with proper branded assets before store submission.")