'use client';

import type React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    details: 'support@mintenance.co.uk',
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

const cardStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  borderRadius: 'var(--me-radius-card)',
  border: '1px solid var(--me-line)',
  boxShadow: 'var(--me-shadow-card)',
};

export default function ContactInfo() {
  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16'>
        <MotionDiv
          variants={staggerContainer}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          className='contents'
        >
          {contactInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <MotionDiv
                key={index}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className='p-6 transition-all text-center'
                style={cardStyle}
              >
                <div
                  className='p-4 rounded-xl inline-block mb-4'
                  style={{ background: 'var(--me-brand-soft)' }}
                >
                  <Icon
                    className='w-8 h-8'
                    style={{ color: 'var(--me-brand)' }}
                  />
                </div>
                <h3
                  className='font-bold mb-2'
                  style={{ color: 'var(--me-ink)' }}
                >
                  {info.title}
                </h3>
                <p
                  className='font-medium mb-1'
                  style={{ color: 'var(--me-brand)' }}
                >
                  {info.details}
                </p>
                <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                  {info.description}
                </p>
              </MotionDiv>
            );
          })}
        </MotionDiv>
      </div>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className='overflow-hidden'
        style={cardStyle}
      >
        <div className='p-8'>
          <h2
            className='text-2xl mb-6 text-center'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--me-ink)',
            }}
          >
            Find Us
          </h2>
          <div
            className='aspect-video rounded-xl flex items-center justify-center'
            style={{ background: 'var(--me-brand-soft)' }}
          >
            <div className='text-center'>
              <MapPin
                className='w-16 h-16 mx-auto mb-4'
                style={{ color: 'var(--me-brand)' }}
              />
              <p
                className='font-medium text-lg mb-2'
                style={{ color: 'var(--me-ink)' }}
              >
                Mintenance HQ
              </p>
              <p style={{ color: 'var(--me-ink-2)' }}>123 Tech Street</p>
              <p style={{ color: 'var(--me-ink-2)' }}>London, SW1A 1AA</p>
            </div>
          </div>
        </div>
      </MotionDiv>
    </>
  );
}
