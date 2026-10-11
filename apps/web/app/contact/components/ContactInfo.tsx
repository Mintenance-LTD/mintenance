import { Mail, MapPin, ArrowUpRight } from 'lucide-react';
export default function ContactInfo() {
  return (
    <section
      className='grid gap-5 md:grid-cols-2 mb-12'
      aria-label='Contact details'
    >
      <a
        href='mailto:support@mintenance.co.uk'
        className='rounded-3xl border border-[#d7e4dc] bg-white p-8 hover:border-[#2d7667] transition-colors'
      >
        <Mail className='text-[#2d7667] mb-5' />
        <h2 className='text-2xl font-semibold'>Talk to our team</h2>
        <p className='mt-3 text-[#50645a]'>
          For help with a job, your account, or a payment.
        </p>
        <p className='mt-5 font-semibold text-[#286858] break-all'>
          support@mintenance.co.uk <ArrowUpRight className='inline size-4' />
        </p>
      </a>
      <div className='rounded-3xl border border-[#d7e4dc] bg-white p-8'>
        <MapPin className='text-[#2d7667] mb-5' />
        <h2 className='text-2xl font-semibold'>Registered office</h2>
        <p className='mt-3 text-[#50645a]'>
          Mintenance Ltd
          <br />
          Suite 2 J2 Business Park, Bridge Hall Lane
          <br />
          Bury, England, BL9 7NY
        </p>
        <p className='mt-5 text-sm text-[#50645a]'>
          For correspondence. Please contact support online for assistance.
        </p>
      </div>
    </section>
  );
}
