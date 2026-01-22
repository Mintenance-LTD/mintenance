/**
 * Model Learning Progress API
 *
 * Provides metrics for the continuous learning dashboard showing:
 * - Training data accumulation
 * - Model performance over time
 * - Cost savings trend
 * - User feedback statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { createClient } from '@supabase/supabase-js';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

        const auth = await requireAdmin(request);
        if (isAdminError(auth)) return auth.error;
        const user = auth.user;

        // Get time range from query params
        const searchParams = request.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 1. Training Data Accumulation
        const { data: predictionCount } = await supabase
            .from('model_predictions_log')
            .select('created_at', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());

        const { data: correctionCount } = await supabase
            .from('user_corrections')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());

        // 2. Model Performance Trend
        const { data: performanceSnapshots } = await supabase
            .from('model_performance_snapshots')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .order('timestamp', { ascending: true });

        // 3. Routing Statistics
        const { data: routingDecisions } = await supabase
            .from('hybrid_routing_decisions')
            .select('route_selected, internal_confidence, created_at')
            .gte('created_at', startDate.toISOString());

        // 4. Cost Savings
        const internalModelUsage = routingDecisions?.filter(
            d => d.route_selected === 'internal'
        ).length || 0;

        const gpt4Usage = routingDecisions?.filter(
            d => d.route_selected === 'gpt4_vision'
        ).length || 0;

        const totalRequests = internalModelUsage + gpt4Usage;
        const gpt4Cost = 0.01275; // Per request

        const actualCost = gpt4Usage * gpt4Cost;
        const wouldBeCost = totalRequests * gpt4Cost;
        const savedCost = wouldBeCost - actualCost;

        // 5. Model Versions
        const { data: models } = await supabase
            .from('yolo_models')
            .select('*')
            .order('created_at', { ascending: true });

        // 6. User Feedback Stats
        const { data: corrections } = await supabase
            .from('user_corrections')
            .select('was_correct')
            .gte('created_at', startDate.toISOString());

        const accurateCount = corrections?.filter(c => c.was_correct).length || 0;
        const correctedCount = corrections?.filter(c => !c.was_correct).length || 0;
        const totalFeedback = accurateCount + correctedCount;

        // 7. Learning Velocity (predictions per day)
        const { data: dailyPredictions } = await supabase
            .from('model_predictions_log')
            .select('created_at')
            .gte('created_at', startDate.toISOString());

        const predictionsByDay: Record<string, number> = {};
        dailyPredictions?.forEach(p => {
            const day = new Date(p.created_at).toISOString().split('T')[0];
            predictionsByDay[day] = (predictionsByDay[day] || 0) + 1;
        });

        // 8. High Quality Training Examples
        const { data: highQualityExamples, count: highQualityCount } = await supabase
            .from('model_predictions_log')
            .select('*', { count: 'exact', head: true })
            .eq('gpt4_agreement', true)
            .gte('confidence', 0.85)
            .gte('created_at', startDate.toISOString());

        // 9. Class Distribution
        const { data: classDistribution } = await supabase
            .from('model_predictions_log')
            .select('damage_type')
            .gte('created_at', startDate.toISOString());

        const classCounts: Record<string, number> = {};
        classDistribution?.forEach(p => {
            classCounts[p.damage_type] = (classCounts[p.damage_type] || 0) + 1;
        });

        // 10. Average Confidence Trend
        const confidenceTrend = performanceSnapshots?.map(snapshot => ({
            date: snapshot.timestamp,
            confidence: snapshot.metrics?.avgConfidence || 0,
            disagreementRate: snapshot.metrics?.disagreementRate || 0,
            performanceScore: snapshot.performance_score || 0
        })) || [];

        // Calculate improvement rate
        const firstSnapshot = performanceSnapshots?.[0];
        const lastSnapshot = performanceSnapshots?.[performanceSnapshots.length - 1];
        const improvementRate = firstSnapshot && lastSnapshot
            ? ((lastSnapshot.performance_score - firstSnapshot.performance_score) /
               firstSnapshot.performance_score * 100)
            : 0;

        // Response
        const response = {
            timeRange: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString()
            },
            dataAccumulation: {
                totalPredictions: predictionCount || 0,
                totalCorrections: correctionCount || 0,
                highQualityExamples: highQualityCount || 0,
                predictionsPerDay: Math.round((predictionCount || 0) / days),
                dailyBreakdown: predictionsByDay
            },
            modelPerformance: {
                currentVersion: models?.[models.length - 1]?.version || 'v1.0.0',
                totalVersions: models?.length || 0,
                improvementRate: Math.round(improvementRate * 100) / 100,
                confidenceTrend,
                versions: models?.map(m => ({
                    version: m.version,
                    mAP50: m.metrics?.mAP50,
                    precision: m.metrics?.precision,
                    recall: m.metrics?.recall,
                    createdAt: m.created_at,
                    isActive: m.is_active
                })) || []
            },
            costSavings: {
                totalRequests,
                internalModelUsage,
                gpt4Usage,
                internalModelPercentage: totalRequests > 0
                    ? Math.round((internalModelUsage / totalRequests) * 100)
                    : 0,
                actualCost: Math.round(actualCost * 100) / 100,
                savedCost: Math.round(savedCost * 100) / 100,
                projectedMonthlySavings: Math.round((savedCost / days * 30) * 100) / 100
            },
            userFeedback: {
                totalFeedback,
                accurateCount,
                correctedCount,
                accuracyRate: totalFeedback > 0
                    ? Math.round((accurateCount / totalFeedback) * 100)
                    : 100
            },
            classDistribution,
            learningVelocity: {
                predictionsPerDay: Object.values(predictionsByDay).reduce((a, b) => a + b, 0) /
                    Object.keys(predictionsByDay).length,
                trend: calculateTrend(Object.values(predictionsByDay)),
                status: getLearningStatus(Object.values(predictionsByDay))
            },
            recommendations: generateRecommendations({
                highQualityCount: highQualityCount || 0,
                improvementRate,
                accuracyRate: totalFeedback > 0 ? (accurateCount / totalFeedback) * 100 : 100,
                internalUsage: totalRequests > 0 ? (internalModelUsage / totalRequests) * 100 : 0
            })
        };

        return NextResponse.json(response);

    } catch (error) {
        logger.error('Model learning API error:', error, { service: 'api' });
        return NextResponse.json(
            { error: 'Failed to fetch learning metrics' },
            { status: 500 }
        );
    }
}

function calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
}

function getLearningStatus(values: number[]): 'excellent' | 'good' | 'slow' | 'stalled' {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if (avg > 100) return 'excellent';
    if (avg > 50) return 'good';
    if (avg > 20) return 'slow';
    return 'stalled';
}

function generateRecommendations(metrics: {
    highQualityCount: number;
    improvementRate: number;
    accuracyRate: number;
    internalUsage: number;
}): string[] {
    const recommendations: string[] = [];

    if (metrics.highQualityCount < 1000) {
        recommendations.push(
            `Need ${1000 - metrics.highQualityCount} more high-quality examples for next training`
        );
    } else if (metrics.highQualityCount >= 1000) {
        recommendations.push(
            '✅ Ready for model retraining with accumulated data'
        );
    }

    if (metrics.improvementRate < 0) {
        recommendations.push(
            '⚠️ Model performance declining - urgent retraining recommended'
        );
    } else if (metrics.improvementRate > 5) {
        recommendations.push(
            '📈 Model improving well - continue current strategy'
        );
    }

    if (metrics.accuracyRate < 80) {
        recommendations.push(
            '⚠️ High correction rate - review model predictions and adjust thresholds'
        );
    }

    if (metrics.internalUsage < 50) {
        recommendations.push(
            '💡 Internal model usage low - consider lowering confidence thresholds'
        );
    } else if (metrics.internalUsage > 70) {
        recommendations.push(
            '✅ Good balance - 70%+ using internal model'
        );
    }

    return recommendations;
}