'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Award,
  Briefcase,
  Users,
  Clock,
  DollarSign,
  ThumbsUp,
  MessageCircle,
  Share2,
  Heart,
  Calendar,
  Shield,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  jobType: string;
  helpful: number;
  verified: boolean;
}

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  images: string[];
  description: string;
  completionDate: string;
  cost?: number;
  featured: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  verified: boolean;
}

interface Contractor {
  id: string;
  name: string;
  company: string;
  avatar: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number;
  responseTime: string;
  acceptanceRate: number;
  location: string;
  serviceArea: string[];
  specialties: string[];
  description: string;
  phone: string;
  email: string;
  website?: string;
  verified: boolean;
  premium: boolean;
  joinDate: string;
  stats: {
    onTimeCompletion: number;
    repeatCustomers: number;
    avgProjectValue: number;
  };
}

export default function ContractorPublicProfilePage2025() {
  const params = useParams();
  const router = useRouter();
  const contractorId = params.id as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews' | 'about'>('overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Mock contractor data
  const [contractor] = useState<Contractor>({
    id: contractorId,
    name: 'John Smith',
    company: 'Smith Construction Ltd',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contractor1',
    coverImage: '/images/contractor-cover.jpg',
    rating: 4.8,
    reviewCount: 147,
    completedJobs: 312,
    yearsExperience: 15,
    responseTime: '< 2 hours',
    acceptanceRate: 95,
    location: 'London, UK',
    serviceArea: ['London', 'Surrey', 'Kent', 'Essex'],
    specialties: ['Kitchen Renovation', 'Bathroom Remodeling', 'Electrical Work', 'Plumbing'],
    description: 'Professional contractor with over 15 years of experience in residential and commercial projects. Specializing in high-quality kitchen and bathroom renovations with a focus on customer satisfaction and attention to detail.',
    phone: '+44 7700 900123',
    email: 'john.smith@example.com',
    website: 'www.smithconstruction.co.uk',
    verified: true,
    premium: true,
    joinDate: '2020-03-15',
    stats: {
      onTimeCompletion: 98,
      repeatCustomers: 65,
      avgProjectValue: 8500,
    },
  });

  const [reviews] = useState<Review[]>([
    {
      id: '1',
      author: 'Sarah Johnson',
      rating: 5,
      date: '2025-01-15',
      comment: 'Excellent work on our kitchen renovation. Professional, punctual, and delivered exactly what was promised. Highly recommend!',
      jobType: 'Kitchen Renovation',
      helpful: 12,
      verified: true,
    },
    {
      id: '2',
      author: 'Michael Brown',
      rating: 5,
      date: '2025-01-10',
      comment: 'Outstanding service! Completed our bathroom remodel ahead of schedule and within budget. Very satisfied with the quality of work.',
      jobType: 'Bathroom Remodeling',
      helpful: 8,
      verified: true,
    },
    {
      id: '3',
      author: 'Emily Davis',
      rating: 4,
      date: '2024-12-20',
      comment: 'Great contractor, very professional and skilled. Minor delays due to material availability but kept us informed throughout.',
      jobType: 'Electrical Work',
      helpful: 5,
      verified: true,
    },
  ]);

  const [portfolio] = useState<PortfolioItem[]>([
    {
      id: '1',
      title: 'Modern Kitchen Transformation',
      category: 'Kitchen Renovation',
      images: ['/images/portfolio/kitchen1.jpg', '/images/portfolio/kitchen2.jpg'],
      description: 'Complete kitchen renovation with custom cabinets and granite countertops.',
      completionDate: '2024-12-15',
      cost: 15000,
      featured: true,
    },
    {
      id: '2',
      title: 'Luxury Bathroom Remodel',
      category: 'Bathroom Remodeling',
      images: ['/images/portfolio/bathroom1.jpg'],
      description: 'High-end bathroom renovation with custom tilework and fixtures.',
      completionDate: '2024-11-20',
      cost: 12000,
      featured: true,
    },
    {
      id: '3',
      title: 'Home Electrical Upgrade',
      category: 'Electrical Work',
      images: ['/images/portfolio/electrical1.jpg'],
      description: 'Complete electrical system upgrade for a 4-bedroom home.',
      completionDate: '2024-10-05',
      featured: false,
    },
  ]);

  const [certifications] = useState<Certification[]>([
    {
      id: '1',
      name: 'Gas Safe Registered',
      issuer: 'Gas Safe Register',
      date: '2020-01-15',
      expiryDate: '2026-01-15',
      verified: true,
    },
    {
      id: '2',
      name: 'NICEIC Approved Contractor',
      issuer: 'NICEIC',
      date: '2019-06-01',
      verified: true,
    },
    {
      id: '3',
      name: 'City & Guilds Plumbing',
      issuer: 'City & Guilds',
      date: '2008-09-01',
      verified: true,
    },
  ]);

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard');
  };

  const handleContact = () => {
    setShowContactModal(true);
  };

  const handleRequestQuote = () => {
    router.push(`/jobs/create?contractorId=${contractor.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative -mt-32 bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={contractor.avatar}
                alt={contractor.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
              {contractor.verified && (
                <div className="absolute bottom-0 right-0 bg-teal-600 rounded-full p-2 border-2 border-white">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{contractor.name}</h1>
                    {contractor.premium && (
                      <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-emerald-400 text-white text-xs font-semibold rounded">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-gray-700 mb-3">{contractor.company}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {contractor.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {contractor.yearsExperience} years experience
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {contractor.completedJobs} jobs completed
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold text-gray-900">
                        {contractor.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-gray-600">({contractor.reviewCount} reviews)</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-lg border transition-colors ${
                      isFavorite
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleContact}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </button>
                  <button
                    onClick={handleRequestQuote}
                    className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Request Quote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Stats Cards */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <MotionDiv variants={staggerItem} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Clock className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-xl font-bold text-gray-900">{contractor.responseTime}</p>
              </div>
            </div>
          </MotionDiv>

          <MotionDiv variants={staggerItem} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">On-Time Completion</p>
                <p className="text-xl font-bold text-gray-900">{contractor.stats.onTimeCompletion}%</p>
              </div>
            </div>
          </MotionDiv>

          <MotionDiv variants={staggerItem} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Repeat Customers</p>
                <p className="text-xl font-bold text-gray-900">{contractor.stats.repeatCustomers}%</p>
              </div>
            </div>
          </MotionDiv>

          <MotionDiv variants={staggerItem} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Project Value</p>
                <p className="text-xl font-bold text-gray-900">
                  £{contractor.stats.avgProjectValue.toLocaleString()}
                </p>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {['overview', 'portfolio', 'reviews', 'about'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 border-b-2 font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <MotionDiv
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Specialties */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {contractor.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Service Area */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Area</h3>
                    <div className="flex flex-wrap gap-2">
                      {contractor.serviceArea.map((area, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Certifications & Licenses
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <Shield className="w-5 h-5 text-teal-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{cert.name}</p>
                              {cert.verified && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{cert.issuer}</p>
                            {cert.expiryDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(cert.expiryDate).toLocaleDateString('en-GB')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Reviews */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
                      <button
                        onClick={() => setActiveTab('reviews')}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        View all {contractor.reviewCount} reviews →
                      </button>
                    </div>
                    <div className="space-y-4">
                      {reviews.slice(0, 2).map((review) => (
                        <div
                          key={review.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900">{review.author}</p>
                                {review.verified && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(review.date).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{review.comment}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="px-2 py-1 bg-white rounded border border-gray-200">
                              {review.jobType}
                            </span>
                            <button className="flex items-center gap-1 hover:text-teal-600">
                              <ThumbsUp className="w-3 h-3" />
                              Helpful ({review.helpful})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </MotionDiv>
              )}

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <MotionDiv
                  key="portfolio"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolio.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="relative h-48 bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                          {item.featured && (
                            <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{item.category}</span>
                            <span>
                              {new Date(item.completionDate).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          {item.cost && (
                            <p className="text-sm font-medium text-teal-600 mt-2">
                              £{item.cost.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </MotionDiv>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <MotionDiv
                  key="reviews"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-6 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">{review.author}</p>
                            {review.verified && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.date).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{review.comment}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-white rounded border border-gray-200">
                          {review.jobType}
                        </span>
                        <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          Helpful ({review.helpful})
                        </button>
                      </div>
                    </div>
                  ))}
                </MotionDiv>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <MotionDiv
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
                    <p className="text-gray-700 leading-relaxed">{contractor.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <a href={`tel:${contractor.phone}`} className="hover:text-teal-600">
                          {contractor.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 text-gray-700">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <a href={`mailto:${contractor.email}`} className="hover:text-teal-600">
                          {contractor.email}
                        </a>
                      </div>
                      {contractor.website && (
                        <div className="flex items-center gap-3 text-gray-700">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <a
                            href={`https://${contractor.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-teal-600 flex items-center gap-1"
                          >
                            {contractor.website}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Since</h3>
                    <p className="text-gray-700">
                      {new Date(contractor.joinDate).toLocaleDateString('en-GB', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact {contractor.name}</h3>

            <div className="space-y-4 mb-6">
              <a
                href={`tel:${contractor.phone}`}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Phone className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{contractor.phone}</p>
                </div>
              </a>

              <a
                href={`mailto:${contractor.email}`}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{contractor.email}</p>
                </div>
              </a>

              <button
                onClick={() => {
                  setShowContactModal(false);
                  router.push(`/messages?contractorId=${contractor.id}`);
                }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <p className="text-sm text-gray-600">Message</p>
                  <p className="font-medium text-gray-900">Send a message</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
