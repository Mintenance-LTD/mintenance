import { NextRequest, NextResponse } from 'next/server';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';
import type { Phase1BuildingAssessment, SafetyHazard } from '@/lib/services/building-surveyor/types';
import { validateImageForOpenAI } from '@/lib/utils/image-validation';
import { shouldCompressImage, compressImageServerSide } from '@/lib/utils/image-compression';
import { logger } from '@/lib/logger';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';

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
            throw new BadRequestError('No image provided');
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
            throw new BadRequestError(`Image validation failed: ${validation.errors.join('; ')}`);
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
        return handleAPIError(error);
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
