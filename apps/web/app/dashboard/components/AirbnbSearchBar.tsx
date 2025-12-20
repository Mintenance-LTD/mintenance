'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  Home,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Briefcase,
  Plus,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  photos?: string[];
  property_type?: string;
}

interface AirbnbSearchBarProps {
  properties: Property[];
  onQuickJobPost?: (data: any) => void;
}

type SearchMode = 'where' | 'when' | 'what' | null;
type DateMode = 'dates' | 'months' | 'flexible';

const jobCategories = [
  { id: 'plumbing', label: 'Plumbing', icon: '🚰' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'carpentry', label: 'Carpentry', icon: '🔨' },
  { id: 'painting', label: 'Painting', icon: '🎨' },
  { id: 'roofing', label: 'Roofing', icon: '🏠' },
  { id: 'landscaping', label: 'Landscaping', icon: '🌿' },
  { id: 'hvac', label: 'HVAC', icon: '❄️' },
  { id: 'general', label: 'General Repair', icon: '🔧' },
];

const urgencyOptions = [
  { value: 'today', label: 'Today', color: 'bg-red-100 text-red-700' },
  { value: 'tomorrow', label: 'Tomorrow', color: 'bg-orange-100 text-orange-700' },
  { value: 'this_week', label: 'This Week', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'flexible', label: 'Flexible', color: 'bg-green-100 text-green-700' },
];

