'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { MapPin, Star, Users } from 'lucide-react';
import { createClient } from '@/lib/api/supabaseClient';

interface NeighborhoodContractor {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  distance: number;
  skills: string[];
  sameDayAvailable: boolean;
}

interface NeighborhoodRecommendationsProps {
  userLocation?: { latitude: number; longitude: number };
  userCity?: string;
}

/**
 * Neighborhood Recommendations Component
 * Shows contractors in the user's local area
 */
export function NeighborhoodRecommendations({ userLocation, userCity }: NeighborhoodRecommendationsProps) {
  const [contractors, setContractors] = useState<NeighborhoodContractor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNeighborhoodContractors = async () => {
      if (!userCity && !userLocation) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        let query = supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            city,
            latitude,
            longitude,
            availability_status,
            contractor_profiles (
              hourly_rate,
              service_radius
            ),
            contractor_skills (
              skill_name
            ),
            reviews (
              rating
            )
          `)
          .eq('role', 'contractor')
          .eq('is_active', true)
          .limit(6);

        if (userCity) {
          query = query.ilike('city', `%${userCity}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching neighborhood contractors:', error);
          setLoading(false);
          return;
        }

        const processedContractors: NeighborhoodContractor[] = (data || [])
          .map((contractor: any) => {
            const reviews = contractor.reviews || [];
            const rating = reviews.length > 0
              ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
              : 0;

            // Calculate distance if location available
            let distance = 0;
            if (userLocation && contractor.latitude && contractor.longitude) {
              const R = 3959; // Earth's radius in miles
              const dLat = (contractor.latitude - userLocation.latitude) * Math.PI / 180;
              const dLon = (contractor.longitude - userLocation.longitude) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLocation.latitude * Math.PI / 180) *
                Math.cos(contractor.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              distance = R * c;
            }

            const availabilityStatus = contractor.availability_status?.toLowerCase() || '';
            const sameDayAvailable = availabilityStatus.includes('same day') ||
                                    availabilityStatus.includes('available now') ||
                                    availabilityStatus.includes('immediate');

            return {
              id: contractor.id,
              name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim(),
              rating,
              reviewCount: reviews.length,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal
              skills: (contractor.contractor_skills || []).slice(0, 3).map((s: any) => s.skill_name),
              sameDayAvailable,
            };
          })
          .filter((c: NeighborhoodContractor) => c.rating > 0 || c.reviewCount > 0)
          .sort((a: NeighborhoodContractor, b: NeighborhoodContractor) => {
            // Sort by rating first, then by distance
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            return a.distance - b.distance;
          })
          .slice(0, 6);

        setContractors(processedContractors);
      } catch (error) {
        console.error('Error processing neighborhood contractors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborhoodContractors();
  }, [userLocation, userCity]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Local Contractors</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (contractors.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Contractors in Your Area
        </CardTitle>
        <CardDescription>
          Highly rated contractors near you {userCity ? `in ${userCity}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map((contractor) => (
            <Link
              key={contractor.id}
              href={`/contractors/${contractor.id}`}
              className="block p-4 border rounded-lg hover:border-secondary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{contractor.name}</h4>
                {contractor.sameDayAvailable && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    Same Day
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold">{contractor.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">
                  ({contractor.reviewCount} {contractor.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              {contractor.distance > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span>{contractor.distance.toFixed(1)} miles away</span>
                </div>
              )}
              {contractor.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {contractor.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link href="/contractors">
            <Button variant="secondary" className="w-full">
              View All Contractors
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

