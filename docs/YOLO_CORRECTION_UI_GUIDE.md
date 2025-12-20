# YOLO Correction UI Guide

## Overview

The YOLO Correction UI allows users to correct AI detections on building assessment images. These corrections are used to continuously improve the YOLO model through retraining.

## Features

### 1. Interactive Bounding Box Editor

- **View detections**: See all AI-detected bounding boxes on images
- **Add new boxes**: Click and drag on the image to add new detections
- **Select boxes**: Click existing boxes to select them
- **Remove boxes**: Click the X button to remove false positives
- **Change classes**: Click "Change" to modify the class label of a detection

### 2. Multi-Image Support

- Navigate between multiple images in an assessment
- Progress indicator shows which images have been corrected
- Automatic progression to next image after saving

### 3. Correction Tracking

- Tracks what corrections were made:
  - **Added**: New detections created by user
  - **Removed**: False positives removed
  - **Adjusted**: Bounding boxes or classes modified

## Usage

### For Users

1. **Access Correction Page**:
   - Go to `/building-assessments/[id]/correct`
   - Or click "Correct Detections" button in admin view

2. **Correct Detections**:
   - Click and drag on image to add new detection
   - Click existing box to select it
   - Click "Change" to modify class label
   - Click X to remove detection
   - Click "Save Corrections" when done

3. **Navigate Images**:
   - Use "Previous Image" / "Next Image" buttons
   - Or click dots at bottom to jump to specific image

### For Developers

#### Components

- **`YOLOCorrectionEditor`**: Main editor component with canvas
- **`YOLOCorrectionPanel`**: Wrapper that manages state and API calls
- **`/building-assessments/[id]/correct/page`**: Page component

#### API Endpoints

- **POST `/api/building-surveyor/corrections`**: Submit correction
- **GET `/api/building-surveyor/corrections`**: Get corrections/stats
- **POST `/api/building-surveyor/corrections/[id]/approve`**: Approve correction

#### Data Flow

1. User loads correction page
2. Page fetches assessment data (images + detections)
3. User makes corrections in editor
4. Corrections saved via API
5. Corrections stored in `yolo_corrections` table
6. Approved corrections used in retraining

## Technical Details

### Canvas Drawing

- Uses HTML5 Canvas for bounding box rendering
- Scales images to max 800px width for performance
- Real-time preview while drawing new boxes
- Color coding: Blue = selected, Red = unselected, Green = drawing

### Class Names

- Loaded from `data.yaml` file
- Default fallback to 71 predefined classes
- Dropdown selector for changing classes

### Coordinate System

- Bounding boxes stored in pixel coordinates
- Converted to normalized (0-1) for YOLO format
- Canvas scales coordinates for display

## Future Enhancements

- [ ] Drag to resize bounding boxes
- [ ] Keyboard shortcuts (Delete, Arrow keys)
- [ ] Undo/Redo functionality
- [ ] Batch correction mode
- [ ] Expert review workflow
- [ ] Correction quality scoring

