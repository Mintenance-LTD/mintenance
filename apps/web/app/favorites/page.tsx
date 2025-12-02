'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import {
  Heart,
  Star,
  MapPin,
  Briefcase,
  Trash2,
  MessageCircle,
  FileText,
  User,
  Building2,
  Filter,
  Search,
  CheckCircle,
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

interface FavoriteContractor {
  id: string;
  name: string;
  company: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  location: string;
  specialties: string[];
  verified: boolean;
  responseTime: string;
  addedDate: string;
}

export default function FavoritesPage2025() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'name'>('recent');

  const [favorites, setFavorites] = useState<FavoriteContractor[]>([
    {
      id: '1',
      name: 'John Smith',
      company: 'Smith Construction Ltd',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contractor1',
      rating: 4.8,
      reviewCount: 147,
      completedJobs: 312,
      location: 'London, UK',
      specialties: ['Kitchen Renovation', 'Bathroom Remodeling'],
      verified: true,
      responseTime: '< 2 hours',
      addedDate: '2025-01-15',
    },
    {
      id: '2',
      name: 'Emma Wilson',
      company: 'Wilson Electrical Services',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contractor2',
      rating: 4.9,
      reviewCount: 89,
      completedJobs: 156,
      location: 'Manchester, UK',
      specialties: ['Electrical Work', 'Smart Home Installation'],
      verified: true,
      responseTime: '< 1 hour',
      addedDate: '2025-01-10',
    },
    {
      id: '3',
      name: 'Michael Brown',
      company: 'Brown Plumbing & Heating',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contractor3',
      rating: 4.7,
      reviewCount: 203,
      completedJobs: 428,
      location: 'Birmingham, UK',
      specialties: ['Plumbing', 'Heating Systems'],
      verified: true,
      responseTime: '< 3 hours',
      addedDate: '2024-12-20',
    },
  ]);

  const categories = [
    'all',
    'Kitchen Renovation',
    'Bathroom Remodeling',
    'Electrical Work',
    'Plumbing',
    'Painting',
  ];

  const handleRemoveFavorite = (id: string, name: string) => {
    if (confirm(`Remove ${name} from favorites?`)) {
      setFavorites(favorites.filter((fav) => fav.id !== id));
      toast.success('Removed from favorites');
    }
  };

  const handleContact = (contractor: FavoriteContractor) => {
    router.push(`/messages?contractorId=${contractor.id}`);
  };

  const handleRequestQuote = (contractor: FavoriteContractor) => {
    router.push(`/jobs/create?contractorId=${contractor.id}`);
  };

  const handleViewProfile = (contractorId: string) => {
    router.push(`/contractors/${contractorId}`);
  };

  const filteredFavorites = favorites
    .filter((fav) => {
      const matchesSearch =
        searchQuery === '' ||
        fav.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || fav.specialties.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-10 h-10 fill-white" />
            <h1 className="text-4xl font-bold">Your Favorites</h1>
          </div>
          <p className="text-teal-100 text-lg">
            {favorites.length} contractor{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </MotionDiv>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contractors..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="recent">Recently Added</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </MotionDiv>

        {/* Contractors Grid */}
        {filteredFavorites.length === 0 ? (
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center"
          >
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No favorites found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Start adding contractors to your favorites'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <button
                onClick={() => router.push('/contractors')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Browse Contractors
              </button>
            )}
          </MotionDiv>
        ) : (
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredFavorites.map((contractor) => (
                <MotionDiv
                  key={contractor.id}
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Header */}
                  <div className="relative p-6 bg-gradient-to-br from-teal-50 to-emerald-50">
                    <button
                      onClick={() => handleRemoveFavorite(contractor.id, contractor.name)}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors group"
                    >
                      <Heart className="w-5 h-5 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" />
                    </button>

                    <div className="flex items-start gap-4">
                      <img
                        src={contractor.avatar}
                        alt={contractor.name}
                        className="w-16 h-16 rounded-full border-2 border-white shadow-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {contractor.name}
                          </h3>
                          {contractor.verified && (
                            <CheckCircle className="w-4 h-4 text-teal-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{contractor.company}</p>

                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {contractor.rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-600">
                            ({contractor.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{contractor.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span>{contractor.completedJobs} jobs completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Responds in {contractor.responseTime}</span>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2">
                      {contractor.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    {/* Added Date */}
                    <p className="text-xs text-gray-500">
                      Added {new Date(contractor.addedDate).toLocaleDateString('en-GB')}
                    </p>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleContact(contractor)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact
                      </button>
                      <button
                        onClick={() => handleRequestQuote(contractor)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Quote
                      </button>
                    </div>

                    <button
                      onClick={() => handleViewProfile(contractor.id)}
                      className="w-full px-4 py-2 text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
                    >
                      View Full Profile →
                    </button>
                  </div>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
