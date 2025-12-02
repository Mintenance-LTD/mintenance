'use client';

import React from 'react';
import { Check, Clock, Calendar, Wrench, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobStatus = 'request' | 'bidding' | 'scheduled' | 'in_progress' | 'complete';

interface JobStatusStepperProps {
    currentStatus: JobStatus;
    className?: string;
}

const steps = [
    { id: 'request', label: 'Request', icon: FileText },
    { id: 'bidding', label: 'Bidding', icon: Clock },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'in_progress', label: 'In Progress', icon: Wrench },
    { id: 'complete', label: 'Complete', icon: Check },
];

export function JobStatusStepper({ currentStatus, className }: JobStatusStepperProps) {
    const currentStepIndex = steps.findIndex((step) => step.id === currentStatus);

    return (
        <div className={cn("w-full py-4", className)}>
            <div className="relative flex items-center justify-between w-full">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10" />

                {/* Active Progress Bar */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full -z-10 transition-all duration-500 ease-in-out"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 bg-white",
                                    isCompleted
                                        ? "border-emerald-500 text-emerald-600 shadow-sm"
                                        : "border-gray-300 text-gray-400",
                                    isCurrent && "ring-4 ring-emerald-100 scale-110 border-emerald-600 text-emerald-700"
                                )}
                            >
                                <Icon size={18} strokeWidth={isCurrent ? 2.5 : 2} />
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors duration-300",
                                    isCompleted ? "text-emerald-700" : "text-gray-400",
                                    isCurrent && "font-bold text-emerald-800"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
