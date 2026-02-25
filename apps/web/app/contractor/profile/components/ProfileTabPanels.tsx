'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatMoney } from '@/lib/utils/currency';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import {
  Star,
  Shield,
  Briefcase,
  Award,
  TrendingUp,
  Plus,
  Trash2,
  X,
  Upload,
  Edit3,
  Image as ImageIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import type {
  ContractorProfileData,
  ContractorReview,
  ContractorPost,
  ProfileMetrics,
  ProfileFormData,
} from './contractorProfileTypes';

interface ProfileTabPanelsProps {
  activeTab: 'overview' | 'company' | 'services' | 'portfolio' | 'reviews' | 'certifications';
  contractor: ContractorProfileData;
  metrics: ProfileMetrics;
  skills: Array<{ skill_name: string; skill_icon?: string }>;
  currentSkills: Array<{ skill_name: string; skill_icon?: string }>;
  reviews: ContractorReview[];
  posts: ContractorPost[];
  isEditMode: boolean;
  formData: ProfileFormData;
  onFormChange: (data: ProfileFormData) => void;
  onRemoveSkill: (index: number) => void;
  onAddSkillClick: () => void;
  onAddPortfolioClick: () => void;
  showAddPortfolioModal: boolean;
  onClosePortfolioModal: () => void;
  onAddPortfolioSubmit: () => void;
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`w-4 h-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

export function ProfileTabPanels({
  activeTab,
  contractor,
  metrics,
  skills,
  currentSkills,
  reviews,
  posts,
  isEditMode,
  formData,
  onFormChange,
  onRemoveSkill,
  onAddSkillClick,
  onAddPortfolioClick,
  showAddPortfolioModal,
  onClosePortfolioModal,
  onAddPortfolioSubmit,
}: ProfileTabPanelsProps) {
  return (
    <>
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About Me</h2>
              {isEditMode ? (
                <textarea value={formData.bio} onChange={(e) => onFormChange({ ...formData, bio: e.target.value })} placeholder="Tell clients about yourself..." rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              ) : (
                <p className="text-gray-700 leading-relaxed">{formData.bio || contractor.bio || 'No bio provided yet. Click Edit profile to add information about yourself.'}</p>
              )}
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 justify-center"><TrendingUp className="w-5 h-5 text-teal-600" /><p className="text-gray-600 text-sm font-medium">Win Rate</p></div>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.winRate}%</p>
                </div>
                <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 justify-center"><Briefcase className="w-5 h-5 text-blue-600" /><p className="text-gray-600 text-sm font-medium">Total Bids</p></div>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalBids}</p>
                </div>
                <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 justify-center"><Star className="w-5 h-5 text-amber-600" /><p className="text-gray-600 text-sm font-medium">Avg Rating</p></div>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}</p>
                </div>
                <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 justify-center"><Award className="w-5 h-5 text-emerald-600" /><p className="text-gray-600 text-sm font-medium">Earnings</p></div>
                  <p className="text-2xl font-semibold text-gray-900">{formatMoney(metrics.totalEarnings)}</p>
                </div>
              </div>
            </MotionDiv>
            {contractor.admin_verified && (
              <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Verified Information</h2>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg"><Shield className="w-5 h-5 text-teal-600" /><span className="font-medium text-teal-900">Admin Verified</span></div>
                  {contractor.license_number && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg"><Award className="w-5 h-5 text-blue-600" /><span className="font-medium text-blue-900">Licensed Contractor</span><span className="text-sm text-blue-700">#{contractor.license_number}</span></div>
                  )}
                </div>
              </MotionDiv>
            )}
          </>
        )}

        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 mb-1">Company Information</h2><p className="text-sm text-gray-600">Manage your company details and business information</p></div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company Name</label>
                {isEditMode ? (
                  <input type="text" value={formData.company_name} onChange={(e) => onFormChange({ ...formData, company_name: e.target.value })} placeholder="Enter your company name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">{contractor.company_name || 'No company name set'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Contact Information</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"><Mail className="w-5 h-5 text-gray-600" /><span className="text-gray-900">{contractor.email}</span></div>
                  {contractor.phone && (<div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"><Phone className="w-5 h-5 text-gray-600" /><span className="text-gray-900">{contractor.phone}</span></div>)}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"><MapPin className="w-5 h-5 text-gray-600" /><span className="text-gray-900">{contractor.city || 'City not set'}, {contractor.country || 'Country not set'}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Business Details</label>
                <div className="space-y-3">
                  {contractor.license_number && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"><Shield className="w-5 h-5 text-gray-600" /><div><span className="text-sm text-gray-600">Licence Number:</span><span className="ml-2 text-gray-900 font-medium">{contractor.license_number}</span></div></div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"><Calendar className="w-5 h-5 text-gray-600" /><div><span className="text-sm text-gray-600">Member Since:</span><span className="ml-2 text-gray-900 font-medium">{contractor.created_at ? new Date(contractor.created_at).getFullYear() : 'N/A'}</span></div></div>
                </div>
              </div>
              {!isEditMode && (
                <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg"><p className="text-sm text-teal-800">Click &quot;Edit profile&quot; above to update your company information.</p></div>
              )}
            </div>
          </MotionDiv>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-lg font-semibold text-gray-900">Skills & Expertise</h2><p className="text-sm text-gray-600 mt-1">Services you offer to clients</p></div>
              {isEditMode && (<button onClick={onAddSkillClick} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add skill</button>)}
            </div>
            {skills.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl"><Award className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-600 mb-2">No skills added yet</p><p className="text-sm text-gray-500">Add skills to showcase your expertise</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentSkills.map((skill, index) => (
                  <div key={index} className="group relative flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all">
                    {skill.skill_icon && <span className="text-lg">{skill.skill_icon}</span>}
                    <span className="font-medium text-gray-900 text-sm">{skill.skill_name}</span>
                    {isEditMode && (<button onClick={() => onRemoveSkill(index)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-all"><X className="w-3 h-3 text-white" /></button>)}
                  </div>
                ))}
              </div>
            )}
          </MotionDiv>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-lg font-semibold text-gray-900">Portfolio</h2><p className="text-sm text-gray-600 mt-1">Showcase your best work</p></div>
              {isEditMode && (<button onClick={onAddPortfolioClick} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add project</button>)}
            </div>
            {posts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-700 mb-2 text-lg font-medium">No portfolio items yet</p><p className="text-gray-500 mb-6">Start building your portfolio to attract more clients</p>
                {isEditMode && (<button onClick={onAddPortfolioClick} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 inline-flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add first project</button>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => (
                  <MotionDiv key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }} className="group relative rounded-xl overflow-hidden hover:shadow-xl transition-all bg-white border border-gray-200">
                    <div className="relative h-56 bg-slate-100 overflow-hidden">
                      {post.media_urls && post.media_urls[0] ? (
                        <img src={post.media_urls[0]} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-slate-300" /></div>)}
                      {isEditMode && (
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-3">
                            <button className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg"><Edit3 className="w-4 h-4 text-teal-600" /></button>
                            <button className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-1">{post.title}</h3>
                      {post.help_category && (<span className="inline-block px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg mb-2">{post.help_category}</span>)}
                      {post.content && (<p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>)}
                    </div>
                  </MotionDiv>
                ))}
                {isEditMode && (
                  <MotionButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onAddPortfolioClick} className="h-full min-h-[320px] border-2 border-dashed border-teal-300 rounded-xl bg-teal-50 hover:bg-teal-100 transition-all flex flex-col items-center justify-center gap-4 text-teal-700">
                    <div className="w-16 h-16 rounded-xl bg-teal-200 flex items-center justify-center"><Plus className="w-8 h-8 text-teal-700" /></div>
                    <span className="text-base font-semibold">Add new project</span>
                  </MotionButton>
                )}
              </div>
            )}
          </MotionDiv>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Reviews ({metrics.totalReviews})</h2>
              <div className="flex items-center gap-4 mt-3">{renderStars(Math.round(metrics.averageRating))}<span className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}</span><span className="text-gray-600">out of 5</span></div>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl"><Star className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-700 text-lg font-medium">No reviews yet</p><p className="text-gray-500 mt-2">Complete jobs to start receiving reviews</p></div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review, index) => (
                  <MotionDiv key={review.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="pb-6 border-b border-slate-200 last:border-0">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        {review.reviewer?.profile_image_url ? (
                          <img src={review.reviewer.profile_image_url} alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`} className="w-full h-full rounded-xl object-cover" />
                        ) : (<span className="text-white font-bold text-lg">{review.reviewer?.first_name?.charAt(0).toUpperCase() || '?'}</span>)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}`.trim() : 'Anonymous'}</h4>
                            <span className="text-sm text-slate-500">{new Date(review.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                        {renderStars(review.rating)}
                        {review.job && (<div className="mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg">{review.job.title}</div>)}
                        <p className="text-slate-700 mt-3 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            )}
          </MotionDiv>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-lg font-semibold text-gray-900">Certifications & Licences</h2><p className="text-sm text-gray-600 mt-1">Professional credentials and qualifications</p></div>
              {isEditMode && (<button className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add certification</button>)}
            </div>
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl"><Award className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-700 mb-2">No certifications added yet</p><p className="text-sm text-gray-500">Add your professional certifications to build trust</p></div>
          </MotionDiv>
        )}
      </div>

      {/* Add Portfolio Modal */}
      <AnimatePresence>
        {showAddPortfolioModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Add Portfolio Project</h3>
                  <button onClick={onClosePortfolioModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-900 mb-2">Project Title</label><input type="text" placeholder="e.g., Modern Kitchen Renovation" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" /></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"><option>Kitchen</option><option>Bathroom</option><option>Plumbing</option><option>Electrical</option><option>General</option></select>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-900 mb-2">Description</label><textarea rows={4} placeholder="Describe the project, challenges, and results..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" /></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Project Images</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer"><Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 mb-2">Click to upload or drag and drop</p><p className="text-sm text-gray-500">PNG, JPG up to 10MB</p></div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={onAddPortfolioSubmit} className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">Add Project</button>
                    <button onClick={onClosePortfolioModal} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
