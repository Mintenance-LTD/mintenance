import { Building2, MapPin, FileText, Scale } from 'lucide-react';
import { GradientBar } from './GradientBar';

/**
 * Company Information Section
 */
export function CompanyInfo() {
  const companyDetails = [
    {
      icon: Building2,
      label: 'Company Name',
      value: 'MINTENANCE LTD',
    },
    {
      icon: MapPin,
      label: 'Registered Office Address',
      value: (
        <>
          Suite 2 J2 Business Park<br />
          Bridge Hall Lane<br />
          Bury, England<br />
          BL9 7NY
        </>
      ),
    },
    {
      icon: FileText,
      label: 'Company Number',
      value: '16542104',
    },
    {
      icon: Scale,
      label: 'Jurisdiction',
      value: 'England and Wales',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50" aria-labelledby="company-info-heading">
      <div className="max-w-4xl mx-auto">
        <h2 id="company-info-heading" className="text-4xl font-bold text-primary mb-8 text-center">Company Information</h2>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 group relative overflow-hidden">
          <GradientBar />
          <dl className="space-y-4 text-gray-700">
            {companyDetails.map((detail) => {
              const Icon = detail.icon;
              return (
                <div key={detail.label} className="flex items-start">
                  <Icon className="w-6 h-6 text-secondary mr-3 mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold text-primary">{detail.label}</dt>
                    <dd className="mt-1">{detail.value}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

