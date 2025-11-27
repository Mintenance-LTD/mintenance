'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Settings } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    showSearch?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    userName?: string;
    userAvatar?: string;
    darkBackground?: boolean;
}

export function PageHeader({
    title,
    subtitle,
    actions,
    showSearch = false,
    searchValue = '',
    onSearchChange,
    userName,
    userAvatar,
    darkBackground = false,
}: PageHeaderProps) {
    const router = useRouter();
    
    return (
        <div className={`${darkBackground ? 'bg-[#1e293b] border-[#475569]' : 'bg-white border-gray-200'} border-b px-8 py-4`}>
            <div className="flex items-center justify-between">
                {/* Left: Search (if enabled) */}
                {showSearch && (
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkBackground ? 'text-gray-400' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                                  darkBackground 
                                    ? 'bg-[#334155] border-[#475569] text-white placeholder-gray-400' 
                                    : 'border border-gray-300 bg-white text-gray-900'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Center/Left: Title (if no search) */}
                {!showSearch && (
                    <div>
                        <h1 className={`text-3xl font-bold ${darkBackground ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
                        {subtitle && (
                            <p className={`text-base mt-1 ${darkBackground ? 'text-gray-300' : 'text-gray-500'}`}>{subtitle}</p>
                        )}
                    </div>
                )}

                {/* Right: Icons & Actions */}
                <div className="flex items-center gap-3">
                    <button 
                        className={`p-2 rounded-lg transition-colors ${darkBackground ? 'hover:bg-[#334155]' : 'hover:bg-gray-100'}`}
                        aria-label="Help"
                    >
                        <Icon name="helpCircle" size={20} color={darkBackground ? '#94A3B8' : theme.colors.textSecondary} />
                    </button>
                    <button 
                        className={`p-2 rounded-lg transition-colors relative ${darkBackground ? 'hover:bg-[#334155]' : 'hover:bg-gray-100'}`}
                        aria-label="Notifications"
                    >
                        <Bell className={`w-5 h-5 ${darkBackground ? 'text-gray-300' : 'text-gray-600'}`} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                    {/* User Avatar with Dropdown */}
                    {userName && (
                        <button
                            onClick={() => router.push('/profile')}
                            aria-label="View profile"
                            className={`flex items-center gap-2 h-11 px-2 rounded-lg transition-colors cursor-pointer border-0 bg-transparent ${darkBackground ? 'hover:bg-[#334155]' : 'hover:bg-gray-100'}`}
                        >
                            {userAvatar ? (
                                <img
                                    src={userAvatar}
                                    alt={userName}
                                    className={`w-10 h-10 rounded-full object-cover border-2 ${darkBackground ? 'border-[#475569]' : 'border-gray-200'}`}
                                />
                            ) : (
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm border-2 ${darkBackground ? 'border-[#475569]' : 'border-gray-200'}`}>
                                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                            )}
                            <Icon name="chevronDown" size={16} color={darkBackground ? '#94A3B8' : theme.colors.textSecondary} />
                        </button>
                    )}
                    {actions}
                </div>
            </div>

            {/* Title below search if search is enabled */}
            {showSearch && (
                <div className="mt-4">
                    <h1 className={`text-3xl font-bold ${darkBackground ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
                    {subtitle && (
                        <p className={`text-base mt-1 ${darkBackground ? 'text-gray-300' : 'text-gray-500'}`}>{subtitle}</p>
                    )}
                </div>
            )}
        </div>
    );
}
