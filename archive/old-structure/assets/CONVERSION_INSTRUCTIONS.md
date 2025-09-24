# 🔄 Asset Conversion Instructions

## Option 1: Online Conversion
1. Go to https://convertio.co/svg-png/ or similar
2. Upload each .svg file from the assets directory
3. Set appropriate dimensions:
   - icon.svg → icon.png (1024x1024)
   - splash.svg → splash.png (1242x2436) 
   - adaptive-icon.svg → adaptive-icon.png (1024x1024)
   - favicon.svg → favicon.png (48x48)
4. Download and replace the .svg files

## Option 2: Using Inkscape (if installed)
```bash
# Install Inkscape: https://inkscape.org/
cd assets
inkscape icon.svg --export-type=png --export-width=1024 --export-height=1024 --export-filename=icon.png
inkscape splash.svg --export-type=png --export-width=1242 --export-height=2436 --export-filename=splash.png
inkscape adaptive-icon.svg --export-type=png --export-width=1024 --export-height=1024 --export-filename=adaptive-icon.png
inkscape favicon.svg --export-type=png --export-width=48 --export-height=48 --export-filename=favicon.png
```

## Option 3: Using ImageMagick (if installed)
```bash
cd assets
magick icon.svg -resize 1024x1024 icon.png
magick splash.svg -resize 1242x2436 splash.png  
magick adaptive-icon.svg -resize 1024x1024 adaptive-icon.png
magick favicon.svg -resize 48x48 favicon.png
```

After conversion, you can delete the .svg files and keep only the .png files.
