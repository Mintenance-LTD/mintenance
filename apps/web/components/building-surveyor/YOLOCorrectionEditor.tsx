'use client';

/**
 * YOLO Correction Editor Component
 * 
 * Allows users to correct AI detections by:
 * - Viewing bounding boxes on images
 * - Adding new detections
 * - Removing false positives
 * - Adjusting bounding boxes
 * - Changing class labels
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import { loadClassNames } from '@/lib/services/building-surveyor/yolo-class-names';
import type { RoboflowDetection } from '@/lib/services/building-surveyor/types';

export interface CorrectedDetection {
  id: string;
  class: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

interface YOLOCorrectionEditorProps {
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  originalDetections: RoboflowDetection[];
  onSave?: (corrections: CorrectedDetection[]) => Promise<void>;
  onCancel?: () => void;
}

/**
 * YOLO Correction Editor
 */
export function YOLOCorrectionEditor({
  assessmentId,
  imageUrl,
  imageIndex = 0,
  originalDetections,
  onSave,
  onCancel,
}: YOLOCorrectionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [detections, setDetections] = useState<CorrectedDetection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [showClassSelector, setShowClassSelector] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load class names
  useEffect(() => {
    const names = loadClassNames(process.env.NEXT_PUBLIC_YOLO_DATA_YAML_PATH);
    setClassNames(names);
    
    // Initialize with original detections
    const initial: CorrectedDetection[] = originalDetections.map(det => ({
      id: det.id,
      class: det.className,
      bbox: {
        x: det.boundingBox.x,
        y: det.boundingBox.y,
        width: det.boundingBox.width,
        height: det.boundingBox.height,
      },
      confidence: det.confidence / 100,
    }));
    setDetections(initial);
  }, [originalDetections]);

  // Load image and set up canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // Set canvas size
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const maxWidth = 800;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
      }
    };
    
    img.src = imageUrl;
    imageRef.current = img;
  }, [imageUrl]);

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    const scaleX = canvas.width / imageSize.width;
    const scaleY = canvas.height / imageSize.height;

    detections.forEach((det) => {
      const isSelected = selectedDetection === det.id;
      const x = det.bbox.x * scaleX;
      const y = det.bbox.y * scaleY;
      const width = det.bbox.width * scaleX;
      const height = det.bbox.height * scaleY;

      // Box color based on selection
      ctx.strokeStyle = isSelected ? '#3B82F6' : '#EF4444';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);

      // Fill with semi-transparent color
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(x, y, width, height);

      // Label background
      const labelText = `${det.class}${det.confidence ? ` (${Math.round(det.confidence * 100)}%)` : ''}`;
      ctx.font = '12px Inter, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const labelWidth = textMetrics.width + 8;
      const labelHeight = 20;

      ctx.fillStyle = isSelected ? '#3B82F6' : '#EF4444';
      ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

      // Label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, x + 4, y - 6);
    });

    // Draw temporary box while drawing
    if (isDrawing && drawStart && drawCurrent) {
      const scaleX = canvas.width / imageSize.width;
      const scaleY = canvas.height / imageSize.height;
      
      const startX = drawStart.x * scaleX;
      const startY = drawStart.y * scaleY;
      const currentX = drawCurrent.x * scaleX;
      const currentY = drawCurrent.y * scaleY;
      
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
    }
  }, [detections, selectedDetection, imageLoaded, imageSize, isDrawing, drawStart, drawCurrent]);

  // Redraw when state changes
  useEffect(() => {
    drawBoundingBoxes();
  }, [drawBoundingBoxes]);

  // Handle mouse events for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imageSize.width / canvas.width);
    const y = (e.clientY - rect.top) * (imageSize.height / canvas.height);

    // Check if clicking on existing box
    const clickedDetection = detections.find(det => {
      const scaleX = canvas.width / imageSize.width;
      const scaleY = canvas.height / imageSize.height;
      const boxX = det.bbox.x * scaleX;
      const boxY = det.bbox.y * scaleY;
      const boxWidth = det.bbox.width * scaleX;
      const boxHeight = det.bbox.height * scaleY;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      return (
        clickX >= boxX &&
        clickX <= boxX + boxWidth &&
        clickY >= boxY &&
        clickY <= boxY + boxHeight
      );
    });

    if (clickedDetection) {
      setSelectedDetection(clickedDetection.id);
      return;
    }

    // Start drawing new box
    setIsDrawing(true);
    setDrawStart({ x, y });
    setSelectedDetection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imageSize.width / canvas.width);
    const y = (e.clientY - rect.top) * (imageSize.height / canvas.height);
    
    setDrawCurrent({ x, y });
    drawBoundingBoxes();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (imageSize.width / canvas.width);
    const endY = (e.clientY - rect.top) * (imageSize.height / canvas.height);

    const x = Math.min(drawStart.x, endX);
    const y = Math.min(drawStart.y, endY);
    const width = Math.abs(endX - drawStart.x);
    const height = Math.abs(endY - drawStart.y);

    // Only add if box is large enough
    if (width > 10 && height > 10) {
      const newDetection: CorrectedDetection = {
        id: `new-${Date.now()}`,
        class: 'crack', // Default class
        bbox: { x, y, width, height },
        confidence: 0.5,
      };
      setDetections([...detections, newDetection]);
      setSelectedDetection(newDetection.id);
      setShowClassSelector(newDetection.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  // Remove detection
  const handleRemove = (id: string) => {
    setDetections(detections.filter(d => d.id !== id));
    if (selectedDetection === id) {
      setSelectedDetection(null);
    }
  };

  // Change class
  const handleClassChange = (id: string, newClass: string) => {
    setDetections(
      detections.map(det =>
        det.id === id ? { ...det, class: newClass } : det
      )
    );
    setShowClassSelector(null);
  };

  // Calculate corrections made
  const calculateCorrectionsMade = () => {
    const added = detections.filter(d => d.id.startsWith('new-'));
    const removed = originalDetections.filter(
      orig => !detections.find(d => d.id === orig.id)
    );
    const adjusted = detections
      .filter(d => !d.id.startsWith('new-'))
      .filter(d => {
        const orig = originalDetections.find(o => o.id === d.id);
        if (!orig) return false;
        return (
          orig.className !== d.class ||
          orig.boundingBox.x !== d.bbox.x ||
          orig.boundingBox.y !== d.bbox.y ||
          orig.boundingBox.width !== d.bbox.width ||
          orig.boundingBox.height !== d.bbox.height
        );
      });

    return { added, removed, adjusted };
  };

  // Submit correction
  const handleSubmit = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(detections);
    } catch (error) {
      console.error('Failed to save correction:', error);
      alert('Failed to save correction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card variant="default" padding="lg" className="w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Correct Detections</h3>
            <p className="text-sm text-gray-600">
              Click and drag to add boxes, click existing boxes to select, delete to remove
            </p>
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Corrections'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="cursor-crosshair max-w-full h-auto"
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          {!imageLoaded && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Icon name="image" size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Loading image...</p>
              </div>
            </div>
          )}
        </div>

        {/* Detection List */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Detections ({detections.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {detections.map((det) => (
              <div
                key={det.id}
                className={`flex items-center justify-between p-2 rounded border ${
                  selectedDetection === det.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => setSelectedDetection(det.id)}
                    className="text-left flex-1"
                  >
                    <div className="text-sm font-medium text-gray-900">{det.class}</div>
                    <div className="text-xs text-gray-500">
                      {Math.round(det.bbox.x)}, {Math.round(det.bbox.y)} -{' '}
                      {Math.round(det.bbox.width)}×{Math.round(det.bbox.height)}
                    </div>
                  </button>
                  {showClassSelector === det.id ? (
                    <select
                      value={det.class}
                      onChange={(e) => handleClassChange(det.id, e.target.value)}
                      onBlur={() => setShowClassSelector(null)}
                      autoFocus
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {classNames.map((name) => (
                        <option key={name} value={name}>
                          {name.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setShowClassSelector(det.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Change
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(det.id)}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Remove detection"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            {detections.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No detections. Click and drag on the image to add one.
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Click and drag on image to add new detection</p>
          <p>• Click existing box to select it</p>
          <p>• Click "Change" to modify class label</p>
          <p>• Click X to remove detection</p>
        </div>
      </div>
    </Card>
  );
}

