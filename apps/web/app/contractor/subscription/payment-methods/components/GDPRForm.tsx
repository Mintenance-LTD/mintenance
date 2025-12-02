'use client';

import React, { useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function GDPRForm() {
  const [consents, setConsents] = useState({
    dataProcessing: false,
    dataSharing: false,
    marketing: false,
  });

  return (
    <StandardCard>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">GDPR Compliance</h3>
        <p className="text-sm text-gray-600">
          Please review and accept the following data processing consents:
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="dataProcessing"
              checked={consents.dataProcessing}
              onCheckedChange={(checked) =>
                setConsents({ ...consents, dataProcessing: checked === true })
              }
            />
            <Label htmlFor="dataProcessing" className="text-sm text-gray-700 cursor-pointer">
              I consent to the processing of my personal data for payment processing purposes.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="dataSharing"
              checked={consents.dataSharing}
              onCheckedChange={(checked) =>
                setConsents({ ...consents, dataSharing: checked === true })
              }
            />
            <Label htmlFor="dataSharing" className="text-sm text-gray-700 cursor-pointer">
              I consent to sharing my payment information with authorized payment processors.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="marketing"
              checked={consents.marketing}
              onCheckedChange={(checked) =>
                setConsents({ ...consents, marketing: checked === true })
              }
            />
            <Label htmlFor="marketing" className="text-sm text-gray-700 cursor-pointer">
              I consent to receiving marketing communications (optional).
            </Label>
          </div>
        </div>
      </div>
    </StandardCard>
  );
}

