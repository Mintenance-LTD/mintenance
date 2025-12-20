import { Zap, Eye } from 'lucide-react';
import { GradientBar } from './GradientBar';

/**
 * Mission & Vision Section
 */
export function MissionVision() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50" aria-labelledby="mission-vision-heading">
      <div className="max-w-7xl mx-auto">
        <h2 id="mission-vision-heading" className="sr-only">Mission & Vision</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Mission */}
          <article className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 group relative overflow-hidden">
            <GradientBar />
            <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center mb-6" aria-hidden="true">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-primary mb-4">Our Mission</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              To empower homeowners and tradespeople through technology, creating a transparent, efficient, and trustworthy marketplace
              that makes home maintenance accessible to everyone whilst supporting skilled professionals in growing their businesses.
            </p>
          </article>

          {/* Vision */}
          <article className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 group relative overflow-hidden">
            <GradientBar />
            <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center mb-6" aria-hidden="true">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-primary mb-4">Our Vision</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              To become the UK's most trusted home services platform, where every homeowner can find the perfect tradesperson for their
              needs, and every skilled professional can build a thriving business doing work they love.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

