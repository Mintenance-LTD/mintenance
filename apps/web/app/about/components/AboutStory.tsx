/**
 * Our Story Section
 */
export function AboutStory() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-primary mb-8">Our Story</h2>
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            Founded in 2025, Mintenance was born from a simple observation: finding reliable tradespeople shouldn't be difficult,
            time-consuming, or stressful. Too many homeowners struggled to find trustworthy contractors, whilst skilled tradespeople
            found it challenging to connect with clients who valued their expertise.
          </p>
          <p>
            We set out to solve this problem by creating a platform that benefits both sides of the marketplace. Using cutting-edge
            technology including artificial intelligence and machine learning, we match homeowners with the right tradespeople based
            on skills, location, availability, and budget.
          </p>
          <p>
            Today, Mintenance serves thousands of homeowners and tradespeople across the UK, facilitating tens of thousands of successful
            home maintenance and improvement projects. We're proud to be the UK's first offline-first marketplace platform, ensuring our
            service works even in areas with poor connectivity.
          </p>
        </div>
      </div>
    </section>
  );
}

