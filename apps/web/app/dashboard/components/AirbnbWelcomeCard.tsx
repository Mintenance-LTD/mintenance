import React from 'react';
import Link from 'next/link';

interface AirbnbWelcomeCardProps {
  userName: string;
  activeJobsCount: number;
  propertiesCount: number;
}

export function AirbnbWelcomeCard({ userName, activeJobsCount, propertiesCount }: AirbnbWelcomeCardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = userName.split(' ')[0] || userName;

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left Side - Greeting */}
        <div>
          <p className="text-base text-gray-600 mb-1">{getGreeting()},</p>
          <h1 className="text-4xl font-semibold text-gray-900 mb-3">{firstName}</h1>
          <p className="text-base text-gray-700">
            {activeJobsCount > 0
              ? `You have ${activeJobsCount} active ${activeJobsCount === 1 ? 'project' : 'projects'} in progress`
              : 'Ready to start your next project?'}
          </p>
        </div>

        {/* Right Side - Quick Stats */}
        <div className="flex gap-8">
          <Link href="/jobs" className="text-center hover:opacity-70 transition-opacity">
            <div className="text-3xl font-semibold text-gray-900">{activeJobsCount}</div>
            <div className="text-sm text-gray-600 mt-1">Active Jobs</div>
          </Link>
          <Link href="/properties" className="text-center hover:opacity-70 transition-opacity">
            <div className="text-3xl font-semibold text-gray-900">{propertiesCount}</div>
            <div className="text-sm text-gray-600 mt-1">Properties</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
