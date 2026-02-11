'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { FormField, ValidatedInput, ValidatedTextarea, ValidatedSelect } from '@/components/ui/FormField';
import { useCSRF } from '@/lib/hooks/useCSRF';

type Category = 'general' | 'technical' | 'billing' | 'partnerships' | 'press' | 'feedback';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  category: Category;
  message: string;
  consent: boolean;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  category: 'general',
  message: '',
  consent: false,
};

const VALIDATED_FIELDS = ['name', 'email', 'subject', 'message', 'phone', 'consent'] as const;

function validateField(field: string, value: string | boolean): string | undefined {
  switch (field) {
    case 'name':
      if (typeof value === 'string' && !value.trim()) return 'Name is required';
      if (typeof value === 'string' && value.trim().length < 2) return 'Name must be at least 2 characters';
      return undefined;
    case 'email':
      if (typeof value === 'string' && !value.trim()) return 'Email is required';
      if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
      return undefined;
    case 'subject':
      if (typeof value === 'string' && !value.trim()) return 'Subject is required';
      if (typeof value === 'string' && value.trim().length < 5) return 'Subject must be at least 5 characters';
      return undefined;
    case 'message':
      if (typeof value === 'string' && !value.trim()) return 'Message is required';
      if (typeof value === 'string' && value.trim().length < 10) return 'Message must be at least 10 characters';
      return undefined;
    case 'phone':
      if (typeof value === 'string' && value && !/^\+?[\d\s-()]+$/.test(value)) return 'Please enter a valid phone number';
      return undefined;
    case 'consent':
      if (value !== true) return 'You must agree to the Privacy Policy to submit this form';
      return undefined;
    default:
      return undefined;
  }
}

export default function ContactForm() {
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: decodeURIComponent(subjectParam.replace(/\+/g, ' ')),
      }));
    }
  }, [searchParams]);

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof FormData]);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field] = error;
        } else {
          delete newErrors[field];
        }
        return newErrors;
      });
    }
  };

  const isFieldValid = (field: string): boolean => {
    return touchedFields[field] && !errors[field] && Boolean(formData[field as keyof FormData]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setTouchedFields({
      name: true,
      email: true,
      subject: true,
      message: true,
      phone: true,
      consent: true,
    });

    const newErrors: Record<string, string> = {};
    VALIDATED_FIELDS.forEach(field => {
      const error = validateField(field, formData[field as keyof FormData]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(`Please fix ${Object.keys(newErrors).length} validation error${Object.keys(newErrors).length > 1 ? 's' : ''}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject || 'Contact Form Submission',
          category: formData.category,
          message: formData.message,
          consent: formData.consent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Message sent successfully! We\'ll get back to you soon.');
        setFormData(INITIAL_FORM_DATA);
        setErrors({});
        setTouchedFields({});
      } else {
        if (response.status === 429) {
          toast.error('Too many requests. Please try again later.');
        } else if (response.status === 403) {
          toast.error('Security validation failed. Please refresh the page and try again.');
        } else if (result.details) {
          const fieldErrors = result.details;
          Object.keys(fieldErrors).forEach(field => {
            if (fieldErrors[field] && fieldErrors[field].length > 0) {
              toast.error(`${field}: ${fieldErrors[field][0]}`);
            }
          });
        } else {
          toast.error(result.error || 'Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      logger.error('Contact form submission error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-16">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-10"
      >
        <div className="text-center mb-8">
          <MessageSquare className="w-12 h-12 text-teal-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
          <p className="text-gray-600">We'll get back to you within 24 hours</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <FormField
              label="Your Name"
              required
              error={touchedFields.name ? errors.name : undefined}
              success={isFieldValid('name')}
              helperText={isFieldValid('name') ? 'Perfect!' : 'Enter your full name'}
              htmlFor="contact-name"
            >
              <ValidatedInput
                id="contact-name"
                type="text"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                placeholder="John Smith"
                error={Boolean(touchedFields.name && errors.name)}
                success={isFieldValid('name')}
              />
            </FormField>

            <FormField
              label="Email Address"
              required
              error={touchedFields.email ? errors.email : undefined}
              success={isFieldValid('email')}
              helperText={isFieldValid('email') ? 'Email verified' : 'We\'ll respond to this email'}
              htmlFor="contact-email"
            >
              <ValidatedInput
                id="contact-email"
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="john@example.com"
                error={Boolean(touchedFields.email && errors.email)}
                success={isFieldValid('email')}
              />
            </FormField>

            <FormField
              label="Phone Number"
              error={touchedFields.phone ? errors.phone : undefined}
              success={isFieldValid('phone')}
              helperText="Optional - for urgent matters"
              htmlFor="contact-phone"
            >
              <ValidatedInput
                id="contact-phone"
                type="tel"
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                placeholder="+44 7700 900000"
                error={Boolean(touchedFields.phone && errors.phone)}
                success={isFieldValid('phone')}
              />
            </FormField>

            <FormField
              label="Subject"
              required
              error={touchedFields.subject ? errors.subject : undefined}
              success={isFieldValid('subject')}
              helperText={isFieldValid('subject') ? 'Subject specified' : 'Brief description of your inquiry'}
              htmlFor="contact-subject"
            >
              <ValidatedInput
                id="contact-subject"
                type="text"
                value={formData.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('subject', e.target.value)}
                onBlur={() => handleFieldBlur('subject')}
                placeholder="e.g., Need help with my account"
                error={Boolean(touchedFields.subject && errors.subject)}
                success={isFieldValid('subject')}
              />
            </FormField>

            <FormField
              label="Category"
              helperText="Help us route your message"
              htmlFor="contact-category"
            >
              <ValidatedSelect
                id="contact-category"
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value as Category })}
              >
                <option value="general">General Enquiry</option>
                <option value="technical">Technical Support</option>
                <option value="billing">Billing & Payments</option>
                <option value="partnerships">Partnership Opportunities</option>
                <option value="press">Press & Media</option>
                <option value="feedback">Feedback & Suggestions</option>
              </ValidatedSelect>
            </FormField>
          </div>

          <FormField
            label="Message"
            required
            error={touchedFields.message ? errors.message : undefined}
            success={isFieldValid('message')}
            helperText={isFieldValid('message') ? 'Message looks great!' : 'Tell us how we can help (minimum 10 characters)'}
            htmlFor="contact-message"
          >
            <ValidatedTextarea
              id="contact-message"
              value={formData.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('message', e.target.value)}
              onBlur={() => handleFieldBlur('message')}
              placeholder="Tell us how we can help..."
              rows={6}
              error={Boolean(touchedFields.message && errors.message)}
              success={isFieldValid('message')}
            />
          </FormField>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="contact-consent"
              checked={formData.consent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('consent', e.target.checked)}
              onBlur={() => handleFieldBlur('consent')}
              className={`mt-1 h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 ${
                touchedFields.consent && errors.consent ? 'border-red-500' : ''
              }`}
            />
            <label htmlFor="contact-consent" className="text-sm text-gray-700">
              I agree to the{' '}
              <Link href="/privacy" className="text-teal-600 hover:text-teal-700 underline">
                Privacy Policy
              </Link>{' '}
              and consent to Mintenance processing my personal data for the purpose of handling this inquiry.
              {touchedFields.consent && errors.consent && (
                <span className="block text-red-500 text-xs mt-1">{errors.consent}</span>
              )}
            </label>
          </div>

          <MotionButton
            type="submit"
            disabled={isSubmitting || csrfLoading}
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            className={`w-full px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg ${
              isSubmitting || csrfLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-teal-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </MotionButton>
        </form>
      </MotionDiv>
    </div>
  );
}
