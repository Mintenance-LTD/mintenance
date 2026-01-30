/**
 * Shared resource article data for public /resources and contractor /contractor/resources.
 * Serializable for server components.
 */
export interface ResourceArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: number;
  author: string;
  href: string;
}

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    id: '1',
    title: 'Maximize Your Earnings: 10 Proven Strategies for Contractors',
    excerpt:
      'Discover expert tips and strategies to grow your contracting business, increase your revenue, and build lasting relationships with homeowners.',
    category: 'Business Tips',
    readingTime: 5,
    author: 'Contractor Success Team',
    href: '/contractor/resources/maximize-earnings',
  },
  {
    id: '2',
    title: 'How to Write Winning Bids That Get Accepted',
    excerpt: 'Learn the art of crafting compelling bids that stand out and win more projects.',
    category: 'Bidding',
    readingTime: 4,
    author: 'Bid Expert',
    href: '/contractor/resources/winning-bids',
  },
  {
    id: '3',
    title: 'Customer Communication Best Practices',
    excerpt: 'Master professional communication to keep clients happy and projects running smoothly.',
    category: 'Communication',
    readingTime: 6,
    author: 'Communication Coach',
    href: '/contractor/resources/customer-communication',
  },
  {
    id: '4',
    title: 'Pricing Strategies for Maximum Profit',
    excerpt: 'Discover how to price your services competitively while maximizing your profit margins.',
    category: 'Finance',
    readingTime: 7,
    author: 'Business Advisor',
    href: '/contractor/resources/pricing-strategies',
  },
  {
    id: '5',
    title: 'Building Your Online Presence',
    excerpt: 'Learn how to create a professional online presence that attracts more clients.',
    category: 'Marketing',
    readingTime: 5,
    author: 'Marketing Expert',
    href: '/contractor/resources/online-presence',
  },
  {
    id: '6',
    title: 'Time Management for Contractors',
    excerpt: 'Efficient time management techniques to help you complete more projects.',
    category: 'Productivity',
    readingTime: 4,
    author: 'Productivity Coach',
    href: '/contractor/resources/time-management',
  },
  {
    id: '7',
    title: 'Safety First: Essential Guidelines for Every Job',
    excerpt: 'Comprehensive safety protocols and best practices to keep you and your team safe on every project.',
    category: 'Safety',
    readingTime: 8,
    author: 'Safety Consultant',
    href: '/contractor/resources/safety-guidelines',
  },
  {
    id: '8',
    title: 'Tax Tips for Self-Employed Contractors',
    excerpt: 'Navigate tax season with confidence using these essential tax tips and deductions.',
    category: 'Finance',
    readingTime: 9,
    author: 'Tax Advisor',
    href: '/contractor/resources/tax-tips',
  },
];

export const RESOURCE_CATEGORIES = [
  'All',
  'Business Tips',
  'Bidding',
  'Communication',
  'Finance',
  'Marketing',
  'Productivity',
  'Safety',
];
