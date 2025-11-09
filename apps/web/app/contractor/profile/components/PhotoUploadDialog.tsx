'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge.unified';
import { ProgressBar } from '@/components/ui/ProgressBar';

const StatusChip = Badge;

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { files: File[]; title: string; category: string }) => Promise<void>;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CATEGORIES = [
  'General',
  'Kitchen Remodeling',
  'Bathroom Renovation',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Tiling',
  'Painting',
  'Flooring',
  'Roofing',
  'Landscaping',
  'Before & After',
] as const;

const photoUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  category: z.enum(CATEGORIES),
});

type PhotoUploadFormData = z.infer<typeof photoUploadSchema>;

export function PhotoUploadDialog({ open, onOpenChange, onUpload }: PhotoUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PhotoUploadFormData>({
    resolver: zodResolver(photoUploadSchema),
    defaultValues: {
      title: '',
      category: 'General',
    },
  });

  const category = watch('category');
  const uploadProgress = Math.min(100, Math.round((selectedFiles.length / MAX_FILES) * 100));

  const handleFilesSelected = (files: File[]) => {
    const nextFiles = [...selectedFiles];
    const nextPreviews = [...previews];

    for (const file of files) {
      if (nextFiles.length >= MAX_FILES) {
        setError(`You can upload up to ${MAX_FILES} photos per batch.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Each image must be smaller than 5MB.');
        continue;
      }

      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed.');
        continue;
      }

      nextFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    setSelectedFiles(nextFiles);
    if (!files.length) {
      setPreviews(nextPreviews);
    }
    if (!files.some((file) => file.size > MAX_FILE_SIZE || !file.type.startsWith('image/'))) {
      setError(null);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(Array.from(event.target.files || []));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFilesSelected(Array.from(event.dataTransfer.files || []));
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = async (data: PhotoUploadFormData) => {
    if (!selectedFiles.length) {
      setError('Select at least one photo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpload({
        files: selectedFiles,
        title: data.title.trim(),
        category: data.category,
      });
      // Reset form
      setSelectedFiles([]);
      setPreviews([]);
      reset();
      onOpenChange(false);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload photos</DialogTitle>
          <DialogDescription>
            Showcase before/after work, progress shots, or highlight your craftsmanship.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <StatusChip variant={selectedFiles.length ? 'info' : 'neutral'} withDot size="sm">
              {`${selectedFiles.length}/${MAX_FILES} selected`}
            </StatusChip>
            <span className="text-xs text-text-secondary">
              Max file size {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
            </span>
          </div>

          <ProgressBar
            value={uploadProgress}
            tone={uploadProgress === 100 ? 'success' : 'primary'}
            showValue
          />

          <div>
            <Label htmlFor="photo-upload-input" className="mb-3 block">
              Select photos (max {MAX_FILES}, 5MB each)
            </Label>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('photo-upload-input')?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-background-secondary cursor-pointer transition-colors hover:bg-background-tertiary"
            >
              <div className="flex justify-center mb-3">
                <Upload className="w-10 h-10 text-text-secondary" />
              </div>
              <p className="font-semibold mb-1">Click to upload or drag and drop</p>
              <p className="text-sm text-text-secondary">PNG or JPG, up to 5MB each</p>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {previews.map((preview, index) => (
                <div
                  key={`${preview}-${index}`}
                  className="relative pb-[100%] rounded-xl overflow-hidden bg-background-secondary"
                >
                  <img
                    src={preview}
                    alt={`Upload preview ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-error border-none flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register('title')}
                errorText={errors.title?.message}
                maxLength={100}
                placeholder="e.g. Loft conversion in Camden"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={category} 
                onValueChange={(value: string) => {
                  const validCategory = value as PhotoUploadFormData['category'];
                  setValue('category', validCategory);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload photos'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

