'use client';

import React, { useState } from 'react';
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

export default function ContactPage2025() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'general',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return undefined;
      case 'message':
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 10) return 'Message must be at least 10 characters';
        return undefined;
      case 'phone':
        if (value && !/^\+?[\d\s-()]+$/.test(value)) return 'Please enter a valid phone number';
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

  const handleFieldChange = (field: string, value: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      message: true,
      phone: true,
    });

    // Validate all fields
    const newErrors: Record<string, string> = {};
    ['name', 'email', 'message', 'phone'].forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(`Please fix ${Object.keys(newErrors).length} validation error${Object.keys(newErrors).length > 1 ? 's' : ''}`);
      return;
    }

    toast.success('Message sent successfully! We\'ll get back to you soon.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    });
    setErrors({});
    setTouchedFields({});
  };

  return (
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    helperText="Help us route your message"
                    htmlFor="contact-subject"
                  >
                    <ValidatedSelect
                      id="contact-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="contractor">Contractor Account</option>
                      <option value="partnership">Partnership</option>
                      <option value="feedback">Feedback</option>
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

                <MotionButton
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </MotionButton>
              </form>
            </MotionDiv>
          </div>

          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1">
            <MotionDiv
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-6"
            >
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <MotionDiv
                    key={index}
                    variants={staggerItem}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="bg-teal-100 p-3 rounded-lg inline-block mb-4">
                      <Icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{info.title}</h3>
                    <p className="text-teal-600 font-medium mb-1">{info.details}</p>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </MotionDiv>
                );
              })}
            </MotionDiv>
          </div>
        </div>

        {/* FAQ Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <HelpCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find quick answers to common questions. Can't find what you're looking for? Send us a message above.
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
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all"
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
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <MotionA
              href="/help"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              Visit Help Center
            </MotionA>
          </div>
        </MotionDiv>

        {/* Map Placeholder */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Us</h2>
          <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-teal-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Interactive Map</p>
              <p className="text-sm text-gray-500">123 Tech Street, London, SW1A 1AA</p>
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
