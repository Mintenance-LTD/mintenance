// ARCHIVED: Social/portfolio feature - fetches from archived /api/contractor/posts endpoint
// Moved from apps/web/app/contractor/portfolio/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { getCsrfToken } from '@/lib/csrf-client';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Upload,
  CheckCircle,
  Eye,
  Star,
  Calendar,
  MapPin,
  PoundSterling,
  Tag,
  AlertCircle,
  X,
  Filter,
  Grid3x3,
  List,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  completedDate: string;
  cost: number;
  duration: string;
  images: string[];
  featured: boolean;
  verified: boolean;
  rating?: number;
  client?: string;
  tags: string[];
}

interface NewProjectForm {
  title: string;
  description: string;
  category: string;
  cost: string;
}

export default function ContractorPortfolioPage2025() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Portfolio feature is currently unavailable.</p>
      </div>
    </div>
  );
}
