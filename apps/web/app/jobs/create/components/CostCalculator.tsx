'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, TrendingUp, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CostEstimate {
  min: number;
  max: number;
  recommended: number;
  marketAverage?: number;
}

interface QuickJobTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  fixedPrice?: { min: number; max: number };
  estimatedDuration: string;
  icon: string;
}

/**
 * Cost Calculator Component
 * Helps homeowners estimate job costs before posting
 */
export function CostCalculator() {
  const [category, setCategory] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [propertyType, setPropertyType] = useState<'flat' | 'house' | 'commercial'>('house');
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Quick job templates for common small jobs
  const quickJobTemplates: QuickJobTemplate[] = [
    {
      id: 'fix-leaky-tap',
      title: 'Fix Leaky Tap',
      category: 'plumbing',
      description: 'Repair or replace leaking tap',
      fixedPrice: { min: 50, max: 120 },
      estimatedDuration: '1-2 hours',
      icon: '🔧',
    },
    {
      id: 'unblock-drain',
      title: 'Unblock Drain',
      category: 'plumbing',
      description: 'Clear blocked sink, bath, or shower drain',
      fixedPrice: { min: 60, max: 150 },
      estimatedDuration: '1-2 hours',
      icon: '🚿',
    },
    {
      id: 'replace-light-switch',
      title: 'Replace Light Switch',
      category: 'electrical',
      description: 'Replace single or double light switch',
      fixedPrice: { min: 50, max: 100 },
      estimatedDuration: '30-60 minutes',
      icon: '💡',
    },
    {
      id: 'hang-picture',
      title: 'Hang Picture/Mirror',
      category: 'handyman',
      description: 'Hang picture, mirror, or shelf',
      fixedPrice: { min: 30, max: 80 },
      estimatedDuration: '30-60 minutes',
      icon: '🖼️',
    },
    {
      id: 'assemble-furniture',
      title: 'Assemble Furniture',
      category: 'handyman',
      description: 'Assemble flat-pack furniture',
      fixedPrice: { min: 40, max: 120 },
      estimatedDuration: '1-3 hours',
      icon: '🪑',
    },
    {
      id: 'fix-door',
      title: 'Fix Door/Window',
      category: 'handyman',
      description: 'Repair sticking door or window',
      fixedPrice: { min: 50, max: 150 },
      estimatedDuration: '1-2 hours',
      icon: '🚪',
    },
    {
      id: 'paint-room',
      title: 'Paint Single Room',
      category: 'painting',
      description: 'Paint walls and ceiling of one room',
      fixedPrice: { min: 200, max: 500 },
      estimatedDuration: '1-2 days',
      icon: '🎨',
    },
    {
      id: 'gutter-clean',
      title: 'Clean Gutters',
      category: 'handyman',
      description: 'Clean and clear gutters',
      fixedPrice: { min: 80, max: 200 },
      estimatedDuration: '2-4 hours',
      icon: '🏠',
    },
  ];

  // Base budgets by category (matching JobAnalysisService)
  const baseBudgets: Record<string, { min: number; max: number }> = {
    plumbing: { min: 80, max: 500 },
    electrical: { min: 100, max: 800 },
    hvac: { min: 150, max: 1200 },
    roofing: { min: 200, max: 2000 },
    painting: { min: 150, max: 1000 },
    carpentry: { min: 100, max: 1500 },
    gardening: { min: 50, max: 400 },
    cleaning: { min: 60, max: 300 },
    flooring: { min: 200, max: 2500 },
    heating: { min: 150, max: 1500 },
    handyman: { min: 80, max: 500 },
  };

  const calculateEstimate = async () => {
    if (!category) return;

    setIsCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const base = baseBudgets[category] || baseBudgets.handyman;
    
    // Adjust for complexity based on description
    const descriptionLower = jobDescription.toLowerCase();
    const isComplex = descriptionLower.includes('complex') || 
                     descriptionLower.includes('major') || 
                     descriptionLower.includes('extensive') ||
                     descriptionLower.includes('full');
    const isSimple = descriptionLower.includes('simple') || 
                    descriptionLower.includes('quick') || 
                    descriptionLower.includes('minor') ||
                    descriptionLower.includes('small');
    const isLarge = descriptionLower.includes('entire') || 
                   descriptionLower.includes('whole') ||
                   descriptionLower.includes('all');

    let multiplier = 1.0;
    
    if (isComplex || isLarge) {
      multiplier = 2.0;
    } else if (isSimple) {
      multiplier = 0.6;
    }

    // Adjust for urgency
    if (urgency === 'high') {
      multiplier *= 1.5;
    } else if (urgency === 'low') {
      multiplier *= 0.9;
    }

    // Adjust for property type
    if (propertyType === 'commercial') {
      multiplier *= 1.3;
    } else if (propertyType === 'flat') {
      multiplier *= 0.9;
    }

    const min = Math.round(base.min * multiplier);
    const max = Math.round(base.max * multiplier);
    const recommended = Math.round((min + max) / 2);
    const marketAverage = Math.round((min + max) / 2); // Simplified

    setEstimate({
      min: Math.max(50, min),
      max: Math.min(5000, max),
      recommended: Math.max(100, Math.min(3000, recommended)),
      marketAverage,
    });

    setIsCalculating(false);
  };

  const handleTemplateSelect = (template: QuickJobTemplate) => {
    setCategory(template.category);
    setJobDescription(template.description);
    if (template.fixedPrice) {
      setEstimate({
        min: template.fixedPrice.min,
        max: template.fixedPrice.max,
        recommended: Math.round((template.fixedPrice.min + template.fixedPrice.max) / 2),
      });
    }
  };

  const jobCategories = [
    { label: 'Handyman', value: 'handyman' },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Painting & Decorating', value: 'painting' },
    { label: 'Carpentry', value: 'carpentry' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Gardening', value: 'gardening' },
    { label: 'Roofing', value: 'roofing' },
    { label: 'Heating & Gas', value: 'heating' },
    { label: 'Flooring', value: 'flooring' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Job Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Quick Fix Jobs</span>
            <span className="text-sm font-normal text-gray-500">(Fixed Pricing Available)</span>
          </CardTitle>
          <CardDescription>
            Select a common job for instant pricing, or use the calculator below for custom jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickJobTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="p-4 border rounded-lg hover:border-secondary hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">{template.title}</h4>
                    {template.fixedPrice && (
                      <p className="text-xs text-gray-600 mb-1">
                        £{template.fixedPrice.min}-£{template.fixedPrice.max}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{template.estimatedDuration}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Calculator
          </CardTitle>
          <CardDescription>
            Get an estimate for your job based on category, complexity, and urgency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Job Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white opacity-100 backdrop-blur-none">
                  {jobCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={urgency} onValueChange={(value: 'low' | 'medium' | 'high') => setUrgency(value)}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white opacity-100 backdrop-blur-none">
                  <SelectItem value="low">Low - Flexible timing</SelectItem>
                  <SelectItem value="medium">Medium - Within a week</SelectItem>
                  <SelectItem value="high">High - Urgent/Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-type">Property Type</Label>
            <Select value={propertyType} onValueChange={(value: 'flat' | 'house' | 'commercial') => setPropertyType(value)}>
              <SelectTrigger id="property-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white opacity-100 backdrop-blur-none">
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="flat">Flat/Apartment</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description (Optional)</Label>
            <textarea
              id="description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Describe your job... (e.g., 'Fix leaky tap in kitchen', 'Paint entire living room')"
              className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <p className="text-xs text-gray-500">
              Include details like size, complexity, or specific requirements for a more accurate estimate
            </p>
          </div>

          <Button
            onClick={calculateEstimate}
            disabled={!category || isCalculating}
            className="w-full"
            variant="primary"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Estimate'}
          </Button>

          {estimate && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Estimated Cost Range
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Minimum</p>
                  <p className="text-lg font-semibold">£{estimate.min}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Recommended</p>
                  <p className="text-lg font-semibold text-secondary">£{estimate.recommended}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Maximum</p>
                  <p className="text-lg font-semibold">£{estimate.max}</p>
                </div>
              </div>
              {estimate.marketAverage && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Market average for similar jobs: <strong>£{estimate.marketAverage}</strong>
                  </AlertDescription>
                </Alert>
              )}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> This is an estimate. Final quotes from contractors may vary based on specific requirements, materials, and location.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

