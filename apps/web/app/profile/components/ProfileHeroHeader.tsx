'use client';

import React from 'react';
import { User, Mail, Camera, Save, X, Edit, Calendar } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ProfileHeroHeaderProps {
  firstName: string;
  lastName: string;
  email: string;
  joinDate: string;
  profileImageUrl?: string | null;
  isEditing: boolean;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  onAvatarChange: () => void;
}

export function ProfileHeroHeader({
  firstName,
  lastName,
  email,
  joinDate,
  profileImageUrl,
  isEditing,
  onStartEditing,
  onSave,
  onCancel,
  onAvatarChange,
}: ProfileHeroHeaderProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={`${firstName} ${lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                onClick={onAvatarChange}
                className="absolute bottom-0 right-0 bg-white text-teal-600 p-2 rounded-full hover:bg-teal-50 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {firstName} {lastName}
              </h1>
              <div className="flex items-center gap-4 text-teal-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {new Date(joinDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          </div>

          {!isEditing ? (
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartEditing}
              className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Edit Profile
            </MotionButton>
          ) : (
            <div className="flex gap-3">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSave}
                className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </MotionButton>
            </div>
          )}
        </div>
      </div>
    </MotionDiv>
  );
}
