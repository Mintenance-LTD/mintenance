'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type {
  Phase1BuildingAssessment,
  Urgency,
  DamageAssessment,
  SafetyHazards,
  SafetyHazard,
  Compliance,
  ComplianceIssue,
  InsuranceRisk,
  RiskFactor,
  HomeownerExplanation as HomeownerExplanationType,
  ContractorAdvice as ContractorAdviceType,
  Material,
} from '@/lib/services/building-surveyor/types';

interface BuildingAssessmentDisplayProps {
  assessment: Phase1BuildingAssessment;
  onUseAssessment?: () => void;
}

/**
 * Main component to display building assessment results
 */
export function BuildingAssessmentDisplay({
  assessment,
  onUseAssessment,
}: BuildingAssessmentDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Urgency Badge - Always visible at top */}
      <UrgencyBadge urgency={assessment.urgency} />

      {/* Damage Assessment - Main card */}
      <DamageAssessmentCard damageAssessment={assessment.damageAssessment} />

      {/* Safety Hazards - Critical if hasCriticalHazards */}
      {assessment.safetyHazards.hasCriticalHazards && (
        <SafetyHazardsCard safetyHazards={assessment.safetyHazards} />
      )}

      {/* Compliance Flags */}
      {assessment.compliance.complianceIssues.length > 0 && (
        <ComplianceFlagsCard compliance={assessment.compliance} />
      )}

      {/* Insurance Risk */}
      <InsuranceRiskCard insuranceRisk={assessment.insuranceRisk} />

      {/* Homeowner Explanation */}
      <HomeownerExplanationCard explanation={assessment.homeownerExplanation} />

      {/* Contractor Advice */}
      <ContractorAdviceCard advice={assessment.contractorAdvice} />

      {/* Use Assessment Button */}
      {onUseAssessment && (
        <div className="pt-4">
          <button
            onClick={onUseAssessment}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-[560] rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Icon name="check" size={20} />
            Use AI Assessment in Job Posting
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Urgency Badge Component
 */
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const urgencyConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
    immediate: {
      color: 'text-red-700',
      bgColor: 'bg-red-100 border-red-300',
      icon: 'alert',
    },
    urgent: {
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100 border-emerald-300',
      icon: 'warning',
    },
    soon: {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100 border-yellow-300',
      icon: 'clock',
    },
    planned: {
      color: 'text-blue-700',
      bgColor: 'bg-blue-100 border-blue-300',
      icon: 'calendar',
    },
    monitor: {
      color: 'text-gray-700',
      bgColor: 'bg-gray-100 border-gray-300',
      icon: 'eye',
    },
  };

  const config = urgencyConfig[urgency.urgency] || urgencyConfig.monitor;

  return (
    <div className={`rounded-lg border-2 ${config.bgColor} ${config.color} p-4`}>
      <div className="flex items-center gap-3">
        <Icon name={config.icon} size={24} color="currentColor" />
        <div className="flex-1">
          <div className="font-[640] text-lg uppercase tracking-wide">
            {urgency.urgency}
          </div>
          <div className="text-sm font-[460] mt-1">
            {urgency.recommendedActionTimeline}
          </div>
        </div>
      </div>
      {urgency.reasoning && (
        <div className="mt-3 text-sm font-[460] opacity-90">
          {urgency.reasoning}
        </div>
      )}
    </div>
  );
}

/**
 * Damage Assessment Card Component
 */
