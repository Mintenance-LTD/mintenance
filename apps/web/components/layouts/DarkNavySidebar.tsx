'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    Calendar,
    Building2,
    Briefcase,
    MessageSquare,
    User,
    Settings,
    ChevronDown,
    Bell,
    HelpCircle
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    children?: NavItem[];
}

interface DarkNavySidebarProps {
    userInfo?: {
        name: string;
        email: string;
        avatar?: string;
    };
}

export function DarkNavySidebar({ userInfo }: DarkNavySidebarProps) {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const navItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard', icon: Home },
        { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
        {
            label: 'Job Details',
            href: '/jobs',
            icon: Briefcase,
            children: [
                { label: 'All Jobs', href: '/jobs', icon: Briefcase },
                { label: 'Active', href: '/jobs?status=active', icon: Briefcase },
                { label: 'Completed', href: '/jobs?status=completed', icon: Briefcase },
            ]
        },
        { label: 'Jobs', href: '/jobs', icon: Briefcase },
        { label: 'Profiles', href: '/profile', icon: User },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    return (
        <div className="fixed left-0 top-0 h-screen w-[240px] bg-[#1e293b] flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-slate-700">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">M</span>
                    </div>
                    <span className="text-white font-semibold text-lg">Mintenance</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {navItems.map((item) => (
                    <div key={item.label}>
                        {item.children ? (
                            <>
                                <button
                                    onClick={() => toggleExpand(item.label)}
                                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive(item.href)
                                            ? 'text-teal-400 bg-slate-800'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform ${expandedItems.includes(item.label) ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>
                                {expandedItems.includes(item.label) && (
                                    <div className="bg-slate-900">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={`flex items-center gap-3 px-6 pl-14 py-2 text-sm transition-colors ${isActive(child.href)
                                                        ? 'text-teal-400 bg-slate-800'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span>{child.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive(item.href)
                                        ? 'text-teal-400 bg-slate-800'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="flex-1">{item.label}</span>
                                {item.badge && (
                                    <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            {/* User Profile Section */}
            {userInfo && (
                <div className="border-t border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        {userInfo.avatar ? (
                            <img
                                src={userInfo.avatar}
                                alt={userInfo.name}
                                className="w-10 h-10 rounded-full"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                    {userInfo.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                                {userInfo.name}
                            </p>
                            <p className="text-slate-400 text-xs truncate">
                                {userInfo.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Icons */}
            <div className="border-t border-slate-700 p-4 flex items-center justify-around">
                <button className="text-slate-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <HelpCircle className="w-5 h-5" />
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
