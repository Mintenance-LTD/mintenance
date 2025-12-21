# Free Building Damage Dataset Sources

## Dataset Sources to Fill Gaps in Your Training Data

### 🏠 Roofing Damage Datasets

#### Roboflow Universe (Free with account)
1. **Roof Damage Detection** by Keyan
   - URL: https://universe.roboflow.com/keyan/roof-damage-detection
   - 127 images with annotations
   - Format: YOLO, COCO, Pascal VOC

2. **Roof Damage** by SmartRoof
   - URL: https://universe.roboflow.com/smartroof/roof-damage-ukqfw/dataset/1
   - 47 annotated images
   - Multiple formats available

3. **Hail Damage Batches** by Remote Roofing
   - URL: https://universe.roboflow.com/remote-roofing/hail-damage-batches
   - 99 images of hail damage on roofs
   - Good for storm damage

4. **Damaged Roof and Tower** by SAYANTAN DAM
   - URL: https://universe.roboflow.com/sayantan-dam-v7szk/damaged-roof-and-tower
   - 41 images
   - Published 2023

5. **Roof Detection Dataset**
   - URL: https://universe.roboflow.com/roof-fndgy/roof-detection-gdfvo
   - 280 rooftop images
   - Includes pre-trained model

### 🚪 Door/Window Damage Datasets

1. **Door and Window Detection** by Construction Plan
   - URL: https://universe.roboflow.com/construction-plan/door-and-window-detection-fmw85
   - 5,382 images (largest dataset!)
   - Can be filtered for damaged doors

2. **Building Damage Detection**
   - URL: https://universe.roboflow.com/al-mdb78/building-damage-detection-ahwco
   - 596 building images
   - July 2024 release
   - Includes API and pre-trained model

### 🔥 Insulation/Thermal Datasets

1. **GitHub Thermal Datasets**
   - URL: https://github.com/rafariva/ThermalDatasets
   - 1,000 pairs of visible and thermal images
   - 640x480 thermal resolution
   - Good for insulation issues

2. **FLIR Thermal Images Dataset** (Kaggle)
   - URL: https://www.kaggle.com/datasets/deepnewbie/flir-thermal-images-dataset
   - Thermal imaging data
   - Can identify insulation problems

3. **HIT-UAV Infrared Dataset**
   - URL: https://github.com/suojiashun/HIT-UAV-Infrared-Thermal-Dataset
   - 2,898 infrared thermal images
   - Includes buildings from 60-130m altitude

4. **Roboflow Infrared Datasets**
   - URL: https://universe.roboflow.com/browse/infrared
   - Multiple infrared datasets
   - Good for heat loss detection

### ⚡ Electrical/HVAC (Limited availability)

**Note**: These are harder to find. Consider:

1. **Construction Site Safety Dataset** (Kaggle)
   - URL: https://www.kaggle.com/datasets/snehilsanyal/construction-site-safety-image-dataset-roboflow
   - May contain electrical hazards
   - YOLOv8 format

2. **Search Roboflow Universe**
   - URL: https://universe.roboflow.com/search
   - Search terms: "electrical", "wiring", "HVAC", "air conditioner"
   - New datasets added regularly

## How to Download from Roboflow

```python
# Install Roboflow
pip install roboflow

# Download dataset
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("workspace-name").project("project-name")
dataset = project.version(1).download("yolov8")
```

## Data Augmentation Strategy

Since you're missing specific classes, consider:

1. **Download relevant datasets** from above
2. **Filter for specific damage types** you need
3. **Re-label if necessary** to match your 15 classes
4. **Use SAM2 for additional annotation** on new images

## Recommended Priority Downloads

Based on your gaps:
1. **Roofing**: Download datasets 1, 2, 3 from Roboflow (173+ images)
2. **Doors**: Filter dataset 1 for damaged doors (5,382 images to work with)
3. **Insulation**: Use thermal datasets 1 & 2 (1,000+ thermal images)
4. **Electrical/HVAC**: Search Roboflow Universe weekly for new uploads

## Alternative Sources to Check

- **Papers with Code**: paperswithcode.com/datasets
- **Google Dataset Search**: datasetsearch.research.google.com
- **GitHub**: Search "building damage detection dataset"
- **Zenodo**: zenodo.org (academic datasets)
- **IEEE DataPort**: ieee-dataport.org

## Tips for Integration

1. **Convert formats**: Most are in YOLO format already
2. **Verify class mapping**: Ensure labels match your 15 classes
3. **Quality check**: Remove low-quality or irrelevant images
4. **Balance dataset**: Aim for at least 100-200 images per class
5. **Use SAM2**: For quick annotation of unlabeled images

## Your Current Gaps to Fill

- **roofing_damage** (0) → Need 200+ images
- **door_damage** (0) → Need 200+ images
- **insulation_issues** (0) → Need 200+ images
- **electrical_issues** (2) → Need 198+ images
- **hvac_issues** (2) → Need 198+ images
- **window_damage** (15) → Need 185+ images

Total needed: ~1,200 additional images across 6 classes