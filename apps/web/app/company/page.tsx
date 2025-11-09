import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { theme } from '@/lib/theme';
import { FeaturedArticle } from '@/app/contractor/dashboard-enhanced/components/FeaturedArticle';

export default function CompanyPage() {
  return (
    <HomeownerLayoutShell currentPath="/company">
      <div style={{ 
        maxWidth: '1440px', 
        margin: '0 auto', 
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header */}
        <div>
          <h1 className="text-heading-md font-[640] text-gray-900 mb-2 tracking-tighter">
            Company
          </h1>
          <p className="text-base font-[460] text-gray-600 leading-normal">
            Staff, field techs, and time tracking will appear here.
          </p>
        </div>

        {/* Business Tips Featured Article */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm group relative overflow-hidden">
              {/* Gradient bar - appears on hover, always visible on large screens */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <h2 className="text-subheading-md font-[560] text-gray-900 mb-6 tracking-normal">
                Business Tips
              </h2>
              <div style={{ minHeight: '400px' }}>
                <FeaturedArticle
                  id="business-tips-featured"
                  title="Maximize Your Earnings: 10 Proven Strategies for Contractors"
                  excerpt="Discover expert tips and strategies to grow your contracting business, increase your revenue, and build lasting relationships with homeowners."
                  coverImage="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzBGMUcyQSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db250cmFjdG9yIFRpcHM8L3RleHQ+PC9zdmc+"
                  author="Contractor Success Team"
                  publishedDate={new Date().toISOString()}
                  category="Business Tips"
                  href="/contractor/resources/maximize-earnings"
                  readingTime={5}
                />
              </div>
            </div>
          </div>

          {/* Placeholder for future company features */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm group relative overflow-hidden">
              {/* Gradient bar - appears on hover, always visible on large screens */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <h3 className="text-lg font-[560] text-gray-900 mb-4 tracking-normal">
                Coming Soon
              </h3>
              <p className="text-sm font-[460] text-gray-600 leading-normal">
                Team management and time tracking features will be available here soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </HomeownerLayoutShell>
  );
}
