import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import {
  CUSTOMER_TERMS_VERSION,
  CUSTOMER_TERMS_DATE,
  CUSTOMER_TERMS_SECTIONS,
  CANCELLATION_NOTICE,
  EARLY_START_REQUEST,
  FULL_PERFORMANCE_ACKNOWLEDGEMENT,
} from '@mintenance/shared';
export const metadata = {
  title: 'Customer terms | Mintenance',
  description:
    'Mintenance customer terms, payment process and cancellation rights.',
};
export default function TermsPage() {
  return (
    <LegalPageLayout title='Customer terms' lastUpdated={CUSTOMER_TERMS_DATE}>
      <p>
        Version {CUSTOMER_TERMS_VERSION}. Effective {CUSTOMER_TERMS_DATE}. These
        terms cover the website and mobile apps.
      </p>
      <p>
        <a href='/legal/customer-terms-2026-11-03.txt' download>
          Download and keep these terms
        </a>{' '}
        · <Link href='/privacy'>Privacy notice</Link> ·{' '}
        <Link href='/support'>Get help</Link>
      </p>
      {CUSTOMER_TERMS_SECTIONS.map((section) => (
        <section key={section.title} className='mb-8'>
          <h2>{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <section>
        <h2>Early-start choices</h2>
        <p>
          These choices are offered separately when you sign your job agreement.
          Neither is selected automatically. You may sign without requesting an
          early start.
        </p>
        <p>{EARLY_START_REQUEST}</p>
        <p>{FULL_PERFORMANCE_ACKNOWLEDGEMENT}</p>
      </section>
      <section>
        <h2>Cancellation notice</h2>
        <p>
          You may use this form, the cancellation option on your contract, or
          any clear statement to the contractor copied to{' '}
          <a href='mailto:admin@mintenance.co.uk'>admin@mintenance.co.uk</a>.
          You do not have to use this form.
        </p>
        <pre className='whitespace-pre-wrap text-sm'>{CANCELLATION_NOTICE}</pre>
      </section>
    </LegalPageLayout>
  );
}
