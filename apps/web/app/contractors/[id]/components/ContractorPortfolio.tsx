"use client";

import Image from 'next/image';

interface PortfolioItem {
  id: string; title: string; category: string; images: string[];
  description: string; completionDate: string; cost?: number; featured: boolean;
}

export function ContractorPortfolio({ portfolio }: { portfolio: PortfolioItem[] }) {
  if (!portfolio.length) return null;
  return <section className="border-b border-gray-200 pb-8">
    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Portfolio</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {portfolio.map(item => <article key={item.id} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
        {item.images[0] && <div className="relative aspect-[4/3] bg-gray-100"><Image src={item.images[0]} alt={item.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>}
        <div className="p-4"><h3 className="font-semibold text-lg">{item.title}</h3>
          {item.description && <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{item.description}</p>}
          {item.images.length > 1 && <details className="mt-3"><summary className="cursor-pointer text-teal-700 font-medium">View all {item.images.length} photos</summary>
            <div className="grid grid-cols-2 gap-2 mt-3">{item.images.slice(1).map((url, index) => <div key={url} className="relative aspect-square"><Image src={url} alt={`${item.title}, photo ${index + 2}`} fill sizes="25vw" className="object-cover rounded-lg" /></div>)}</div>
          </details>}
        </div>
      </article>)}
    </div>
  </section>;
}
