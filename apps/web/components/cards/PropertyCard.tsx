"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";

interface PropertyCardProps {
  id: string;
  imageUrl: string;
  imageAlt?: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  price: number;
  discountedPrice?: number;
  currency?: string;
  isGuestFavourite?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  imageUrl,
  imageAlt = "Property image",
  title,
  location,
  rating,
  reviewCount,
  price,
  discountedPrice,
  currency = "£",
  isGuestFavourite = false,
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

  return (
    <div
      className={`bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 cursor-pointer group ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      <div className="relative">
        <div className="relative w-full h-64 overflow-hidden rounded-xl">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Heart Icon */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform duration-200 z-10"
          aria-label={localFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-5 h-5 ${
              localFavorited ? "fill-red-500 text-red-500" : "text-gray-700"
            }`}
          />
        </button>

        {/* Guest Favourite Badge */}
        {isGuestFavourite && (
          <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-1 shadow-md">
            <span className="text-sm font-medium text-gray-900">Guest favourite</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-lg line-clamp-1">{title}</h3>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-900"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">({reviewCount})</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-3">{location}</p>

        <div className="flex items-center gap-2">
          {discountedPrice ? (
            <>
              <span className="text-lg font-medium text-gray-900">
                {currency}{discountedPrice}
              </span>
              <span className="text-sm text-gray-500 line-through">
                {currency}{price}
              </span>
            </>
          ) : (
            <span className="text-lg font-medium text-gray-900">
              {currency}{price}
            </span>
          )}
          <span className="text-sm text-gray-600">per night</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
