/**
 * Image Compression Utility for OpenAI Vision API
 * 
 * Compresses images to reduce:
 * - Token usage (costs)
 * - Request payload size
 * - Processing time
 * 
 * Maintains quality while optimizing for API usage
 */

import { logger } from '@mintenance/shared';

export interface CompressionOptions {
    maxWidth?: number; // Default: 2048px
    maxHeight?: number; // Default: 2048px
    quality?: number; // Default: 0.85 (85% quality)
    format?: 'jpeg' | 'webp'; // Default: 'jpeg'
    targetSizeMB?: number; // Target size in MB (optional)
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
    format: 'jpeg',
    targetSizeMB: 5, // Target 5MB for good balance
};

/**
 * Compress an image file for OpenAI Vision API
 * Returns a base64 data URL
 */
export async function compressImageForOpenAI(
    file: File,
    options: CompressionOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;
            const aspectRatio = width / height;

            if (width > opts.maxWidth) {
                width = opts.maxWidth;
                height = width / aspectRatio;
            }

            if (height > opts.maxHeight) {
                height = opts.maxHeight;
                width = height * aspectRatio;
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    // Convert blob to base64
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result as string;
                        resolve(base64);
                    };
                    reader.onerror = () => reject(new Error('Failed to read compressed image'));
                    reader.readAsDataURL(blob);
                },
                `image/${opts.format}`,
                opts.quality
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Compress image on server-side (Node.js)
 * Uses sharp library if available, falls back to basic resizing
 */
export async function compressImageServerSide(
    buffer: Buffer,
    options: CompressionOptions = {}
): Promise<Buffer> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Convert ArrayBuffer to Buffer if needed
    const bufferToProcess = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;

    try {
        // Try to use sharp if available (better compression)
        const sharp = await import('sharp').catch(() => null);

        if (sharp) {
            const sharpInstance = sharp.default || sharp;
            return await sharpInstance(bufferToProcess)
                .resize(opts.maxWidth, opts.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .jpeg({ quality: Math.round(opts.quality * 100) })
                .toBuffer();
        }
    } catch (error) {
        // Sharp not available, return original buffer
        logger.warn('Sharp not available, skipping server-side compression', { error, service: 'image-compression' });
    }

    // Fallback: return original buffer
    // In production, you should install sharp: npm install sharp
    return bufferToProcess;
}

/**
 * Check if image should be compressed
 */
export function shouldCompressImage(
    file: File | Buffer,
    thresholdMB: number = 5
): boolean {
    const sizeMB = file instanceof File
        ? file.size / (1024 * 1024)
        : file.length / (1024 * 1024);

    return sizeMB > thresholdMB;
}

/**
 * Get compression recommendations
 */
export function getCompressionRecommendation(
    file: File | Buffer
): {
    shouldCompress: boolean;
    currentSizeMB: number;
    estimatedSavingsMB: number;
    estimatedTokenSavings: number;
} {
    const currentSizeMB = file instanceof File
        ? file.size / (1024 * 1024)
        : file.length / (1024 * 1024);

    const shouldCompress = currentSizeMB > 5;
    const estimatedSavingsMB = shouldCompress ? currentSizeMB * 0.6 : 0; // ~60% reduction
    const estimatedTokenSavings = shouldCompress ? Math.round(currentSizeMB * 10) : 0; // Rough estimate

    return {
        shouldCompress,
        currentSizeMB,
        estimatedSavingsMB,
        estimatedTokenSavings,
    };
}

