import { CheckCircle2, Eye, Award, Sparkles, Users, Clock } from 'lucide-react';

/**
 * Our Values Section
 */
export function AboutValues() {
  const values = [
    {
      icon: CheckCircle2,
      title: 'Trust & Safety',
      description: 'We verify all tradespeople, secure all payments, and ensure every job is protected by our guarantee.',
      color: 'secondary',
    },
    {
      icon: Eye,
      title: 'Transparency',
      description: 'Clear pricing, honest reviews, and complete visibility throughout every stage of your project.',
      color: 'accent',
    },
    {
      icon: Award,
      title: 'Quality',
      description: 'We maintain the highest standards for every tradesperson on our platform and every job completed.',
      color: 'purple-500',
    },
    {
      icon: Sparkles,
      title: 'Innovation',
      description: 'Leveraging AI and cutting-edge technology to continuously improve the experience for everyone.',
      color: 'pink-500',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building lasting relationships between homeowners and tradespeople based on mutual respect and success.',
      color: 'cyan-500',
    },
    {
      icon: Clock,
      title: 'Reliability',
      description: 'Consistent, dependable service that works when you need it, even offline in areas with poor connectivity.',
      color: 'red-500',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="values-heading">
      <div className="max-w-7xl mx-auto">
        <h2 id="values-heading" className="text-4xl font-bold text-primary mb-12 text-center">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value) => {
            const Icon = value.icon;
            // Map color values to actual Tailwind classes
            const colorMap: Record<string, { bg: string; text: string }> = {
              'secondary': { bg: 'bg-secondary/10', text: 'text-secondary' },
              'accent': { bg: 'bg-accent/10', text: 'text-accent' },
              'purple-500': { bg: 'bg-purple-500/10', text: 'text-purple-500' },
              'pink-500': { bg: 'bg-pink-500/10', text: 'text-pink-500' },
              'cyan-500': { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
              'red-500': { bg: 'bg-red-500/10', text: 'text-red-500' },
            };
            const colors = colorMap[value.color] || colorMap['secondary'];

            return (
              <article key={value.title} className="text-center">
                <div className={`w-20 h-20 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-4`} aria-hidden="true">
                  <Icon className={`w-10 h-10 ${colors.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

