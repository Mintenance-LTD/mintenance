import React from 'react';
import Image from 'next/image';
import {
  User,
  Phone,
  Mail,
  Shield,
} from 'lucide-react';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

export interface Homeowner {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
}

export interface Contractor {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  admin_verified?: boolean;
  license_number?: string;
}

/* ==========================================
   BADGE COMPONENTS
   ========================================== */

interface StatusBadgeProps {
  status: { label: string; color: string };
  icon: React.ReactNode;
}

export function StatusBadge({ status, icon }: StatusBadgeProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    mint: 'bg-teal-100 text-teal-700 border-teal-200',
    gold: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
        colorClasses[status.color as keyof typeof colorClasses] || colorClasses.gray
      }`}
    >
      {icon}
      {status.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const priorityConfig = {
    low: { label: 'Low Priority', color: 'bg-gray-100 text-gray-700' },
    medium: { label: 'Medium Priority', color: 'bg-blue-100 text-blue-700' },
    high: { label: 'High Priority', color: 'bg-amber-100 text-amber-700' },
    emergency: { label: 'Emergency', color: 'bg-rose-100 text-rose-700' },
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}

/* ==========================================
   LAYOUT COMPONENTS
   ========================================== */

export function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
        {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, {
          className: 'w-5 h-5 text-gray-600',
        }) : icon}
      </div>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

export function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      {children}
    </div>
  );
}

export function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

/* ==========================================
   USER CARD COMPONENT
   ========================================== */

export function UserCard({ user, isContractor = false }: { user: Homeowner | Contractor; isContractor?: boolean }) {
  const name = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : 'company_name' in user && user.company_name
    ? user.company_name
    : user.email;

  const isVerified = isContractor && 'admin_verified' in user && user.admin_verified;

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      {user.profile_image_url ? (
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
          <Image
            src={user.profile_image_url}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
          <User className="w-8 h-8 text-teal-600" />
        </div>
      )}

      {/* Details */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900">{name}</h4>
          {isVerified && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
              <Shield className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>

        {isContractor && 'license_number' in user && user.license_number && (
          <p className="text-sm text-gray-600 mb-2">License: {user.license_number}</p>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${user.email}`} className="hover:text-teal-600 transition-colors">
              {user.email}
            </a>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <a href={`tel:${user.phone}`} className="hover:text-teal-600 transition-colors">
                {user.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */

export function formatDate(dateString: string): string {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);

  // Validate date is not invalid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  // Check if date is in the future (likely data error) - show relative format
  const now = new Date();
  if (date > now) {
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    if (diffInSeconds < 86400) return 'Today';
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days from now`;
    // For far future dates, show the date but indicate it's unusual
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' (future date)';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRelativeDate(dateString: string): string {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);
  const now = new Date();

  // Validate date
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  // For dates older than a week, use absolute format
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // If date is in the future, show relative format anyway
  if (date > now) {
    return `${Math.floor(Math.abs(diffInSeconds) / 86400)} days from now`;
  }

  return formattedDate;
}

export function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
