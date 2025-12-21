/**
 * File Upload Security Validator
 * Implements comprehensive file validation including:
 * - Magic number (file signature) validation
 * - File size limits
 * - MIME type verification
 * - Dangerous file extension blocking
 *
 * Part of SECURITY_REMEDIATION_PLAN Action #4
 */

import { logger } from '@mintenance/shared';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 5 * 1024 * 1024, // 5MB
  pdf: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  video: [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo', // AVI
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  ],
  pdf: ['application/pdf'],
} as const;

// File signature (magic numbers) for validation
// First few bytes of valid files to prevent MIME type spoofing
const FILE_SIGNATURES: Record<string, number[][]> = {
  // Images
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (needs WEBP at offset 8)
  'image/heic': [[0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]], // ftyp heic (at offset 4)
  'image/heif': [[0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66]], // ftyp heif (at offset 4)

  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP signature (DOCX is a ZIP file)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP signature (XLSX is a ZIP file)
  ],
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // DOC (OLE2)
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // XLS (OLE2)

  // Videos - More specific signatures
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32], // ftyp mp42
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D], // ftyp isom
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56], // ftyp M4V
  ],
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // ftyp qt
  ],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML
  'video/x-msvideo': [[0x52, 0x49, 0x46, 0x46]], // RIFF (AVI)
};

// Dangerous file extensions that should always be blocked
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
  'msi', 'app', 'deb', 'rpm', 'dmg', 'pkg', 'sh', 'bash', 'ps1',
  'php', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py', 'rb', 'go',
];

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
  };
}

/**
 * Validate file based on magic number (file signature)
 */
function validateMagicNumber(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) {
    // No signature validation for this type
    return true;
  }

  // Check if buffer starts with any of the valid signatures
  return signatures.some(signature =>
    signature.every((byte, index) => buffer[index] === byte)
  );
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file extension is dangerous
 */
function isDangerousExtension(extension: string): boolean {
  return DANGEROUS_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * Validate file size
 */
function validateFileSize(
  size: number,
  category: keyof typeof FILE_SIZE_LIMITS
): { valid: boolean; error?: string } {
  const limit = FILE_SIZE_LIMITS[category];

  if (size > limit) {
    const limitMB = (limit / 1024 / 1024).toFixed(1);
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size (${limitMB}MB) for ${category} files`,
    };
  }

  return { valid: true };
}

/**
 * Validate MIME type
 */
function validateMimeType(
  mimeType: string,
  category: keyof typeof ALLOWED_MIME_TYPES
): { valid: boolean; error?: string } {
  const allowedTypes = ALLOWED_MIME_TYPES[category];

  if (!allowedTypes.includes(mimeType as any)) {
    return {
      valid: false,
      error: `MIME type "${mimeType}" is not allowed for ${category} files. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Main file validation function
 * Validates file against security criteria
 */
export async function validateFile(
  file: File | Buffer,
  options: {
    category: keyof typeof FILE_SIZE_LIMITS;
    originalName: string;
    mimeType: string;
  }
): Promise<FileValidationResult> {
  const { category, originalName, mimeType } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get file extension
  const extension = getFileExtension(originalName);

  // 1. Check dangerous extensions
  if (isDangerousExtension(extension)) {
    errors.push(
      `File extension ".${extension}" is blocked for security reasons`
    );
  }

  // 2. Validate MIME type
  const mimeValidation = validateMimeType(mimeType, category);
  if (!mimeValidation.valid) {
    errors.push(mimeValidation.error!);
  }

  // 3. Validate file size
  const size = file instanceof File ? file.size : file.length;
  const sizeValidation = validateFileSize(size, category);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error!);
  }

  // 4. Validate magic number (file signature)
  try {
    const buffer =
      file instanceof File
        ? Buffer.from(await file.arrayBuffer())
        : file;

    const magicNumberValid = validateMagicNumber(buffer.slice(0, 32), mimeType);
    if (!magicNumberValid) {
      errors.push(
        'File signature does not match declared MIME type. File may be corrupted or malicious.'
      );
    }
  } catch (error) {
    logger.error('Failed to validate magic number', error, {
      service: 'file-validator',
      filename: originalName,
    });
    warnings.push('Could not validate file signature');
  }

  // 5. Check for suspicious patterns
  if (originalName.includes('..')) {
    errors.push('Filename contains path traversal attempt');
  }

  if (originalName.length > 255) {
    errors.push('Filename exceeds maximum length (255 characters)');
  }

  // 6. Warn about potential issues
  if (size === 0) {
    warnings.push('File appears to be empty (0 bytes)');
  }

  if (size < 100) {
    warnings.push('File is unusually small, may be corrupt');
  }

  // Log validation result
  if (errors.length > 0) {
    logger.warn('File validation failed', {
      service: 'file-validator',
      filename: originalName,
      category,
      errors,
      warnings,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      originalName,
      size,
      mimeType,
      extension,
    },
  };
}

/**
 * Sanitize filename
 * Removes dangerous characters and ensures safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split('/').pop()?.split('\\').pop() || 'file';

  // Replace dangerous characters
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 200); // Limit length

  // Ensure filename isn't empty
  return sanitized || `file_${Date.now()}`;
}

/**
 * Generate secure filename
 * Creates unique, secure filename with original extension preserved
 */
export function generateSecureFilename(originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);

  return `${timestamp}_${random}${extension ? `.${extension}` : ''}`;
}

/**
 * Validate multiple files
 */
export async function validateFiles(
  files: Array<{ file: File | Buffer; originalName: string; mimeType: string }>,
  category: keyof typeof FILE_SIZE_LIMITS
): Promise<{
  valid: boolean;
  results: FileValidationResult[];
  totalSize: number;
}> {
  const results = await Promise.all(
    files.map(({ file, originalName, mimeType }) =>
      validateFile(file, { category, originalName, mimeType })
    )
  );

  const totalSize = results.reduce((sum, r) => sum + r.metadata.size, 0);

  return {
    valid: results.every(r => r.valid),
    results,
    totalSize,
  };
}

/**
 * Helper to validate image uploads
 */
export async function validateImageUpload(file: File): Promise<FileValidationResult> {
  return validateFile(file, {
    category: 'image',
    originalName: file.name,
    mimeType: file.type,
  });
}

/**
 * Helper to validate video uploads
 */
export async function validateVideoUpload(file: File): Promise<FileValidationResult> {
  return validateFile(file, {
    category: 'video',
    originalName: file.name,
    mimeType: file.type,
  });
}

/**
 * Helper to validate document uploads
 */
export async function validateDocumentUpload(file: File): Promise<FileValidationResult> {
  return validateFile(file, {
    category: 'document',
    originalName: file.name,
    mimeType: file.type,
  });
}

/**
 * Create standardized error response for validation failures
 */
export function createValidationErrorResponse(
  result: FileValidationResult
): {
  error: string;
  details: string[];
  warnings?: string[];
} {
  return {
    error: 'File validation failed',
    details: result.errors,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
  };
}
