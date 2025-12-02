'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Star,
  Share2,
  Mail,
  MessageCircle,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  Globe,
  Download,
  Copy,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { AreaChart, DonutChart, BarChart } from '@tremor/react';
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

export default function MarketingToolsPage2025() {
  const router = useRouter();

  const profileStats = {
    views: 1847,
    clicks: 342,
    inquiries: 28,
    conversions: 12,
    rating: 4.8,
    reviews: 147,
  };

  const monthlyData = [
    { month: 'Aug', views: 1234, clicks: 245, inquiries: 18 },
    { month: 'Sep', views: 1456, clicks: 289, inquiries: 22 },
    { month: 'Oct', views: 1623, clicks: 312, inquiries: 25 },
    { month: 'Nov', views: 1789, clicks: 335, inquiries: 27 },
    { month: 'Dec', views: 1892, clicks: 356, inquiries: 29 },
    { month: 'Jan', views: 1847, clicks: 342, inquiries: 28 },
  ];

  const sourceData = [
    { source: 'Direct Search', value: 45 },
    { source: 'Social Media', value: 25 },
    { source: 'Referrals', value: 20 },
    { source: 'Website', value: 10 },
  ];

  const socialMediaStats = [
    {
      platform: 'Facebook',
      icon: Facebook,
      followers: 1234,
      engagement: 5.2,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      platform: 'Instagram',
      icon: Instagram,
      followers: 856,
      engagement: 7.8,
      color: 'bg-pink-100 text-pink-600',
    },
    {
      platform: 'LinkedIn',
      icon: Linkedin,
      followers: 423,
      engagement: 3.4,
      color: 'bg-blue-100 text-blue-700',
    },
  ];

  const marketingMaterials = [
    {
      id: '1',
      name: 'Business Card',
      type: 'Print Material',
      status: 'Ready',
      lastUpdated: '2025-01-15',
    },
    {
      id: '2',
      name: 'Company Brochure',
      type: 'Print Material',
      status: 'Ready',
      lastUpdated: '2024-12-10',
    },
    {
      id: '3',
      name: 'Email Signature',
      type: 'Digital Asset',
      status: 'Ready',
      lastUpdated: '2025-01-20',
    },
    {
      id: '4',
      name: 'Social Media Banner',
      type: 'Digital Asset',
      status: 'Draft',
      lastUpdated: '2025-01-25',
    },
  ];

  const handleCopyProfileLink = () => {
    const profileUrl = `https://mintenance.com/contractors/${1234}`;
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied to clipboard');
  };

  const handleDownloadMaterial = (name: string) => {
    toast.success(`Downloading ${name}...`);
  };

  const handleShareProfile = (platform: string) => {
    toast.success(`Opening ${platform} share dialog...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 to-red-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone className="w-10 h-10" />
            <div>
              <h1 className="text-4xl font-bold">Marketing Tools</h1>
              <p className="text-emerald-100 mt-1">
                Grow your business with professional marketing assets
              </p>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Profile Views</p>
            <p className="text-2xl font-bold text-gray-900">
              {profileStats.views.toLocaleString()}
            </p>
            <p className="text-xs text-green-600 mt-1">+12% this month</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MousePointer className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Profile Clicks</p>
            <p className="text-2xl font-bold text-gray-900">
              {profileStats.clicks.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">18.5% click-through rate</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Inquiries</p>
            <p className="text-2xl font-bold text-gray-900">
              {profileStats.inquiries.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">8.2% inquiry rate</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Conversions</p>
            <p className="text-2xl font-bold text-gray-900">
              {profileStats.conversions.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">42.9% conversion rate</p>
          </MotionDiv>
        </MotionDiv>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Trend */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Trend (Last 6 Months)
            </h3>
            <AreaChart
              data={monthlyData}
              index="month"
              categories={['views', 'clicks', 'inquiries']}
              colors={['blue', 'orange', 'green']}
              valueFormatter={(value) => value.toLocaleString()}
              className="h-72"
            />
          </MotionDiv>

          {/* Traffic Sources */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Traffic Sources
            </h3>
            <DonutChart
              data={sourceData}
              category="value"
              index="source"
              valueFormatter={(value) => `${value}%`}
              colors={['blue', 'orange', 'green', 'purple']}
              className="h-72"
            />
          </MotionDiv>
        </div>

        {/* Profile Sharing */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            Share Your Profile
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={`https://mintenance.com/contractors/1234`}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700"
              />
              <button
                onClick={handleCopyProfileLink}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleShareProfile('Facebook')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </button>
              <button
                onClick={() => handleShareProfile('LinkedIn')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </button>
              <button
                onClick={() => handleShareProfile('Instagram')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </button>
              <button
                onClick={() => handleShareProfile('Email')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Social Media Performance */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Social Media Performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {socialMediaStats.map((social) => {
              const Icon = social.icon;
              return (
                <div
                  key={social.platform}
                  className="p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className={`p-3 ${social.color} rounded-lg mb-4 w-fit`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-4">{social.platform}</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Followers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {social.followers.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Engagement Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{social.engagement}%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/contractor/marketing/${social.platform.toLowerCase()}`)}
                    className="w-full mt-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </MotionDiv>

        {/* Marketing Materials */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Marketing Materials
          </h3>

          <div className="space-y-4">
            {marketingMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Globe className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{material.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>{material.type}</span>
                      <span>•</span>
                      <span
                        className={`${
                          material.status === 'Ready'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {material.status}
                      </span>
                      <span>•</span>
                      <span>
                        Updated {new Date(material.lastUpdated).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {material.status === 'Ready' && (
                    <button
                      onClick={() => handleDownloadMaterial(material.name)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/contractor/marketing/materials/${material.id}`)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    {material.status === 'Ready' ? 'Edit' : 'Complete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/contractor/marketing/materials/create')}
            className="w-full mt-6 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors font-medium"
          >
            + Create New Marketing Material
          </button>
        </MotionDiv>
      </div>
    </div>
  );
}
