'use client';

import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { FormField, ValidatedInput } from '@/components/ui/FormField';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  bio: string;
}

interface ProfileInfoTabProps {
  userData: UserData;
  isEditing: boolean;
  errors: Record<string, string>;
  touchedFields: Record<string, boolean>;
  onFieldChange: (field: string, value: string) => void;
  onFieldBlur: (field: string) => void;
  isFieldValid: (field: string) => boolean;
}

export function ProfileInfoTab({
  userData,
  isEditing,
  errors,
  touchedFields,
  onFieldChange,
  onFieldBlur,
  isFieldValid,
}: ProfileInfoTabProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          required
          error={isEditing && touchedFields.firstName ? errors.firstName : undefined}
          success={isFieldValid('firstName')}
          helperText={isFieldValid('firstName') ? 'Looks good!' : undefined}
          htmlFor="profile-firstName"
        >
          <ValidatedInput
            id="profile-firstName"
            type="text"
            value={userData.firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('firstName', e.target.value)}
            onBlur={() => onFieldBlur('firstName')}
            disabled={!isEditing}
            error={Boolean(isEditing && touchedFields.firstName && errors.firstName)}
            success={isFieldValid('firstName')}
          />
        </FormField>

        <FormField
          label="Last Name"
          required
          error={isEditing && touchedFields.lastName ? errors.lastName : undefined}
          success={isFieldValid('lastName')}
          helperText={isFieldValid('lastName') ? 'Looks good!' : undefined}
          htmlFor="profile-lastName"
        >
          <ValidatedInput
            id="profile-lastName"
            type="text"
            value={userData.lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('lastName', e.target.value)}
            onBlur={() => onFieldBlur('lastName')}
            disabled={!isEditing}
            error={Boolean(isEditing && touchedFields.lastName && errors.lastName)}
            success={isFieldValid('lastName')}
          />
        </FormField>

        <FormField
          label="Email"
          required
          error={isEditing && touchedFields.email ? errors.email : undefined}
          success={isFieldValid('email')}
          helperText={isFieldValid('email') ? 'Email verified' : undefined}
          htmlFor="profile-email"
        >
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <ValidatedInput
              id="profile-email"
              type="email"
              value={userData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('email', e.target.value)}
              onBlur={() => onFieldBlur('email')}
              disabled={!isEditing}
              error={Boolean(isEditing && touchedFields.email && errors.email)}
              success={isFieldValid('email')}
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField
          label="Phone"
          required
          error={isEditing && touchedFields.phone ? errors.phone : undefined}
          success={isFieldValid('phone')}
          helperText={isFieldValid('phone') ? 'Phone number verified' : undefined}
          htmlFor="profile-phone"
        >
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <ValidatedInput
              id="profile-phone"
              type="tel"
              value={userData.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('phone', e.target.value)}
              onBlur={() => onFieldBlur('phone')}
              disabled={!isEditing}
              error={Boolean(isEditing && touchedFields.phone && errors.phone)}
              success={isFieldValid('phone')}
              className="pl-10"
            />
          </div>
        </FormField>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={userData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('address', e.target.value)}
              disabled={!isEditing}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={userData.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('city', e.target.value)}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
          <input
            type="text"
            value={userData.postcode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldChange('postcode', e.target.value)}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
          <textarea
            value={userData.bio}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onFieldChange('bio', e.target.value)}
            disabled={!isEditing}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>
    </MotionDiv>
  );
}
