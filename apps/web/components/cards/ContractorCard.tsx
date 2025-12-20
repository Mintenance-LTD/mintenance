"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Heart, ShieldCheck, MapPin } from "lucide-react";

interface ContractorCardProps {
  id: string;
  profilePhotoUrl: string;
  name: string;
  trade: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  currency?: string;
  isVerified?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

export const ContractorCard: React.FC<ContractorCardProps> = ({
  id,
  profilePhotoUrl,
  name,
  trade,
  location,
  rating,
  reviewCount,
  hourlyRate,
  currency = "£",
  isVerified = false,
  isFavorited = false,
  onFavoriteToggle,
  onClick,
  className = "",
}) => {
  const [localFavorited, setLocalFavorited] = useState(isFavorited);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalFavorited(!localFavorited);
    onFavoriteToggle?.(id);
  };

  const handleCardClick = () => {
    onClick?.(id);
  };

  const renderStars = () => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 text-yellow-400 fill-current"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 text-yellow-400"
            viewBox="0 0 20 20"
          >
            <defs>
              <linearGradient id={`half-${id}`}>
                <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${id})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      } else {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 text-gray-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      }
    }

    return stars;
  };

  return (
    <div
      className={`bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      <div className="p-6">
        <div className="relative">
          {/* Profile Photo */}
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-100">
                <Image
                  src={profilePhotoUrl}
                  alt={`${name}'s profile`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-1 ring-2 ring-white">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Heart Icon */}
            <button
              onClick={handleFavoriteClick}
              className="bg-white rounded-full p-2 hover:bg-gray-50 transition-colors duration-200"
              aria-label={localFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                className={`w-5 h-5 ${
                  localFavorited ? "fill-red-500 text-red-500" : "text-gray-400"
                }`}
              />
            </button>
          </div>

          {/* Contractor Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 text-lg">{name}</h3>
              {isVerified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">{trade}</p>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">{renderStars()}</div>
            <span className="text-sm font-medium text-gray-900">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">({reviewCount} reviews)</span>
          </div>

          {/* Pricing */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Starting from</span>
              <span className="text-xl font-medium text-gray-900">
                {currency}{hourlyRate}
                <span className="text-sm text-gray-600 font-normal">/hour</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractorCard;
