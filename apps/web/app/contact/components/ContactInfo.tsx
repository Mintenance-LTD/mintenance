'use client';

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

export default function ContactInfo() {
  return (
    <>
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
    </>
  );
}
