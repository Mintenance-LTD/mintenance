import { fileTypeFromBuffer } from 'file-type';
import { logger } from '@mintenance/shared';

/**
 * Magic number signatures for allowed file types
 * These are the actual byte signatures at the start of files
 */
const MAGIC_NUMBERS = {
  // Images
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47],
  GIF: [0x47, 0x49, 0x46, 0x38],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  BMP: [0x42, 0x4D],
  HEIC: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], // ftyp heic

  // Documents
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF

  // Video
  MP4: [0x66, 0x74, 0x79, 0x70], // ftyp
  MOV: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // ftyp qt
  AVI: [0x52, 0x49, 0x46, 0x46], // RIFF

  // Archives
  ZIP: [0x50, 0x4B, 0x03, 0x04],
  RAR: [0x52, 0x61, 0x72, 0x21],
};

/**
 * Allowed MIME types for different upload contexts
 */
export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/heic',
    'image/heif',
  ],
  documents: [
    'application/pdf',
  ],
  videos: [
    'video/mp4',
    'video/quicktime',
    'video/avi',
    'video/x-msvideo',
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
  ],
} as const;

/**
 * Allowed file extensions for different contexts
 */
export const ALLOWED_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'],
  documents: ['pdf'],
  videos: ['mp4', 'mov', 'avi'],
  archives: ['zip', 'rar'],
} as const;

/**
 * Maximum file sizes (in bytes) for different contexts
 */
export const MAX_FILE_SIZES = {
  profileImage: 5 * 1024 * 1024, // 5 MB
  jobPhoto: 10 * 1024 * 1024, // 10 MB
  document: 20 * 1024 * 1024, // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
} as const;

interface FileValidationOptions {
  allowedTypes: Array<keyof typeof ALLOWED_MIME_TYPES>;
  maxSize?: number;
  requireExtensionMatch?: boolean;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  warnings?: string[];
}

/**
 * Validate file using magic number (file signature) verification
 * This is the ONLY secure way to validate file types
 *
 * IMPORTANT: Never trust:
 * - File extensions (can be renamed: malware.exe → malware.jpg)
 * - MIME types from headers (can be forged in HTTP requests)
 * - Client-side validation (can be bypassed)
 *
 * Always verify the actual file content using magic numbers
 */
