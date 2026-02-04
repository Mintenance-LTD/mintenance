export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  views: number;
  featured?: boolean;
  image?: string;
}

export const categories = [
  'all',
  'Home Maintenance',
  'DIY Tips',
  'Contractor Advice',
  'Industry News',
  'Platform Updates',
];

export const blogPosts: BlogPost[] = [
  {
    id: 'POST-001',
    title: '10 Essential Home Maintenance Tasks for Winter',
    excerpt: 'Prepare your home for the cold season with these crucial maintenance tasks that will keep your property safe and energy-efficient.',
    author: 'Sarah Johnson',
    date: '2025-01-28',
    readTime: '5 min read',
    category: 'Home Maintenance',
    tags: ['Winter', 'Maintenance', 'Energy Efficiency'],
    views: 2847,
    featured: true,
  },
  {
    id: 'POST-002',
    title: 'How to Choose the Right Contractor for Your Project',
    excerpt: 'Learn the key factors to consider when selecting a contractor, from verifying credentials to understanding quotes and contracts.',
    author: 'Michael Chen',
    date: '2025-01-25',
    readTime: '7 min read',
    category: 'Contractor Advice',
    tags: ['Contractors', 'Tips', 'Hiring'],
    views: 1923,
  },
  {
    id: 'POST-003',
    title: 'DIY vs Professional: When to Call an Expert',
    excerpt: 'Not every home repair requires a professional. Discover which tasks you can handle yourself and when it\'s time to call in the experts.',
    author: 'Emma Williams',
    date: '2025-01-22',
    readTime: '6 min read',
    category: 'DIY Tips',
    tags: ['DIY', 'Cost Savings', 'Safety'],
    views: 3156,
    featured: true,
  },
  {
    id: 'POST-004',
    title: 'New AI-Powered Matching Feature Launch',
    excerpt: 'We\'re excited to announce our latest feature that uses artificial intelligence to match homeowners with the perfect contractors.',
    author: 'Mintenance Team',
    date: '2025-01-20',
    readTime: '4 min read',
    category: 'Platform Updates',
    tags: ['AI', 'Features', 'Technology'],
    views: 1654,
  },
  {
    id: 'POST-005',
    title: 'Understanding Home Insurance and Contractor Work',
    excerpt: 'What you need to know about insurance coverage when hiring contractors and how to protect yourself from liability.',
    author: 'David Brown',
    date: '2025-01-18',
    readTime: '8 min read',
    category: 'Home Maintenance',
    tags: ['Insurance', 'Legal', 'Protection'],
    views: 2341,
  },
  {
    id: 'POST-006',
    title: 'Bathroom Renovation on a Budget: Pro Tips',
    excerpt: 'Transform your bathroom without breaking the bank. Our expert tips will help you achieve a stunning result within your budget.',
    author: 'Lisa Anderson',
    date: '2025-01-15',
    readTime: '6 min read',
    category: 'DIY Tips',
    tags: ['Bathroom', 'Budget', 'Renovation'],
    views: 4523,
    featured: true,
  },
  {
    id: 'POST-007',
    title: '2025 Home Improvement Trends to Watch',
    excerpt: 'Stay ahead of the curve with these emerging home improvement trends that are shaping the industry this year.',
    author: 'Sarah Johnson',
    date: '2025-01-12',
    readTime: '5 min read',
    category: 'Industry News',
    tags: ['Trends', '2025', 'Design'],
    views: 1876,
  },
  {
    id: 'POST-008',
    title: 'How to Prepare Your Home for a Contractor Visit',
    excerpt: 'Make the most of your contractor\'s time with these preparation tips that ensure a smooth and efficient project.',
    author: 'Michael Chen',
    date: '2025-01-10',
    readTime: '4 min read',
    category: 'Contractor Advice',
    tags: ['Preparation', 'Efficiency', 'Tips'],
    views: 1432,
  },
];
