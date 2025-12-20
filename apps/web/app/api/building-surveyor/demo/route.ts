import { NextRequest, NextResponse } from 'next/server';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';
import type { Phase1BuildingAssessment, SafetyHazard } from '@/lib/services/building-surveyor/types';
import { validateImageForOpenAI } from '@/lib/utils/image-validation';
import { shouldCompressImage, compressImageServerSide } from '@/lib/utils/image-compression';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUBLIC API endpoint for Building Surveyor damage assessment demo
 * This is a simplified version for the landing page showcase
 * Does NOT require authentication (for demo purposes only)
 */
export async function POST(request: NextRequest) {
    logger.info('[API] Building Surveyor Demo: Request received');

    try {
        // Check for API key availability
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
        logger.debug('[API] Environment check', { hasOpenAIKey });

        // Parse form data
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;

        if (!imageFile) {
            logger.warn('[API] Error: No image provided');
            return NextResponse.json(
                { error: 'No image provided' },
                { status: 400 }
            );
        }

        logger.info('[API] Image received', {
            type: imageFile.type,
            size: imageFile.size
        });

        // Validate image using OpenAI requirements
        const validation = validateImageForOpenAI(imageFile, {
            maxSizeMB: 20, // OpenAI allows 50MB, but we use 20MB for safety
        });

        if (!validation.isValid) {
            return NextResponse.json(
                {
                    error: 'Image validation failed',
                    details: validation.errors.join('; '),
                    warnings: validation.warnings,
                },
                { status: 400 }
            );
        }

        // Log warnings if any
        if (validation.warnings.length > 0) {
            logger.warn('[API] Image validation warnings', { warnings: validation.warnings });
        }

        logger.info('[API] Image validated', {
            sizeMB: validation.sizeMB.toFixed(2),
            format: validation.format,
            mimeType: validation.mimeType,
        });

        // Convert File to Buffer
        const bytes = await imageFile.arrayBuffer();
        let buffer: Buffer = Buffer.from(bytes);

        // Compress if image is large (reduces token usage and costs)
        if (shouldCompressImage(imageFile, 5)) {
            logger.info('[API] Compressing large image...');
            try {
                const compressed = await compressImageServerSide(buffer, {
                    maxWidth: 2048,
                    maxHeight: 2048,
                    quality: 0.85,
                });
                buffer = compressed;
                logger.info('[API] Image compressed successfully');
            } catch (compressionError) {
                logger.warn('[API] Compression failed, using original image', compressionError);
                // Continue with original image if compression fails
            }
        }

        // Convert to base64 for the Building Surveyor service
        const base64Image = buffer.toString('base64');
        const imageUrl = `data:${imageFile.type};base64,${base64Image}`;

        logger.info('[API] Calling BuildingSurveyorService.assessDamage...');

        // Perform assessment using the static method
        const assessment: Phase1BuildingAssessment = await BuildingSurveyorService.assessDamage(
            [imageUrl],
            {
                propertyType: 'residential', // Default for demo
            }
        );

        logger.info('[API] Assessment completed successfully');

        // Transform assessment to frontend format
        const response = {
            damageType: assessment.damageAssessment?.damageType || 'Unknown',
            severity: assessment.damageAssessment?.severity || 'Unknown',
            confidence: assessment.damageAssessment?.confidence || 0,
            estimatedCost: formatCostRange(assessment.contractorAdvice?.estimatedCost),
            urgency: formatUrgency(assessment.urgency?.urgency || 'moderate'),
            recommendation: assessment.homeownerExplanation?.whatToDo || 'Contact a specialist for detailed assessment',
            safetyHazards: assessment.safetyHazards?.hazards?.map((h: SafetyHazard) => h.description) || [],
            detectionDetails: {
                detectedObjects: assessment.evidence?.roboflowDetections?.length || 0,
                analysisMethod: 'GPT-4 Vision',
            },
        };

        return NextResponse.json(response);

    } catch (error) {
        // Enhanced error logging with full error details
        const errorInfo = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : typeof error,
            hasApiKey: !!process.env.OPENAI_API_KEY,
            apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
        };

        logger.error('[API] Building Surveyor demo assessment error', errorInfo);
        logger.error('[API] Full error object', error);

        // Provide more helpful error messages for common issues
        let errorMessage = 'Assessment failed. Please try again.';
        let errorDetails = error instanceof Error ? error.message : 'Unknown error';

        // Check for common error scenarios
        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();

            // Check for OpenAI API key errors - look for invalid_api_key code in the error message
            if (errorMsg.includes('invalid_api_key') ||
                (errorMsg.includes('openai api error') && (errorMsg.includes('401') || errorMsg.includes('invalid')))) {
                errorMessage = 'OpenAI API key is invalid or expired. Please check your API key configuration.';
                errorDetails = 'The API key is present but OpenAI rejected it. Please verify the key is correct, has not expired, and has the necessary permissions.';
            } else if (errorMsg.includes('ai assessment service is not configured') ||
                errorMsg.includes('openai_api_key') ||
                errorMsg.includes('not configured')) {
                errorMessage = 'AI service is not configured. Please contact support.';
                errorDetails = `OpenAI API key is missing or invalid. Key present: ${!!process.env.OPENAI_API_KEY}`;
            } else if (errorMsg.includes('timeout')) {
                errorMessage = 'Assessment timed out. Please try again with a smaller image.';
                errorDetails = error.message;
            } else if (errorMsg.includes('invalid image')) {
                errorMessage = 'Invalid image format. Please upload a valid image file.';
                errorDetails = error.message;
            } else if (errorMsg.includes('openai api error')) {
                // Generic OpenAI API error - extract details from error message
                errorMessage = 'OpenAI API request failed. Please try again.';
                // Try to extract error code from the message if present
                const codeMatch = error.message.match(/code:\s*(\w+)/i);
                if (codeMatch) {
                    errorDetails = `OpenAI error: ${codeMatch[1]}. ${error.message}`;
                } else {
                    errorDetails = error.message;
                }
            } else {
                // For other errors, include the actual error message
                errorDetails = error.message;
            }
        }

        // Ensure we always return a valid JSON response with error details
        const errorResponse = {
            error: errorMessage,
            details: errorDetails,
            // Include debug info in development
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    hasApiKey: !!process.env.OPENAI_API_KEY,
                    errorType: error instanceof Error ? error.name : typeof error,
                    originalMessage: error instanceof Error ? error.message : String(error),
                }
            })
        };

        logger.error('[API] Returning error response', {
            status: 500,
            errorMessage,
            errorDetails,
            responseKeys: Object.keys(errorResponse),
        });

        return NextResponse.json(errorResponse, { status: 500 });
    }
}

/**
 * Format cost range for display
 */
function formatCostRange(cost?: { min: number; max: number }): string {
    if (!cost || (cost.min === 0 && cost.max === 0)) {
        return 'Contact for quote';
    }

    const formatter = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return `${formatter.format(cost.min)}-${formatter.format(cost.max)}`;
}

/**
 * Format urgency for display
 */
function formatUrgency(urgency: string): string {
    const urgencyMap: Record<string, string> = {
        'immediate': 'Immediate action required',
        'urgent': 'Within 24-48 hours',
        'soon': 'Within 1 week',
        'moderate': 'Within 2-4 weeks',
        'low': 'Plan for future',
    };

    return urgencyMap[urgency.toLowerCase()] || urgency;
}
