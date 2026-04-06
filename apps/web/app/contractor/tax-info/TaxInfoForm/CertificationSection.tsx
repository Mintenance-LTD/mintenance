import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { FormData, FormErrors } from './types';
import { fadeIn } from './types';

interface Props {
  formData: FormData;
  errors: FormErrors;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
}

export function CertificationSection({ formData, errors, updateField, fieldError }: Props) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Certification</h2>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          Under penalties of perjury, I certify that:
        </p>
        <ol className="list-decimal list-inside text-sm text-gray-700 mt-2 space-y-1">
          <li>
            The number shown on this form is my correct taxpayer identification number (or I am waiting for a
            number to be issued to me).
          </li>
          <li>
            I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I
            have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding
            as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I
            am no longer subject to backup withholding.
          </li>
          <li>I am a U.S. citizen or other U.S. person.</li>
          <li>
            The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting
            is correct.
          </li>
        </ol>
      </div>

      <div id="field-certificationAccepted" className="flex items-start gap-3">
        <input
          id="certificationAccepted"
          type="checkbox"
          checked={formData.certificationAccepted}
          onChange={e => updateField('certificationAccepted', e.target.checked)}
          className="mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
          aria-required="true"
          aria-invalid={!!errors.certificationAccepted}
          aria-describedby={errors.certificationAccepted ? 'certificationAccepted-error' : undefined}
        />
        <label htmlFor="certificationAccepted" className="text-sm text-gray-700 cursor-pointer">
          I certify, under penalties of perjury, that the information provided above is true, correct, and
          complete.
          <span className="text-red-500"> *</span>
        </label>
      </div>
      {fieldError('certificationAccepted')}
    </MotionDiv>
  );
}
