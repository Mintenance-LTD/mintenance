import { CheckCircle2 } from 'lucide-react';

/**
 * Technology & Innovation Section
 */
export function TechnologySection() {
  const advantages = [
    {
      title: 'AI-Powered Matching',
      description: 'Our machine learning algorithms analyse job requirements and tradesperson skills to create perfect matches.',
    },
    {
      title: 'Offline-First Architecture',
      description: 'The UK\'s first marketplace platform that works seamlessly even without internet connectivity.',
    },
    {
      title: 'Secure Payment Processing',
      description: 'Bank-level encryption and escrow protection for every transaction.',
    },
    {
      title: 'Real-Time Communication',
      description: 'Instant messaging and notifications keep everyone connected throughout the project.',
    },
    {
      title: 'Smart Job Analysis',
      description: 'Our AI automatically categorises jobs, suggests budgets, and estimates timelines.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="technology-heading">
      <div className="max-w-4xl mx-auto">
        <h2 id="technology-heading" className="text-4xl font-bold text-primary mb-8 text-center">Technology & Innovation</h2>
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            At Mintenance, we believe technology should make life easier, not more complicated. That's why we've invested heavily
            in building a platform that's both powerful and intuitive.
          </p>
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
            <h3 className="text-2xl font-semibold text-primary mb-4">Our Technical Advantages</h3>
            <ul className="space-y-3 text-gray-700" role="list">
              {advantages.map((advantage) => (
                <li key={advantage.title} className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-secondary mr-3 mt-1 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>{advantage.title}:</strong> {advantage.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

