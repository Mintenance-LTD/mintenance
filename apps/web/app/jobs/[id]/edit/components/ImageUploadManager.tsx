'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
interface ImageUploadManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};
export function ImageUploadManager({
  images,
  onImagesChange,
  maxImages = 10
}: ImageUploadManagerProps) {
  const [uploadingImages, setUploadingImages] = useState(false);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    setUploadingImages(true);
    const newImages: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }
        // Convert to base64 for preview
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(base64);
      }
      onImagesChange([...images, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    toast.success('Image removed');
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <ImageIcon className="inline-block h-4 w-4 mr-2" />
          Images
        </label>
        <span className="text-sm text-gray-500">
          {images.length}/{maxImages} images
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, index) => (
          <MotionDiv
            key={index}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="relative aspect-square rounded-lg overflow-hidden group"
          >
            <Image
              src={img}
              alt={`Job image ${index + 1}`}
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label={`Remove image ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </MotionDiv>
        ))}
        {images.length < maxImages && (
          <label className="relative aspect-square rounded-lg border-2 border-dashed
                         border-gray-300 hover:border-indigo-400 transition-colors
                         cursor-pointer flex items-center justify-center
                         hover:bg-gray-50">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImages}
              className="sr-only"
            />
            <div className="text-center">
              {uploadingImages ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2
                                border-indigo-600 mx-auto" />
                  <p className="mt-2 text-xs text-gray-500">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="mt-2 text-xs text-gray-500">
                    Click to upload
                  </p>
                  <p className="text-xs text-gray-400">
                    Max 5MB per image
                  </p>
                </>
              )}
            </div>
          </label>
        )}
      </div>
      {images.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No images uploaded. Add images to help contractors better understand the job.
        </p>
      )}
    </div>
  );
}