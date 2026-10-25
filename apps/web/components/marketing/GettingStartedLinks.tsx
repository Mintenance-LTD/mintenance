import Link from 'next/link';

export function GettingStartedLinks() {
  return (
    <section
      data-theme='mint-editorial'
      className='px-6 py-16 bg-[#f3f7f4] text-[#182e25]'
      aria-labelledby='before-you-join'
    >
      <div className='max-w-6xl mx-auto'>
        <h2 id='before-you-join' className='text-3xl font-semibold mb-3'>
          A few useful things before you join.
        </h2>
        <p className='text-[#4a5751] mb-8 max-w-2xl'>
          Understand the costs, the checks and what happens next. You can read
          these guides without an account.
        </p>
        <div className='grid gap-5 md:grid-cols-3'>
          <Link
            href='/pricing'
            className='rounded-2xl border border-[#d8e2da] bg-white p-6 hover:border-[#2d7061] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
          >
            <h3 className='text-lg font-semibold mb-2'>Plans and fees →</h3>
            <p className='text-sm leading-relaxed text-[#4a5751]'>
              See the available plans and check the costs before choosing.
            </p>
          </Link>
          <Link
            href='/verification'
            className='rounded-2xl border border-[#d8e2da] bg-white p-6 hover:border-[#2d7061] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
          >
            <h3 className='text-lg font-semibold mb-2'>Contractor checks →</h3>
            <p className='text-sm leading-relaxed text-[#4a5751]'>
              Learn what contractors provide and what the review process covers.
            </p>
          </Link>
          <Link
            href='/contact'
            className='rounded-2xl border border-[#d8e2da] bg-white p-6 hover:border-[#2d7061] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
          >
            <h3 className='text-lg font-semibold mb-2'>
              Early access questions →
            </h3>
            <p className='text-sm leading-relaxed text-[#4a5751]'>
              Have an early-access invitation? Ask about your eligibility and
              the terms of your offer. Joining alone does not confirm an award.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
