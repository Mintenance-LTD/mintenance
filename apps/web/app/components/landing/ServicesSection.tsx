import Image from 'next/image';
import Link from 'next/link';
import { Wrench, Zap, Hammer, Paintbrush, Home, TreePine, Thermometer, Ruler, Grid3x3 } from 'lucide-react';

/**
 * Popular services grid showing 10 service categories
 */
export function ServicesSection() {
  const services = [
    { name: 'Plumbing', color: '#3B82F6', icon: <Wrench className="w-8 h-8" />, slug: 'plumbing' },
    { name: 'Electrical', color: '#F59E0B', icon: <Zap className="w-8 h-8" />, slug: 'electrical' },
    { name: 'Carpentry', color: '#8B4513', icon: <Hammer className="w-8 h-8" />, slug: 'carpentry' },
    { name: 'Painting', color: '#EC4899', icon: <Paintbrush className="w-8 h-8" />, slug: 'painting' },
    { name: 'Roofing', color: '#6B7280', icon: <Home className="w-8 h-8" />, slug: 'roofing' },
    { name: 'Landscaping', color: '#10B981', icon: <TreePine className="w-8 h-8" />, slug: 'landscaping' },
    { name: 'Heating & Cooling', color: '#EF4444', icon: <Thermometer className="w-8 h-8" />, slug: 'heating-cooling' },
    { name: 'Flooring', color: '#A855F7', icon: <Ruler className="w-8 h-8" />, slug: 'flooring' },
    { name: 'Tiling', color: '#06B6D4', icon: <Grid3x3 className="w-8 h-8" />, slug: 'tiling' },
    { name: 'General Handyman', color: '#F97316', icon: <Wrench className="w-8 h-8" />, slug: 'handyman' },
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
            <Link
              key={service.name}
              href={`/contractors?search=${encodeURIComponent(service.name)}`}
              className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group"
              aria-label={`Find ${service.name} professionals`}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: service.color + '20', color: service.color }}
              >
                {service.icon}
              </div>
              <h3 className="font-semibold text-primary group-hover:text-secondary transition-colors">{service.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
