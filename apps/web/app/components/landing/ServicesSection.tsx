'use client';

import Image from 'next/image';

/**
 * Popular services grid showing 10 service categories
 */
export function ServicesSection() {
  const services = [
    { name: 'Plumbing', color: '#3B82F6', icon: '🔧' },
    { name: 'Electrical', color: '#F59E0B', icon: '⚡' },
    { name: 'Carpentry', color: '#8B4513', icon: '🪚' },
    { name: 'Painting', color: '#EC4899', icon: '🎨' },
    { name: 'Roofing', color: '#6B7280', icon: '🏠' },
    { name: 'Landscaping', color: '#10B981', icon: '🌳' },
    { name: 'Heating & Cooling', color: '#EF4444', icon: '🌡️' },
    { name: 'Flooring', color: '#A855F7', icon: '📐' },
    { name: 'Tiling', color: '#06B6D4', icon: '🔲' },
    { name: 'General Handyman', color: '#F97316', icon: '🛠️' },
  ];

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image 
              src="/assets/icon.png" 
              alt="Mintenance" 
              width={48} 
              height={48} 
              className="w-12 h-12" 
            />
            <h2 className="text-4xl font-bold text-primary">Popular Services</h2>
          </div>
          <p className="text-xl text-gray-600">
            Find skilled tradespeople for any home project
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {services.map((service) => (
            <div
              key={service.name}
              className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                style={{ backgroundColor: service.color + '20' }}
              >
                {service.icon}
              </div>
              <h3 className="font-semibold text-primary">{service.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
