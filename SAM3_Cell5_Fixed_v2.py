"""
SAM 3 Auto-Labeling Function - FULLY CORRECTED VERSION v2
Fixes OpenCV CV_8UC1 error
Copy this entire code and replace Cell 5 in your Colab notebook
"""

import torch

def segment_with_sam3(image_path, text_prompt, confidence_threshold=0.5):
    """
    Use SAM 3 text prompt to segment defects
    Returns list of bounding boxes and masks
    """
    try:
        # Load image
        image = Image.open(image_path).convert('RGB')
        image_np = np.array(image)
        height, width = image_np.shape[:2]

        # Set image in processor
        inference_state = processor.set_image(image_np)

        # Run text-prompted segmentation
        output = processor.set_text_prompt(
            state=inference_state,
            prompt=text_prompt
        )

        # Extract masks and scores
        masks = output.get('masks', [])
        scores = output.get('scores', [])

        # Filter by confidence and convert to bounding boxes
        detections = []
        for mask, score in zip(masks, scores):
            if score < confidence_threshold:
                continue

            # Convert mask to bounding box
            # Convert tensor to numpy if needed
            if isinstance(mask, torch.Tensor):
                mask_binary = (mask > 0.5).cpu().numpy().astype(np.uint8)
            else:
                mask_binary = (mask > 0.5).astype(np.uint8)

            # Ensure single channel (CV_8UC1) for OpenCV findContours
            if len(mask_binary.shape) == 3:
                mask_binary = mask_binary[:, :, 0]  # Take first channel

            # Ensure 2D array
            mask_binary = np.squeeze(mask_binary)

            contours, _ = cv2.findContours(mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                area = w * h / (width * height)

                # Filter by area
                if area < MIN_AREA or area > MAX_AREA:
                    continue

                detections.append({
                    'bbox': [x, y, w, h],
                    'confidence': float(score),
                    'mask': mask_binary
                })

        return detections

    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return []

print("✅ SAM 3 segmentation function ready")