export function AirbnbSearchBar({ properties, onQuickJobPost }: AirbnbSearchBarProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<SearchMode>(null);
  const [dateMode, setDateMode] = useState<DateMode>('dates');

  // Search state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('flexible');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Refs for click outside
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setActiveMode(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!selectedProperty || !selectedCategory) {
      return;
    }

    // Navigate to quick job creation with pre-filled data
    const params = new URLSearchParams({
      property_id: selectedProperty.id,
      category: selectedCategory,
      urgency: selectedUrgency,
    });

    if (selectedDates.start) {
      params.append('start_date', selectedDates.start.toISOString());
    }

    router.push(`/jobs/quick-create?${params.toString()}`);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDateClick = (date: Date) => {
    if (!selectedDates.start || (selectedDates.start && selectedDates.end)) {
      // Start new selection
      setSelectedDates({ start: date, end: null });
    } else if (date < selectedDates.start) {
      // If clicked date is before start, reset with new start
      setSelectedDates({ start: date, end: null });
    } else {
      // Set end date
      setSelectedDates({ ...selectedDates, end: date });
    }
  };

  const isDateInRange = (date: Date) => {
    if (!selectedDates.start || !date) return false;

    if (selectedDates.end) {
      return date >= selectedDates.start && date <= selectedDates.end;
    }

    if (hoveredDate && selectedDates.start && !selectedDates.end) {
      const start = selectedDates.start;
      const end = hoveredDate;
      return date >= start && date <= end;
    }

    return date.getTime() === selectedDates.start.getTime();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date?.toDateString() === today.toDateString();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Main Search Bar */}
      <div className="bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center">
          {/* Where - Property Selection */}
          <button
            onClick={() => setActiveMode('where')}
            className={`flex-1 px-7 py-4 text-left rounded-l-full transition-colors ${
              activeMode === 'where' ? 'bg-white shadow-xl' : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-semibold text-gray-900">Where</div>
            <div className="text-sm text-gray-600 mt-0.5">
              {selectedProperty ? selectedProperty.property_name || selectedProperty.address : 'Select property'}
            </div>
          </button>

          <div className="w-px h-8 bg-gray-300" />

          {/* When - Date Selection */}
          <button
            onClick={() => setActiveMode('when')}
            className={`flex-1 px-7 py-4 text-left transition-colors ${
              activeMode === 'when' ? 'bg-white shadow-xl' : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-semibold text-gray-900">When</div>
            <div className="text-sm text-gray-600 mt-0.5">
              {selectedDates.start ? (
                selectedDates.end ?
                  `${selectedDates.start.toLocaleDateString()} - ${selectedDates.end.toLocaleDateString()}` :
                  selectedDates.start.toLocaleDateString()
              ) : (
                selectedUrgency === 'today' ? 'Today' :
                selectedUrgency === 'tomorrow' ? 'Tomorrow' :
                selectedUrgency === 'this_week' ? 'This Week' :
                'Add dates'
              )}
            </div>
          </button>

          <div className="w-px h-8 bg-gray-300" />

          {/* What - Job Type Selection */}
          <button
            onClick={() => setActiveMode('what')}
            className={`flex-1 px-7 py-4 text-left transition-colors ${
              activeMode === 'what' ? 'bg-white shadow-xl' : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-semibold text-gray-900">What</div>
            <div className="text-sm text-gray-600 mt-0.5">
              {selectedCategory ? jobCategories.find(c => c.id === selectedCategory)?.label : 'Add job type'}
            </div>
          </button>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={!selectedProperty || !selectedCategory}
            className={`m-2 p-3 rounded-full transition-all ${
              selectedProperty && selectedCategory
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dropdown Panels */}
      {activeMode && (
        <div className="absolute top-full mt-3 left-0 right-0 bg-white rounded-3xl shadow-2xl border border-gray-200 z-50 max-w-4xl mx-auto">
          {/* Where Panel - Property Selection */}
          {activeMode === 'where' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Select your property</h3>

              {properties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => {
                        // If clicking on already selected property, just close the dropdown
                        if (selectedProperty?.id === property.id) {
                          setActiveMode(null);
                        } else {
                          // Select the property and optionally move to date selection
                          setSelectedProperty(property);
                          // Only auto-advance to 'when' if no dates are selected yet and urgency is still default
                          if (!selectedDates.start && selectedUrgency === 'flexible') {
                            setActiveMode('when');
                          } else {
                            // Otherwise just close the dropdown
                            setActiveMode(null);
                          }
                        }
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedProperty?.id === property.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {property.photos?.[0] ? (
                          <Image
                            src={property.photos[0]}
                            alt={property.property_name || 'Property'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {property.property_name || 'Unnamed Property'}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{property.address}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {property.property_type && (
                            <div className="text-xs text-gray-500 capitalize">{property.property_type}</div>
                          )}
                          {selectedProperty?.id === property.id && (
                            <div className="text-xs text-teal-600 font-medium">✓ Selected</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No properties found</p>
                  <button
                    onClick={() => router.push('/properties/add')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Property
                  </button>
                </div>
              )}
            </div>
          )}

          {/* When Panel - Calendar */}
          {activeMode === 'when' && (
            <div className="p-6">
              {/* Date Mode Tabs */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setDateMode('dates')}
                  className={`px-6 py-2 rounded-full transition-colors ${
                    dateMode === 'dates'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Dates
                </button>
                <button
                  onClick={() => setDateMode('months')}
                  className={`px-6 py-2 rounded-full transition-colors ${
                    dateMode === 'months'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Months
                </button>
                <button
                  onClick={() => setDateMode('flexible')}
                  className={`px-6 py-2 rounded-full transition-colors ${
                    dateMode === 'flexible'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Flexible
                </button>
              </div>

              {dateMode === 'dates' && (
                <>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Current Month */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h4 className="font-semibold text-gray-900">{formatMonth(currentMonth)}</h4>
                        <div className="w-9" />
                      </div>
                      <div className="grid grid-cols-7 gap-0 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={`${day}-${index}`} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0">
                        {getDaysInMonth(currentMonth).map((date, index) => (
                          <button
                            key={index}
                            onClick={() => date && handleDateClick(date)}
                            onMouseEnter={() => date && setHoveredDate(date)}
                            onMouseLeave={() => setHoveredDate(null)}
                            disabled={!date || (date && date < new Date(new Date().setHours(0, 0, 0, 0)))}
                            className={`
                              aspect-square flex items-center justify-center text-sm transition-colors
                              ${!date ? 'cursor-default' : ''}
                              ${date && date < new Date(new Date().setHours(0, 0, 0, 0)) ? 'text-gray-300 cursor-not-allowed' : ''}
                              ${date && isToday(date) ? 'font-semibold' : ''}
                              ${date && isDateInRange(date) ? 'bg-gray-900 text-white' : ''}
                              ${date && selectedDates.start && date.getTime() === selectedDates.start.getTime() ? 'bg-gray-900 text-white rounded-l-full' : ''}
                              ${date && selectedDates.end && date.getTime() === selectedDates.end.getTime() ? 'bg-gray-900 text-white rounded-r-full' : ''}
                              ${date && !isDateInRange(date) && date >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'hover:border hover:border-gray-300 hover:rounded-full' : ''}
                            `}
                          >
                            {date?.getDate()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Next Month */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-9" />
                        <h4 className="font-semibold text-gray-900">
                          {formatMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        </h4>
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-0 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={`${day}-${index}`} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0">
                        {getDaysInMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)).map((date, index) => (
                          <button
                            key={index}
                            onClick={() => date && handleDateClick(date)}
                            onMouseEnter={() => date && setHoveredDate(date)}
                            onMouseLeave={() => setHoveredDate(null)}
                            disabled={!date || (date && date < new Date(new Date().setHours(0, 0, 0, 0)))}
                            className={`
                              aspect-square flex items-center justify-center text-sm transition-colors
                              ${!date ? 'cursor-default' : ''}
                              ${date && date < new Date(new Date().setHours(0, 0, 0, 0)) ? 'text-gray-300 cursor-not-allowed' : ''}
                              ${date && isToday(date) ? 'font-semibold' : ''}
                              ${date && isDateInRange(date) ? 'bg-gray-900 text-white' : ''}
                              ${date && selectedDates.start && date.getTime() === selectedDates.start.getTime() ? 'bg-gray-900 text-white rounded-l-full' : ''}
                              ${date && selectedDates.end && date.getTime() === selectedDates.end.getTime() ? 'bg-gray-900 text-white rounded-r-full' : ''}
                              ${date && !isDateInRange(date) && date >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'hover:border hover:border-gray-300 hover:rounded-full' : ''}
                            `}
                          >
                            {date?.getDate()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {dateMode === 'flexible' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">How urgent is this job?</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {urgencyOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedUrgency(option.value);
                          setActiveMode('what');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedUrgency === option.value
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 ${option.color}`}>
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.value === 'today' && 'Needs immediate attention'}
                          {option.value === 'tomorrow' && 'Can wait until tomorrow'}
                          {option.value === 'this_week' && 'Sometime this week'}
                          {option.value === 'flexible' && 'No rush, schedule when available'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setSelectedDates({ start: null, end: null });
                    setSelectedUrgency('flexible');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear dates
                </button>
                <button
                  onClick={() => setActiveMode('what')}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* What Panel - Job Type */}
          {activeMode === 'what' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">What type of job do you need?</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {jobCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setActiveMode(null);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedCategory === category.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{category.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end items-center mt-6 pt-6 border-t">
                <button
                  onClick={() => setActiveMode(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}