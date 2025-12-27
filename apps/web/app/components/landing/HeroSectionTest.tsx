/**
 * Simplified HeroSection for testing
 * This is a minimal version to debug the runtime error
 */
export function HeroSectionTest() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-20">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-6">
            Test Hero Section
          </h1>
          <p className="text-xl opacity-90">
            If you can see this, the component is loading correctly.
          </p>
        </div>
      </div>
    </section>
  );
}
