import Image from 'next/image';
import { Button } from '@/components/airbnb-system';

export function AppPreviewSection() {
  return (
    <section className='py-20 bg-white'>
      <div className='max-w-7xl mx-auto px-4'>
        <div className='mb-12 text-center'>
          <h2 className='text-3xl md:text-4xl font-bold text-gray-900 mb-2'>
            See the platform in action
          </h2>
          <p className='text-gray-600 text-lg'>
            Everything you need to manage your property maintenance, all in one
            place
          </p>
        </div>

        {/* Phone mockups in a row */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
          {/* Homeowner Dashboard */}
          <div className='text-center'>
            <div className='relative mx-auto w-[260px] h-[520px] rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden'>
              <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-gray-900 rounded-b-2xl z-10' />
              <Image
                src='/screenshots/homeowner-dashboard.png'
                alt='Homeowner dashboard showing active jobs and property overview'
                fill
                className='object-cover object-top'
                sizes='260px'
              />
            </div>
            <h3 className='mt-6 text-lg font-semibold text-gray-900'>
              Homeowner Dashboard
            </h3>
            <p className='text-sm text-gray-600 mt-1'>
              Track jobs, manage properties, and review bids
            </p>
          </div>

          {/* Contractor Jobs */}
          <div className='text-center md:-translate-y-4'>
            <div className='relative mx-auto w-[260px] h-[520px] rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden'>
              <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-gray-900 rounded-b-2xl z-10' />
              <Image
                src='/screenshots/contractor-jobs.png'
                alt='Contractor job management with active and completed work'
                fill
                className='object-cover object-top'
                sizes='260px'
              />
            </div>
            <h3 className='mt-6 text-lg font-semibold text-gray-900'>
              Job Management
            </h3>
            <p className='text-sm text-gray-600 mt-1'>
              Find work, submit bids, and manage your schedule
            </p>
          </div>

          {/* Contractor Dashboard */}
          <div className='text-center'>
            <div className='relative mx-auto w-[260px] h-[520px] rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden'>
              <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[24px] bg-gray-900 rounded-b-2xl z-10' />
              <Image
                src='/screenshots/contractor-dashboard-enhanced.png'
                alt='Contractor business dashboard with earnings and analytics'
                fill
                className='object-cover object-top'
                sizes='260px'
              />
            </div>
            <h3 className='mt-6 text-lg font-semibold text-gray-900'>
              Business Analytics
            </h3>
            <p className='text-sm text-gray-600 mt-1'>
              Revenue tracking, CRM, and performance insights
            </p>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-sm text-gray-500 mb-4'>
            Available on iOS and Android
          </p>
          <div className='flex justify-center gap-4'>
            <Button
              variant='primary'
              size='lg'
              onClick={() => {
                window.location.href = '/register?role=homeowner';
              }}
            >
              Get started free
            </Button>
            <Button
              variant='secondary'
              size='lg'
              onClick={() => {
                window.location.href = '/how-it-works';
              }}
            >
              Learn more
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
