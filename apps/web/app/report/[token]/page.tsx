import type { Metadata } from 'next';
import { TenantReportForm } from './TenantReportForm';

export const metadata: Metadata = {
  title: 'Report a Maintenance Issue | Mintenance',
  description: 'Report a maintenance issue to your property manager.',
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TenantReportPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple public header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-semibold text-gray-900">Mintenance</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <TenantReportForm token={token} />
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Powered by Mintenance
      </footer>
    </div>
  );
}
