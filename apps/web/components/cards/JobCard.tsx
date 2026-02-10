"use client";

import React from "react";
import Image from "next/image";
import { MapPin, Clock } from "lucide-react";

interface JobCardProps {
  id: string;
  imageUrl: string;
  imageAlt?: string;
  title: string;
  location: string;
  distance?: string;
  budgetMin: number;
  budgetMax: number;
  currency?: string;
  postedTime: string;
  status: "open" | "in_progress" | "closed" | "pending";
  homeownerName: string;
  homeownerAvatarUrl: string;
  onClick?: (id: string) => void;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  id,
  imageUrl,
  imageAlt = "Job image",
  title,
  location,
  distance,
  budgetMin,
  budgetMax,
  currency = "£",
  postedTime,
  status,
  homeownerName,
  homeownerAvatarUrl,
  onClick,
  className = "",
}) => {
  const handleCardClick = () => {
    onClick?.(id);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return {
          label: "Open",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
        };
      case "closed":
        return {
          label: "Closed",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
        };
      case "pending":
        return {
          label: "Pending",
          bgColor: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
        };
      default:
        return {
          label: "Unknown",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div
      className={`bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`View job: ${title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      {/* Job Image */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Job Title */}
        <h3 className="font-medium text-gray-900 text-lg mb-3 line-clamp-2">
          {title}
        </h3>

        {/* Location and Distance */}
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{location}</span>
          {distance && (
            <>
              <span className="text-gray-400">•</span>
              <span className="flex-shrink-0">{distance}</span>
            </>
          )}
        </div>

        {/* Budget Range */}
        <div className="mb-3">
          <span className="text-sm text-gray-600">Budget: </span>
          <span className="text-lg font-medium text-gray-900">
            {currency}{budgetMin.toLocaleString()} - {currency}
            {budgetMax.toLocaleString()}
          </span>
        </div>

        {/* Posted Time */}
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
          <Clock className="w-4 h-4" />
          <span>Posted {postedTime}</span>
        </div>

        {/* Homeowner Info */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100">
                <Image
                  src={homeownerAvatarUrl}
                  alt={`${homeownerName}'s avatar`}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {homeownerName}
                </p>
                <p className="text-xs text-gray-500">Homeowner</p>
              </div>
            </div>

            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors duration-200"
            >
              View details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