export function DamageAssessmentCard({
  damageAssessment,
}: {
  damageAssessment: DamageAssessment;
}) {
  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    early: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    midway: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    },
    full: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
    },
  };

  const colors = severityColors[damageAssessment.severity] || severityColors.early;

  return (
    <Card variant="default" padding="md" hover>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-[560] text-gray-900 mb-1">Damage Assessment</h3>
            <p className="text-sm font-[460] text-gray-600">
              {damageAssessment.damageType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border} text-sm font-[560] uppercase`}
          >
            {damageAssessment.severity}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-base font-[460] text-gray-700 leading-[1.5]">
            {damageAssessment.description}
          </p>
          <div className="text-sm font-[460] text-gray-600">
            Location: {damageAssessment.location.replace(/_/g, ' ')}
          </div>
          <div className="text-sm font-[460] text-gray-600">
            Confidence: {damageAssessment.confidence}%
          </div>
        </div>

        {damageAssessment.detectedItems.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-sm font-[560] text-gray-700 mb-2">Detected Items:</div>
            <ul className="space-y-1">
              {damageAssessment.detectedItems.map((item: string, index: number) => (
                <li key={index} className="text-sm font-[460] text-gray-600 flex items-start gap-2">
                  <Icon name="check" size={16} color="#10B981" className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Safety Hazards Card Component
 */
export function SafetyHazardsCard({ safetyHazards }: { safetyHazards: SafetyHazards }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card variant="default" padding="md" className="border-l-4 border-l-red-500">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon name="alert" size={24} color="#EF4444" />
            <div>
              <h3 className="text-lg font-[560] text-gray-900">Safety Hazards</h3>
              <p className="text-sm font-[460] text-gray-600">
                {safetyHazards.hazards.length} hazard{safetyHazards.hazards.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
        </div>

        <div className="text-sm font-[460] text-gray-700">
          Safety Score: <span className="font-[560]">{safetyHazards.overallSafetyScore}/100</span>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2">
            {safetyHazards.hazards.map((hazard: SafetyHazard, index: number) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  hazard.severity === 'critical' || hazard.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : hazard.severity === 'medium'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-[560] text-gray-900">{hazard.type.replace(/_/g, ' ')}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-[560] uppercase ${
                      hazard.severity === 'critical' || hazard.severity === 'high'
                        ? 'bg-red-200 text-red-800'
                        : hazard.severity === 'medium'
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {hazard.severity}
                  </span>
                </div>
                <p className="text-sm font-[460] text-gray-700 mb-1">{hazard.description}</p>
                {hazard.immediateAction && (
                  <div className="mt-2 p-2 bg-white rounded border border-red-300">
                    <div className="text-xs font-[560] text-red-800 mb-1">Immediate Action:</div>
                    <div className="text-sm font-[460] text-red-700">{hazard.immediateAction}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Compliance Flags Card Component
 */
export function ComplianceFlagsCard({ compliance }: { compliance: Compliance }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="default" padding="md">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon name="document" size={24} color="#3B82F6" />
            <div>
              <h3 className="text-lg font-[560] text-gray-900">Compliance Flags</h3>
              <p className="text-sm font-[460] text-gray-600">
                {compliance.complianceIssues.length} issue{compliance.complianceIssues.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
        </div>

        <div className="text-sm font-[460] text-gray-700">
          Compliance Score: <span className="font-[560]">{compliance.complianceScore}/100</span>
        </div>

        {compliance.requiresProfessionalInspection && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-[560] text-blue-900">
              Professional inspection recommended
            </div>
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-2">
            {compliance.complianceIssues.map((issue: ComplianceIssue, index: number) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  issue.severity === 'violation'
                    ? 'bg-red-50 border-red-200'
                    : issue.severity === 'warning'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-[560] text-gray-900">{issue.issue.replace(/_/g, ' ')}</div>
                  {issue.regulation && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-[560]">
                      {issue.regulation}
                    </span>
                  )}
                </div>
                <p className="text-sm font-[460] text-gray-700 mb-2">{issue.description}</p>
                <div className="text-sm font-[460] text-gray-600">
                  <span className="font-[560]">Recommendation:</span> {issue.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Insurance Risk Card Component
 */
export function InsuranceRiskCard({ insuranceRisk }: { insuranceRisk: InsuranceRisk }) {
  const riskColor =
    insuranceRisk.riskScore >= 70
      ? 'text-red-600'
      : insuranceRisk.riskScore >= 40
      ? 'text-emerald-600'
      : 'text-green-600';

  const premiumImpactColors: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-emerald-100 text-emerald-800',
    low: 'bg-yellow-100 text-yellow-800',
    none: 'bg-green-100 text-green-800',
  };

  return (
    <Card variant="default" padding="md">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-[560] text-gray-900 mb-1">Insurance Risk</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-[640] ${riskColor}`}>
                {insuranceRisk.riskScore}
              </span>
              <span className="text-sm font-[460] text-gray-600">/100</span>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-[560] uppercase ${
              premiumImpactColors[insuranceRisk.premiumImpact] || premiumImpactColors.none
            }`}
          >
            {insuranceRisk.premiumImpact} impact
          </div>
        </div>

        {insuranceRisk.riskFactors.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="text-sm font-[560] text-gray-700">Risk Factors:</div>
            {insuranceRisk.riskFactors.map((factor: RiskFactor, index: number) => (
              <div key={index} className="text-sm font-[460] text-gray-600">
                <span className="font-[560]">{factor.factor}:</span> {factor.impact}
              </div>
            ))}
          </div>
        )}

        {insuranceRisk.mitigationSuggestions.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-sm font-[560] text-gray-700 mb-2">Mitigation Suggestions:</div>
            <ul className="space-y-1">
              {insuranceRisk.mitigationSuggestions.map((suggestion: string, index: number) => (
                <li key={index} className="text-sm font-[460] text-gray-600 flex items-start gap-2">
                  <Icon name="check" size={16} color="#10B981" className="mt-0.5 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Homeowner Explanation Component
 */
export function HomeownerExplanationCard({ explanation }: { explanation: HomeownerExplanationType }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card variant="default" padding="md" className="bg-blue-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon name="info" size={24} color="#3B82F6" />
            <h3 className="text-lg font-[560] text-gray-900">For Homeowners</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
        </div>

        {expanded && (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-[560] text-gray-700 mb-1">What is it?</div>
              <p className="text-base font-[460] text-gray-700 leading-[1.5]">
                {explanation.whatIsIt}
              </p>
            </div>
            <div>
              <div className="text-sm font-[560] text-gray-700 mb-1">Why did it happen?</div>
              <p className="text-base font-[460] text-gray-700 leading-[1.5]">
                {explanation.whyItHappened}
              </p>
            </div>
            <div>
              <div className="text-sm font-[560] text-gray-700 mb-1">What should I do?</div>
              <p className="text-base font-[460] text-gray-700 leading-[1.5]">
                {explanation.whatToDo}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Contractor Advice Component
 */
export function ContractorAdviceCard({ advice }: { advice: ContractorAdviceType }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="default" padding="md" className="bg-gray-50">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon name="briefcase" size={24} color="#1F2937" />
            <div>
              <h3 className="text-lg font-[560] text-gray-900">For Contractors</h3>
              <p className="text-sm font-[460] text-gray-600">
                Technical details and cost estimates
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
        </div>

        {expanded && (
          <div className="space-y-4 pt-2">
            {/* Cost Estimate */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-sm font-[560] text-gray-700 mb-2">Cost Estimate</div>
              <div className="text-2xl font-[640] text-gray-900">
                £{advice.estimatedCost.recommended.toLocaleString()}
              </div>
              <div className="text-sm font-[460] text-gray-600 mt-1">
                Range: £{advice.estimatedCost.min.toLocaleString()} - £
                {advice.estimatedCost.max.toLocaleString()}
              </div>
              <div className="text-sm font-[460] text-gray-600 mt-1">
                Estimated Time: {advice.estimatedTime}
              </div>
              <div className="text-sm font-[460] text-gray-600">
                Complexity: <span className="font-[560] capitalize">{advice.complexity}</span>
              </div>
            </div>

            {/* Repair Steps */}
            {advice.repairNeeded.length > 0 && (
              <div>
                <div className="text-sm font-[560] text-gray-700 mb-2">Repair Steps:</div>
                <ol className="space-y-1 list-decimal list-inside">
                  {advice.repairNeeded.map((step: string, index: number) => (
                    <li key={index} className="text-sm font-[460] text-gray-600">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Materials */}
            {advice.materials.length > 0 && (
              <div>
                <div className="text-sm font-[560] text-gray-700 mb-2">Materials Needed:</div>
                <div className="space-y-1">
                  {advice.materials.map((material: Material, index: number) => (
                    <div
                      key={index}
                      className="text-sm font-[460] text-gray-600 flex justify-between"
                    >
                      <span>
                        {material.name} ({material.quantity})
                      </span>
                      <span className="font-[560]">£{material.estimatedCost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {advice.tools.length > 0 && (
              <div>
                <div className="text-sm font-[560] text-gray-700 mb-2">Tools Required:</div>
                <div className="flex flex-wrap gap-2">
                  {advice.tools.map((tool: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-[460] text-gray-700"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

