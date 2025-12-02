'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  showStrengthMeter?: boolean;
  helperText?: string;
  showRequirements?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showStrengthMeter, helperText, showRequirements, className, id, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `password-${label.toLowerCase().replace(/\s+/g, '-')}`;

    const password = typeof value === 'string' ? value : '';

    // Password strength calculation
    const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
      if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };

      let score = 0;
      if (pwd.length >= 8) score++;
      if (pwd.length >= 12) score++;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
      if (/\d/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;

      if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
      if (score <= 3) return { score, label: 'Medium', color: 'bg-yellow-500' };
      return { score, label: 'Strong', color: 'bg-green-500' };
    };

    const strength = calculateStrength(password);
    const strengthPercentage = (strength.score / 5) * 100;

    // Password requirements
    const requirements = [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'One uppercase & lowercase letter', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
      { label: 'One number', met: /\d/.test(password) },
      { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
    ];

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Lock className="w-5 h-5" />
          </div>
          <Input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={cn('pl-10 pr-10', className)}
            error={error}
            value={value}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:text-gray-700"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {helperText && !error && !showStrengthMeter && !showRequirements && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}

        {showStrengthMeter && password && !error && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Password strength:</span>
              <span className={cn(
                'font-medium',
                strength.score <= 2 ? 'text-red-600' : strength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
              )}>
                {strength.label}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', strength.color)}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>
          </div>
        )}

        {showRequirements && password && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <p className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</p>
            <ul className="space-y-1.5">
              {requirements.map((req, index) => (
                <li
                  key={index}
                  className={cn(
                    'flex items-center gap-2 text-xs transition-colors',
                    req.met ? 'text-green-600' : 'text-gray-600'
                  )}
                >
                  <span className="flex-shrink-0">
                    {req.met ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    )}
                  </span>
                  <span>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
