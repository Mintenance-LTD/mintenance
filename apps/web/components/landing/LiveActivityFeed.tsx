'use client';

import { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import { Users, MapPin } from 'lucide-react';

// Fallback activities if no real data is available
const FALLBACK_ACTIVITIES = [
    { name: 'John M.', action: 'hired a plumber', location: 'Manchester', time: '2 min ago' },
    { name: 'Sarah L.', action: 'received 5 quotes', location: 'London', time: '5 min ago' },
    { name: 'Mike P.', action: 'completed a kitchen renovation', location: 'Birmingham', time: '12 min ago' },
    { name: 'Emma D.', action: 'hired an electrician', location: 'Leeds', time: '18 min ago' },
    { name: 'Tom W.', action: 'received 3 quotes', location: 'Bristol', time: '25 min ago' },
    { name: 'Lisa R.', action: 'hired a painter', location: 'Liverpool', time: '32 min ago' },
];

interface Activity {
    name: string;
    action: string;
    location: string;
    time: string;
}

export function LiveActivityFeed() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activeUserCount, setActiveUserCount] = useState(0);
    const [hasRealData, setHasRealData] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchActivities() {
            try {
                const response = await fetch('/api/activity-feed');
                if (!response.ok) {
                    throw new Error('Failed to fetch activities');
                }
                
                const data = await response.json();
                
                // Only use real activities - don't show fallback data
                if (data.activities && data.activities.length > 0) {
                    setActivities(data.activities);
                    setHasRealData(true);
                } else {
                    setActivities([]);
                    setHasRealData(false);
                }
                
                if (data.activeUserCount !== undefined) {
                    setActiveUserCount(data.activeUserCount);
                }
            } catch (error) {
                logger.error('Error fetching activities:', error);
                setActivities([]);
                setHasRealData(false);
            } finally {
                setIsLoading(false);
            }
        }

        fetchActivities();
        
        // Refresh activities every 5 minutes
        const refreshInterval = setInterval(fetchActivities, 5 * 60 * 1000);
        
        return () => clearInterval(refreshInterval);
    }, []);

    useEffect(() => {
        if (activities.length === 0) return;
        
        const interval = setInterval(() => {
            setIsVisible(false);

            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % activities.length);
                setIsVisible(true);
            }, 300);
        }, 4000);

        return () => clearInterval(interval);
    }, [activities.length]);

    // Don't render if no real data
    if (!isLoading && (!hasRealData || activities.length === 0)) {
        return null;
    }

    const activity = activities[currentIndex] || activities[0];
    
    // Safety check: don't render if activity is undefined
    if (!activity) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm hidden lg:block">
            <div
                className={`bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
            >
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {activity.name.charAt(0)}
                        </div>
                        <div className="w-3 h-3 bg-[#10B981] rounded-full border-2 border-white absolute -mt-2 ml-9"></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#0F172A]">{activity.name}</span>
                            <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{activity.action}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {activity.location}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-600">Live</span>
                </div>
            </div>

            {/* Counter */}
            <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
                    <Users className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm font-semibold text-[#0F172A]">
                        {activeUserCount > 0 
                            ? `${activeUserCount} ${activeUserCount === 1 ? 'person' : 'people'} active in your area`
                            : 'No recent activity'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}