export async function validateFileUpload(
  file: File | Buffer,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  const warnings: string[] = [];

  try {
    // Convert File to Buffer if needed
    let buffer: Buffer;
    let fileName: string = '';
    let declaredMimeType: string = '';

    if (file instanceof File) {
      fileName = file.name;
      declaredMimeType = file.type;
      buffer = Buffer.from(await file.arrayBuffer());

      // Step 1: Check file size first (before reading entire file)
      if (options.maxSize && file.size > options.maxSize) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${(options.maxSize / 1024 / 1024).toFixed(1)} MB`,
        };
      }
    } else {
      buffer = file;
    }

    // Step 2: Validate file is not empty
    if (buffer.length === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    // Step 3: Read magic numbers from file buffer
    // We need at least 12 bytes to detect most file types
    if (buffer.length < 12) {
      return {
        valid: false,
        error: 'File too small to validate (possible corrupted file)',
      };
    }

    // Step 4: Use file-type library for robust magic number detection
    const detectedFileType = await fileTypeFromBuffer(buffer);

    if (!detectedFileType) {
      // Fallback: Check magic numbers manually for edge cases
      const manualDetection = detectMagicNumbers(buffer);

      if (manualDetection) {
        logger.warn('[FILE VALIDATION] file-type library failed, using manual detection', {
          fileName,
          detectedType: manualDetection,
        });

        return validateDetectedType(
          manualDetection,
          options,
          fileName,
          declaredMimeType,
          warnings
        );
      }

      return {
        valid: false,
        error: 'Could not determine file type - possibly corrupted or unsupported format',
      };
    }

    // Step 5: Check if detected type is in allowed list
    const allowedMimeTypes: string[] = options.allowedTypes.flatMap(
      (type) => [...ALLOWED_MIME_TYPES[type]]
    );

    if (!allowedMimeTypes.includes(detectedFileType.mime)) {
      logger.warn('[SECURITY] File upload blocked - type not allowed', {
        fileName,
        declaredType: declaredMimeType,
        detectedType: detectedFileType.mime,
        detectedExt: detectedFileType.ext,
        severity: 'HIGH',
      });

      return {
        valid: false,
        error: `File type '${detectedFileType.mime}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        detectedType: detectedFileType.mime,
      };
    }

    // Step 6: Check for MIME type mismatch (potential attack)
    if (declaredMimeType && declaredMimeType !== detectedFileType.mime) {
      warnings.push(
        `Declared MIME type (${declaredMimeType}) doesn't match actual file type (${detectedFileType.mime})`
      );

      logger.warn('[SECURITY] MIME type mismatch detected', {
        fileName,
        declaredType: declaredMimeType,
        actualType: detectedFileType.mime,
        severity: 'MEDIUM',
      });
    }

    // Step 7: Check file extension matches detected type (if required)
    if (options.requireExtensionMatch && fileName) {
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      if (fileExtension !== detectedFileType.ext) {
        warnings.push(
          `File extension (.${fileExtension}) doesn't match actual file type (.${detectedFileType.ext})`
        );

        logger.warn('[SECURITY] File extension mismatch', {
          fileName,
          declaredExt: fileExtension,
          actualExt: detectedFileType.ext,
          severity: 'LOW',
        });
      }
    }

    // Step 8: Additional security checks for specific file types
    if (detectedFileType.mime === 'application/pdf') {
      // Check for PDF polyglot attacks
      // PDFs can have %PDF header anywhere in first 1024 bytes
      const pdfHeaderPosition = buffer.indexOf('%PDF');
      if (pdfHeaderPosition > 100) {
        warnings.push('PDF header found at unusual position - possible polyglot attack');

        logger.warn('[SECURITY] Suspicious PDF structure detected', {
          fileName,
          headerPosition: pdfHeaderPosition,
          severity: 'HIGH',
        });
      }
    }

    // File is valid!
    logger.info('[FILE VALIDATION] File validated successfully', {
      fileName,
      detectedType: detectedFileType.mime,
      size: buffer.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    return {
      valid: true,
      detectedType: detectedFileType.mime,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

  } catch (error) {
    logger.error('[FILE VALIDATION] Validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      valid: false,
      error: 'File validation failed - please try again',
    };
  }
}

/**
 * Manual magic number detection for edge cases
 */
function detectMagicNumbers(buffer: Buffer): string | null {
  // Check JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // Check GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }

  // Check PDF
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // Check WebP (RIFF)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Helper to validate detected type
 */
function validateDetectedType(
  detectedType: string,
  options: FileValidationOptions,
  fileName: string,
  declaredMimeType: string,
  warnings: string[]
): FileValidationResult {
  const allowedMimeTypes: string[] = options.allowedTypes.flatMap(
    (type) => [...ALLOWED_MIME_TYPES[type]]
  );

  if (!allowedMimeTypes.includes(detectedType)) {
    return {
      valid: false,
      error: `File type '${detectedType}' is not allowed`,
      detectedType,
    };
  }

  if (declaredMimeType && declaredMimeType !== detectedType) {
    warnings.push(
      `Declared MIME type (${declaredMimeType}) doesn't match actual file type (${detectedType})`
    );
  }

  return {
    valid: true,
    detectedType,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Convenience function for image upload validation
 */
export async function validateImageUpload(
  file: File | Buffer,
  maxSize: number = MAX_FILE_SIZES.jobPhoto
): Promise<FileValidationResult> {
  return validateFileUpload(file, {
    allowedTypes: ['images'],
    maxSize,
    requireExtensionMatch: true,
  });
}

/**
 * Convenience function for document upload validation
 */
export async function validateDocumentUpload(
  file: File | Buffer,
  maxSize: number = MAX_FILE_SIZES.document
): Promise<FileValidationResult> {
  return validateFileUpload(file, {
    allowedTypes: ['documents'],
    maxSize,
    requireExtensionMatch: true,
  });
}

/**
 * Convenience function for video upload validation
 */
export async function validateVideoUpload(
  file: File | Buffer,
  maxSize: number = MAX_FILE_SIZES.video
): Promise<FileValidationResult> {
  return validateFileUpload(file, {
    allowedTypes: ['videos'],
    maxSize,
    requireExtensionMatch: false, // Video extensions can vary
  });
}