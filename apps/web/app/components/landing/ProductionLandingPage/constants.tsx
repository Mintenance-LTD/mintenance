import { Wrench, Home, Zap, Sparkles } from 'lucide-react';
import type { Category } from './types';

export const SERVICES = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
  'HVAC',
  'Flooring',
];

export const CATEGORIES: Category[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: <Wrench className="w-6 h-6" />,
    count: 342,
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: <Zap className="w-6 h-6" />,
    count: 289,
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80',
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: <Home className="w-6 h-6" />,
    count: 256,
    image: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=400&q=80',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: <Sparkles className="w-6 h-6" />,
    count: 412,
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80',
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: <Home className="w-6 h-6" />,
    count: 178,
    image: 'https://images.unsplash.com/photo-1632125098565-8f6e8b7f2d1f?w=400&q=80',
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: <Sparkles className="w-6 h-6" />,
    count: 324,
    image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&q=80',
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: <Zap className="w-6 h-6" />,
    count: 201,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80',
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: <Home className="w-6 h-6" />,
    count: 267,
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&q=80',
  },
];
