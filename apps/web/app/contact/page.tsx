'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MotionButton, MotionDiv, MotionH1, MotionP, MotionA } from '@/components/ui/MotionDiv';
import { FormField, ValidatedInput, ValidatedTextarea, ValidatedSelect } from '@/components/ui/FormField';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { logger } from '@mintenance/shared';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function ContactPageContent() {
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: 'general' as 'general' | 'technical' | 'billing' | 'partnerships' | 'press' | 'feedback',
    message: '',
    consent: false,
  });

  // Pre-fill subject from URL query parameter
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: decodeURIComponent(subjectParam.replace(/\+/g, ' ')),
      }));
    }
  }, [searchParams]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string | boolean): string | undefined => {
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
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
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
    // If field was touched, validate on change for immediate feedback
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
    return touchedFields[field] && !errors[field] && Boolean(formData[field as keyof typeof formData]);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      details: 'support@mintenance.com',
      description: 'We typically respond within 24 hours',
    },
    {
      icon: Phone,
      title: 'Call Us',
      details: '+44 20 1234 5678',
      description: 'Mon-Fri, 9am-6pm GMT',
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      details: '123 Tech Street, London, SW1A 1AA',
      description: 'By appointment only',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Monday - Friday',
      description: '9:00 AM - 6:00 PM GMT',
    },
  ];

  const faqs = [
    {
      question: 'How do I post a job?',
      answer: 'Sign up for a free account, click "Post a Job", fill in the details, and submit. You\'ll start receiving bids from qualified contractors immediately.',
    },
    {
      question: 'How are contractors verified?',
      answer: 'All contractors go through a rigorous verification process including ID checks, license verification, insurance validation, and customer review analysis.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, bank transfers, and digital payment methods. Payments are securely processed through our payment partners.',
    },
    {
      question: 'Is there a fee to use the platform?',
      answer: 'Posting jobs is free for homeowners. Contractors pay a small service fee only when they win a job. See our pricing page for detailed information.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check CSRF token
    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      subject: true,
      message: true,
      phone: true,
      consent: true,
    });

    // Validate all fields
    const newErrors: Record<string, string> = {};
    ['name', 'email', 'subject', 'message', 'phone', 'consent'].forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
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
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          category: 'general',
          message: '',
          consent: false,
        });
        setErrors({});
        setTouchedFields({});
      } else {
        // Handle specific errors
        if (response.status === 429) {
          toast.error('Too many requests. Please try again later.');
        } else if (response.status === 403) {
          toast.error('Security validation failed. Please refresh the page and try again.');
        } else if (result.details) {
          // Show field-specific errors
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
      logger.error('Contact form submission error:', error', [object Object], { service: 'app' });
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <LandingNavigation />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/20 backdrop-blur-sm p-4 rounded-full inline-block mb-6"
            >
              <MessageSquare className="w-12 h-12" />
            </MotionDiv>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              Get in Touch
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto"
            >
              Have questions? We're here to help. Reach out to our team and we'll respond as soon as possible.
            </MotionP>
          </div>
        </div>
      </MotionDiv>

      {/* Main Content - Centered Form Design */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Centered Contact Form (max-width 600px) */}
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
                      onChange={(e) => handleFieldChange('name', e.target.value)}
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
                      onChange={(e) => handleFieldChange('email', e.target.value)}
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
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
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
                      onChange={(e) => handleFieldChange('subject', e.target.value)}
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
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      <option value="general">General Inquiry</option>
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
                    onChange={(e) => handleFieldChange('message', e.target.value)}
                    onBlur={() => handleFieldBlur('message')}
                    placeholder="Tell us how we can help..."
                    rows={6}
                    error={Boolean(touchedFields.message && errors.message)}
                    success={isFieldValid('message')}
                  />
                </FormField>

                {/* GDPR Consent Checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="contact-consent"
                    checked={formData.consent}
                    onChange={(e) => handleFieldChange('consent', e.target.checked)}
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

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="contents"
          >
            {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <MotionDiv
                    key={index}
                    variants={staggerItem}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all text-center"
                  >
                    <div className="bg-teal-100 p-4 rounded-xl inline-block mb-4">
                      <Icon className="w-8 h-8 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{info.title}</h3>
                    <p className="text-teal-600 font-medium mb-1">{info.details}</p>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </MotionDiv>
                );
              })}
            </MotionDiv>
          </div>

        {/* Map Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Find Us</h2>
            <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-teal-600 mx-auto mb-4" />
                <p className="text-gray-900 font-medium text-lg mb-2">Mintenance HQ</p>
                <p className="text-gray-600">123 Tech Street</p>
                <p className="text-gray-600">London, SW1A 1AA</p>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Quick FAQs */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <HelpCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Answers</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Common questions we receive. For more detailed FAQs, visit our help center.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-1" />
                  <h3 className="font-bold text-gray-900">{faq.question}</h3>
                </div>
                <p className="text-gray-600 ml-8">{faq.answer}</p>
              </MotionDiv>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">Need more information?</p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              Visit Full FAQ
            </Link>
          </div>
        </MotionDiv>
      </div>
    </div>
    <Footer2025 />
  </div>
);
}

export default function ContactPage2025() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact form...</p>
        </div>
      </div>
    }>
      <ContactPageContent />
    </Suspense>
  );
}
