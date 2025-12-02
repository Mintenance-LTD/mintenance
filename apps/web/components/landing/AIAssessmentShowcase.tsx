'use client';

import { useState, useRef } from 'react';
import { logger } from '@mintenance/shared';
import { Upload, Sparkles, CheckCircle, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface AssessmentResult {
    damageType: string;
    severity: string;
    confidence: number;
    estimatedCost: string;
    urgency: string;
    recommendation: string;
    safetyHazards?: string[];
}

export function AIAssessmentShowcase() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [result, setResult] = useState<AssessmentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        setError(null);
        setShowResults(false);

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Analyze with Building Surveyor AI
        await analyzeImage(file);
    };

    const analyzeImage = async (file: File) => {
        setIsAnalyzing(true);
        setError(null);

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('image', file);

            // Call your Building Surveyor API (public demo endpoint)
            const response = await fetch('/api/building-surveyor/demo', {
                method: 'POST',
                body: formData,
            });

            // Parse response body to get error details if request failed
            if (!response.ok) {
                let errorMessage = 'Assessment failed. Please try again.';
                let errorDetails = '';
                
                try {
                    // Read response as text first to see what we're actually getting
                    const responseText = await response.text();
                    
                    // Log raw response for debugging
                    logger.error('API Error - Raw Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        contentType: response.headers.get('content-type'),
                        bodyLength: responseText.length,
                        bodyPreview: responseText.substring(0, 500),
                    });
                    
                    // Try to parse as JSON
                    let errorData: { error?: string; details?: string; message?: string } | null = null;
                    if (responseText && responseText.trim()) {
                        try {
                            errorData = JSON.parse(responseText);
                        } catch (jsonError) {
                            // Not valid JSON, use text as error message
                            errorMessage = responseText || response.statusText || errorMessage;
                            logger.error('API Error (invalid JSON):', {
                                status: response.status,
                                statusText: response.statusText,
                                body: responseText.substring(0, 200),
                                parseError: jsonError instanceof Error ? jsonError.message : 'Unknown',
                            });
                            throw new Error(errorMessage);
                        }
                    }
                    
                    // Extract error information from parsed data
                    if (errorData && typeof errorData === 'object') {
                        errorMessage = errorData.error || errorMessage;
                        errorDetails = errorData.details || errorData.message || '';
                    }
                    
                    // Log parsed error details for debugging
                    logger.error('API Error Response (Parsed):', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorMessage,
                        details: errorDetails,
                        hasErrorField: errorData && 'error' in errorData,
                        hasDetailsField: errorData && 'details' in errorData,
                        responseKeys: errorData ? Object.keys(errorData) : [],
                        fullErrorData: errorData,
                    });
                } catch (parseError) {
                    // If we couldn't parse at all, use status text
                    if (!(parseError instanceof Error && parseError.message !== errorMessage)) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    logger.error('API Error (parse failed):', {
                        status: response.status,
                        statusText: response.statusText,
                        parseError: parseError instanceof Error ? parseError.message : 'Unknown',
                    });
                }
                
                // Show user-friendly error with details if available
                // Check for specific OpenAI API errors
                if (errorDetails) {
                    if (errorDetails.includes('invalid_api_key') || errorDetails.includes('401')) {
                        errorMessage = 'OpenAI API key is invalid or expired. Please check your API key configuration.';
                        errorDetails = 'The API key is present but OpenAI rejected it. Please verify the key is correct and has not expired.';
                    } else if (errorDetails.includes('API key') || errorDetails.includes('not configured')) {
                        errorMessage = 'AI service is not configured. Please add OPENAI_API_KEY to your .env.local file.';
                        errorDetails = 'To enable AI assessment, add your OpenAI API key to the .env.local file in the project root. Get your key from https://platform.openai.com/api-keys';
                    }
                }
                
                // Always include details if available (unless it's a sensitive API key error)
                const userMessage = errorDetails && 
                    !errorDetails.includes('invalid_api_key') && 
                    !errorDetails.includes('API key') && 
                    !errorDetails.includes('not configured')
                    ? `${errorMessage} (${errorDetails})`
                    : errorMessage;
                
                throw new Error(userMessage);
            }

            const data = await response.json();

            // Check if response contains an error (even with 200 status)
            if (data.error) {
                throw new Error(data.error);
            }

            // Transform API response to display format
            setResult({
                damageType: data.damageType || 'Unknown',
                severity: data.severity || 'Unknown',
                confidence: Math.round((data.confidence || 0) * 100),
                estimatedCost: data.estimatedCost || 'Contact for quote',
                urgency: data.urgency || 'Assess soon',
                recommendation: data.recommendation || 'Contact a specialist for detailed assessment',
                safetyHazards: data.safetyHazards || [],
            });

            setShowResults(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
            setError(message);
            logger.error('Assessment error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDemo = () => {
        // Trigger file input
        fileInputRef.current?.click();
    };

    const handleReset = () => {
        setUploadedImage(null);
        setShowResults(false);
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] text-white relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#10B981] rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F59E0B] rounded-full filter blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                        <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                        <span className="text-sm font-semibold">AI-Powered Technology</span>
                    </div>

                    <h2 className="text-5xl font-bold mb-4">
                        Instant Damage Assessment
                    </h2>
                    <p className="text-xl text-slate-200 max-w-3xl mx-auto">
                        Upload a photo and get expert AI analysis in seconds. Powered by GPT-4 Vision.
                    </p>
                </div>

                {/* Demo Section */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Upload Demo */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                            aria-label="Upload damage photo"
                        />

                        <div 
                            className="aspect-video bg-gradient-to-br from-[#10B981]/20 to-[#F59E0B]/20 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all hover:border-white/50 hover:bg-gradient-to-br hover:from-[#10B981]/30 hover:to-[#F59E0B]/30"
                            onClick={handleDemo}
                            onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                    // Validate and process the dropped file directly
                                    if (!file.type.startsWith('image/')) {
                                        setError('Please upload an image file');
                                        return;
                                    }
                                    if (file.size > 10 * 1024 * 1024) {
                                        setError('Image must be less than 10MB');
                                        return;
                                    }
                                    setError(null);
                                    setShowResults(false);
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        setUploadedImage(e.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                    analyzeImage(file);
                                }
                            }}
                        >
                            {!isAnalyzing && !showResults && !uploadedImage && (
                                <>
                                    <Upload className="w-16 h-16 text-white/60 mb-4" />
                                    <p className="text-white/80 mb-4 text-center px-4">Upload damage photo for instant analysis</p>
                                    <Button
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            handleDemo();
                                        }}
                                        className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
                                    >
                                        Upload Image
                                    </Button>
                                    <p className="text-white/60 text-xs mt-3">Max 10MB • JPG, PNG, WebP</p>
                                </>
                            )}

                            {uploadedImage && !isAnalyzing && !showResults && (
                                <div className="w-full h-full relative">
                                    <img
                                        src={uploadedImage}
                                        alt="Uploaded damage"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                </div>
                            )}

                            {isAnalyzing && (
                                <div className="text-center">
                                    <div className="relative">
                                        <div className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                                        <Sparkles className="w-12 h-12 text-[#F59E0B] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <p className="text-white font-semibold text-lg">Analyzing damage...</p>
                                    <p className="text-slate-200 text-sm mt-2">Building Surveyor AI is examining the image</p>
                                </div>
                            )}

                            {showResults && result && (
                                <div className="w-full h-full bg-gradient-to-br from-[#10B981]/20 to-emerald-500/20 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
                                            <CheckCircle className="w-12 h-12 text-white" />
                                        </div>
                                        <p className="text-white font-bold text-xl">Analysis Complete!</p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="text-center p-6">
                                    <AlertCircle className="w-16 h-16 text-red-400 mb-4 mx-auto" />
                                    <p className="text-red-300 font-semibold mb-2">{error}</p>
                                    {error.includes('OPENAI_API_KEY') && (
                                        <div className="text-sm text-red-200/80 mb-4 space-y-2">
                                            <p>To fix this:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                                                <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-100">OpenAI Platform</a></li>
                                                <li>Add <code className="bg-white/10 px-1 rounded">OPENAI_API_KEY=sk-...</code> to your <code className="bg-white/10 px-1 rounded">.env.local</code> file</li>
                                                <li>Restart your development server</li>
                                            </ol>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleReset}
                                        className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {(showResults || uploadedImage) && !isAnalyzing && (
                            <Button
                                onClick={handleReset}
                                className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/30"
                            >
                                Analyze Another Image
                            </Button>
                        )}
                    </div>

                    {/* Right: Results or Features */}
                    <div className="space-y-6">
                        {!showResults ? (
                            <>
                                {/* Features */}
                                <div className="space-y-4">
                                    <FeatureItem
                                        icon={<Zap className="w-6 h-6" />}
                                        title="Instant Analysis"
                                        description="Get damage assessment in under 10 seconds"
                                    />
                                    <FeatureItem
                                        icon={<Sparkles className="w-6 h-6" />}
                                        title="95% Accuracy"
                                        description="Powered by advanced GPT-4 Vision AI"
                                    />
                                    <FeatureItem
                                        icon={<CheckCircle className="w-6 h-6" />}
                                        title="Expert Insights"
                                        description="Detailed damage type, severity, and cost estimates"
                                    />
                                </div>

                                {/* Stats */}
                                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-3xl font-bold text-[#F59E0B]">1,000+</div>
                                            <div className="text-sm text-slate-200">Assessments</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-bold text-[#F59E0B]">95%</div>
                                            <div className="text-sm text-slate-200">Accuracy</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-bold text-[#F59E0B]">10s</div>
                                            <div className="text-sm text-slate-200">Avg Time</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : result ? (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 animate-in slide-in-from-right duration-500">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-[#F59E0B]" />
                                    Assessment Results
                                </h3>

                                <div className="space-y-4">
                                    <ResultItem label="Damage Type" value={result.damageType} />
                                    <ResultItem label="Severity" value={result.severity} badge={getSeverityBadge(result.severity)} />
                                    <ResultItem label="Confidence" value={`${result.confidence}%`} />
                                    <ResultItem label="Estimated Cost" value={result.estimatedCost} />
                                    <ResultItem label="Urgency" value={result.urgency} badge={getUrgencyBadge(result.urgency)} />
                                </div>

                                {result.safetyHazards && result.safetyHazards.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-500/20 rounded-xl border border-red-400/30">
                                        <p className="text-sm font-semibold text-red-200 mb-2">⚠️ Safety Hazards Detected:</p>
                                        <ul className="text-sm text-red-100 space-y-1">
                                            {result.safetyHazards.map((hazard, i) => (
                                                <li key={i}>• {hazard}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-6 p-4 bg-[#10B981]/20 rounded-xl border border-[#10B981]/30">
                                    <p className="text-sm text-emerald-100 mb-3">
                                        <strong>Recommendation:</strong> {result.recommendation}
                                    </p>
                                    <Button
                                        onClick={() => window.location.href = `/register?role=homeowner&project=${encodeURIComponent(result.damageType)}`}
                                        className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                                    >
                                        Get Matched with Specialists
                                        <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-lg mb-1">{title}</h4>
                <p className="text-slate-200 text-sm">{description}</p>
            </div>
        </div>
    );
}

function ResultItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-slate-200">{label}</span>
            <div className="flex items-center gap-2">
                <span className="font-semibold">{value}</span>
                {badge && (
                    <span className="px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded-full border border-[#F59E0B]/30">
                        {badge}
                    </span>
                )}
            </div>
        </div>
    );
}

function getSeverityBadge(severity: string): string {
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('critical')) return 'High';
    if (s.includes('moderate') || s.includes('medium')) return 'Medium';
    return 'Low';
}

function getUrgencyBadge(urgency: string): string {
    const u = urgency.toLowerCase();
    if (u.includes('immediate') || u.includes('urgent')) return 'Urgent';
    if (u.includes('soon') || u.includes('week')) return 'Soon';
    return 'Plan';
}
