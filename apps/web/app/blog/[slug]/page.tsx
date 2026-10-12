import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guides } from '../guides';
import { LandingNavigation } from '../../components/landing/LandingNavigation';
import { Footer2025 } from '../../components/landing/Footer2025';
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  return {
    title: guide ? guide.title + ' | Mintenance' : 'Guide not found',
    description: guide?.summary,
  };
}
export default async function Guide({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  if (!g) notFound();
  return (
    <>
      <LandingNavigation />
      <main
        id='main-content'
        className='bg-[#f2f7f3] px-6 py-14 text-[#1b342b]'
      >
        <article className='max-w-3xl mx-auto'>
          <Link href='/blog' className='font-semibold text-[#286858]'>
            ← All guides
          </Link>
          <p className='mt-12 text-sm uppercase tracking-widest text-[#347968]'>
            {g.category}
          </p>
          <h1 className='mt-4 font-semibold'>{g.title}</h1>
          <p className='text-xl text-[#53675d] mt-6 mb-10'>{g.summary}</p>
          <div className='bg-white border border-[#d7e4dc] rounded-3xl p-7 sm:p-12 space-y-10'>
            {g.sections.map(([title, text]) => (
              <section key={title}>
                <h2 className='text-2xl font-semibold'>{title}</h2>
                <p className='mt-4 text-[#53675d]'>{text}</p>
              </section>
            ))}
          </div>
          <p className='mt-10'>
            Need help with a particular job?{' '}
            <Link href='/contact' className='underline font-semibold'>
              Contact our team
            </Link>
            .
          </p>
        </article>
      </main>
      <Footer2025 />
    </>
  );
}
