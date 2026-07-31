'use client';

import {
  Award,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface CertificationStatsProps {
  totalCertifications: number;
  activeCertifications: number;
  expiringSoon: number;
  totalTraining: number;
  totalHours: number;
}

export function CertificationStats({
  totalCertifications,
  activeCertifications,
  expiringSoon,
  totalTraining,
  totalHours,
}: CertificationStatsProps) {
  return (
    <MotionDiv
      variants={staggerContainer}
      initial='hidden'
      animate='visible'
      className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6'
    >
      {[
        {
          icon: Award,
          color: 'emerald',
          label: 'Total Certifications',
          value: totalCertifications,
        },
        {
          icon: CheckCircle,
          color: 'green',
          label: 'Active',
          value: activeCertifications,
        },
        {
          icon: AlertTriangle,
          color: 'yellow',
          label: 'Expiring Soon',
          value: expiringSoon,
        },
        {
          icon: BookOpen,
          color: 'blue',
          label: 'Training Courses',
          value: totalTraining,
        },
        {
          icon: TrendingUp,
          color: 'purple',
          label: 'Training Hours',
          value: `${totalHours}h`,
        },
      ].map((stat) => (
        <MotionDiv
          key={stat.label}
          variants={staggerItem}
          className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
        >
          <div className={`p-3 bg-${stat.color}-100 rounded-lg mb-4 w-fit`}>
            <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
          </div>
          <p className='text-sm text-gray-600 mb-1'>{stat.label}</p>
          <p className='text-2xl font-bold text-gray-900'>{stat.value}</p>
        </MotionDiv>
      ))}
    </MotionDiv>
  );
}
