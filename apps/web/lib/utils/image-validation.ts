/**
 * Image Validation Utility for OpenAI Vision API
 * 
 * Validates images before sending to OpenAI to ensure they meet requirements:
 * - Supported formats: PNG, JPEG, WEBP, GIF
 * - Size limits: Up to 50 MB per request (configurable)
 * - Format validation
 */

export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sizeMB: number;
    format: string;
    mimeType: string;
}

export interface ImageValidationOptions {
    maxSizeMB?: number; // Default: 20 MB (OpenAI allows 50 MB, but we use 20 for safety)
    allowedFormats?: string[]; // Default: PNG, JPEG, WEBP, GIF
    checkWatermarks?: boolean; // Future: Check for watermarks
}

const DEFAULT_OPTIONS: Required<ImageValidationOptions> = {
    maxSizeMB: 20,
    allowedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
    checkWatermarks: false, // Not implemented yet
};

/**
 * Validate a File object for OpenAI Vision API
 */
export function validateImageForOpenAI(
    file: File,
    options: ImageValidationOptions = {}
): ImageValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > opts.maxSizeMB) {
        errors.push(
            `Image too large: ${sizeMB.toFixed(2)}MB (max: ${opts.maxSizeMB}MB). OpenAI allows up to 50MB per request.`
        );
    } else if (sizeMB > 10) {
        warnings.push(
            `Large image: ${sizeMB.toFixed(2)}MB. Consider compressing to reduce token usage and costs.`
        );
    }

    // Check format
    const mimeType = file.type.toLowerCase();
    if (!opts.allowedFormats.includes(mimeType)) {
        errors.push(
            `Unsupported format: ${mimeType}. Supported formats: ${opts.allowedFormats.join(', ')}`
        );
    }

    // Extract format from MIME type
    const format = mimeType.split('/')[1]?.toUpperCase() || 'UNKNOWN';

    // Check if file has a valid extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension && mimeType === 'application/octet-stream') {
        warnings.push('File extension not recognized. Ensure the file is a valid image.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sizeMB,
        format,
        mimeType,
    };
}

/**
 * Validate a base64 data URL for OpenAI Vision API
 */
export function validateBase64ImageForOpenAI(
    dataUrl: string,
    options: ImageValidationOptions = {}
): ImageValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse data URL
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        errors.push('Invalid data URL format. Expected: data:image/type;base64,<data>');
        return {
            isValid: false,
            errors,
            warnings,
            sizeMB: 0,
            format: 'UNKNOWN',
            mimeType: 'unknown',
        };
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    // Check format
    if (!opts.allowedFormats.includes(mimeType)) {
        errors.push(
            `Unsupported format: ${mimeType}. Supported formats: ${opts.allowedFormats.join(', ')}`
        );
    }

    // Calculate size from base64 (base64 is ~33% larger than binary)
    const binarySize = (base64Data.length * 3) / 4;
    const sizeMB = binarySize / (1024 * 1024);

    if (sizeMB > opts.maxSizeMB) {
        errors.push(
            `Image too large: ${sizeMB.toFixed(2)}MB (max: ${opts.maxSizeMB}MB). OpenAI allows up to 50MB per request.`
        );
    } else if (sizeMB > 10) {
        warnings.push(
            `Large image: ${sizeMB.toFixed(2)}MB. Consider compressing to reduce token usage and costs.`
        );
    }

    const format = mimeType.split('/')[1]?.toUpperCase() || 'UNKNOWN';

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sizeMB,
        format,
        mimeType,
    };
}

/**
 * Get recommended detail level based on use case
 */
export type ImageDetailLevel = 'low' | 'high' | 'auto';

export interface DetailLevelRecommendation {
    level: ImageDetailLevel;
    reason: string;
    estimatedTokens: number; // Approximate tokens per image
}

/**
 * Get recommended detail level for different use cases
 */
export function getRecommendedDetailLevel(useCase: string): DetailLevelRecommendation {
    const useCaseLower = useCase.toLowerCase();

    // High detail for critical assessments
    if (
        useCaseLower.includes('damage') ||
        useCaseLower.includes('assessment') ||
        useCaseLower.includes('verification') ||
        useCaseLower.includes('escrow') ||
        useCaseLower.includes('safety')
    ) {
        return {
            level: 'high',
            reason: 'Critical assessment requires high detail for accuracy',
            estimatedTokens: 170, // High detail uses ~170 tokens per image
        };
    }

    // Auto for general analysis (let model decide)
    if (
        useCaseLower.includes('general') ||
        useCaseLower.includes('job') ||
        useCaseLower.includes('photo')
    ) {
        return {
            level: 'auto',
            reason: 'Auto detail balances cost and quality',
            estimatedTokens: 85, // Auto typically uses ~85 tokens per image
        };
    }

    // Low for non-critical use cases
    return {
        level: 'low',
        reason: 'Low detail sufficient for non-critical analysis',
        estimatedTokens: 85, // Low detail uses ~85 tokens per image
    };
}

/**
 * Estimate token cost for images
 */
export function estimateImageTokens(
    imageCount: number,
    detailLevel: ImageDetailLevel = 'auto'
): number {
    const tokensPerImage: Record<ImageDetailLevel, number> = {
        low: 85,
        auto: 85, // Auto typically uses low detail
        high: 170,
    };

    return imageCount * tokensPerImage[detailLevel];
}

