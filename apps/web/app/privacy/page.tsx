import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = {
  title: 'Privacy Policy | Mintenance',
  description:
    'Privacy Policy for Mintenance - How we collect, use, and protect your personal information',
};

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--me-font-display)',
  fontWeight: 500,
  fontSize: 28,
  letterSpacing: '-0.02em',
  color: 'var(--me-ink)',
  margin: '0 0 16px',
};

const h3Style: React.CSSProperties = {
  fontFamily: 'var(--me-font-display)',
  fontWeight: 500,
  fontSize: 20,
  letterSpacing: '-0.01em',
  color: 'var(--me-ink)',
  margin: '0 0 12px',
};

const pStyle: React.CSSProperties = {
  fontFamily: 'var(--me-font-body)',
  color: 'var(--me-ink-2)',
  lineHeight: 1.65,
  marginBottom: 16,
};

const listStyle: React.CSSProperties = {
  fontFamily: 'var(--me-font-body)',
  color: 'var(--me-ink-2)',
  lineHeight: 1.65,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title='Privacy Policy' lastUpdated={formatDate()}>
      <div data-theme='mint-editorial'>
        <section className='mb-8'>
          <h2 style={h2Style}>1. Introduction</h2>
          <p style={pStyle}>
            Welcome to Mintenance Ltd (&quot;we&quot;, &quot;our&quot;,
            &quot;us&quot;). We are committed to protecting your personal
            information and your right to privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you use our platform, whether through our website or mobile
            application.
          </p>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            By using Mintenance, you agree to the collection and use of
            information in accordance with this policy. If you do not agree with
            our policies and practices, please do not use our services.
          </p>
        </section>

        <section
          className='mb-8 p-6'
          style={{
            background: 'var(--me-bg-2)',
            borderRadius: 'var(--me-radius-card)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--me-font-body)',
              fontWeight: 600,
              color: 'var(--me-ink)',
              marginBottom: 12,
            }}
          >
            Company Details
          </p>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            <strong>MINTENANCE LTD</strong>
            <br />
            Registered Office: Suite 2 J2 Business Park, Bridge Hall Lane, Bury,
            England, BL9 7NY
            <br />
            Company Number: 16542104
            <br />
            Registered in England and Wales
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>2. Information We Collect</h2>
          <h3 style={h3Style}>2.1 Personal Information</h3>
          <p style={pStyle}>
            We collect personal information that you provide to us, including:
          </p>
          <ul className='list-disc pl-6 mb-4 space-y-2' style={listStyle}>
            <li>Name and contact details (email address, phone number)</li>
            <li>Account credentials (username, password)</li>
            <li>Profile information (photo, bio, skills, experience)</li>
            <li>Location data (postcode, address)</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Identity verification documents (for contractors)</li>
            <li>Job details and project information</li>
            <li>Messages and communications</li>
          </ul>
          <h3 style={h3Style}>2.2 Automatically Collected Information</h3>
          <ul
            className='list-disc pl-6 mb-4 space-y-2'
            style={{ ...listStyle, marginBottom: 0 }}
          >
            <li>
              Device information (IP address, browser type, operating system)
            </li>
            <li>Usage data (pages viewed, time spent, features used)</li>
            <li>Location data (with your consent)</li>
            <li>Cookies and similar tracking technologies</li>
            <li>Analytics and performance data</li>
          </ul>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>3. How We Use Your Information</h2>
          <p style={pStyle}>
            We use your information for the following purposes:
          </p>
          <ul
            className='list-disc pl-6 mb-4 space-y-2'
            style={{ ...listStyle, marginBottom: 0 }}
          >
            <li>
              <strong>To provide our services:</strong> Connect homeowners with
              tradespeople, facilitate job postings, manage bids and contracts
            </li>
            <li>
              <strong>To process payments:</strong> Handle transactions securely
              through our payment partners
            </li>
            <li>
              <strong>To communicate with you:</strong> Send notifications,
              updates, and respond to enquiries
            </li>
            <li>
              <strong>To improve our platform:</strong> Analyse usage patterns,
              conduct research, and develop new features
            </li>
            <li>
              <strong>To ensure safety:</strong> Verify identities, prevent
              fraud, and maintain platform integrity
            </li>
            <li>
              <strong>To comply with legal obligations:</strong> Meet regulatory
              requirements and enforce our terms
            </li>
            <li>
              <strong>Marketing:</strong> Send promotional content (with your
              consent, which you can withdraw at any time)
            </li>
          </ul>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>4. Legal Basis for Processing (UK GDPR)</h2>
          <p style={pStyle}>Under UK GDPR, we process your data based on:</p>
          <ul
            className='list-disc pl-6 mb-4 space-y-2'
            style={{ ...listStyle, marginBottom: 0 }}
          >
            <li>
              <strong>Contract performance:</strong> To provide our services to
              you
            </li>
            <li>
              <strong>Consent:</strong> For marketing communications and
              optional features
            </li>
            <li>
              <strong>Legitimate interests:</strong> To improve our services and
              prevent fraud
            </li>
            <li>
              <strong>Legal obligations:</strong> To comply with UK laws and
              regulations
            </li>
          </ul>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>5. How We Share Your Information</h2>
          <p style={pStyle}>We may share your information with:</p>
          <ul className='list-disc pl-6 mb-4 space-y-2' style={listStyle}>
            <li>
              <strong>Other users:</strong> Your profile is visible to
              facilitate connections (you control what is shared)
            </li>
            <li>
              <strong>Service providers:</strong> Payment processors (Stripe),
              cloud hosting (Supabase), analytics tools
            </li>
            <li>
              <strong>Legal authorities:</strong> When required by law or to
              protect rights and safety
            </li>
            <li>
              <strong>Business transfers:</strong> In the event of a merger,
              acquisition, or asset sale
            </li>
          </ul>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>6. Data Security</h2>
          <p style={pStyle}>
            We implement appropriate technical and organisational measures to
            protect your personal information, including:
          </p>
          <ul className='list-disc pl-6 mb-4 space-y-2' style={listStyle}>
            <li>Encryption of data in transit (SSL/TLS) and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security audits and updates</li>
            <li>Staff training on data protection</li>
            <li>Incident response procedures</li>
          </ul>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            However, no method of transmission over the Internet is 100% secure.
            We cannot guarantee absolute security but are committed to
            protecting your data.
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>7. Your Rights Under UK GDPR</h2>
          <p style={pStyle}>You have the right to:</p>
          <ul className='list-disc pl-6 mb-4 space-y-2' style={listStyle}>
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Rectification:</strong> Correct inaccurate or incomplete
              data
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your data
              (&quot;right to be forgotten&quot;)
            </li>
            <li>
              <strong>Restriction:</strong> Limit how we process your data
            </li>
            <li>
              <strong>Portability:</strong> Receive your data in a structured,
              machine-readable format
            </li>
            <li>
              <strong>Object:</strong> Object to processing based on legitimate
              interests
            </li>
            <li>
              <strong>Withdraw consent:</strong> For processing based on consent
            </li>
            <li>
              <strong>Complain:</strong> Lodge a complaint with the Information
              Commissioner&apos;s Office (ICO)
            </li>
          </ul>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            To exercise these rights, contact us at privacy@mintenance.app
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>8. Data Retention</h2>
          <p style={pStyle}>
            We retain your personal information for as long as necessary to
            provide our services and comply with legal obligations:
          </p>
          <ul
            className='list-disc pl-6 mb-4 space-y-2'
            style={{ ...listStyle, marginBottom: 0 }}
          >
            <li>
              Account data: Until you delete your account, then up to 90 days
              for recovery
            </li>
            <li>
              Transaction records: 7 years (legal requirement for financial
              records)
            </li>
            <li>Marketing data: Until you unsubscribe or withdraw consent</li>
            <li>Analytics data: Aggregated and anonymised after 24 months</li>
          </ul>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>9. Cookies and Tracking Technologies</h2>
          <p style={pStyle}>We use cookies and similar technologies to:</p>
          <ul className='list-disc pl-6 mb-4 space-y-2' style={listStyle}>
            <li>Keep you signed in</li>
            <li>Remember your preferences</li>
            <li>Analyse site usage and improve performance</li>
            <li>Provide personalised content</li>
          </ul>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            You can control cookies through your browser settings. Note that
            disabling cookies may affect platform functionality.
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>10. Children&apos;s Privacy</h2>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            Our services are not intended for individuals under 18 years of age.
            We do not knowingly collect personal information from children. If
            you become aware that a child has provided us with personal
            information, please contact us immediately.
          </p>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>11. International Data Transfers</h2>
          <p style={pStyle}>
            Your data may be transferred to and processed in countries outside
            the UK. We ensure appropriate safeguards are in place, including:
          </p>
          <ul
            className='list-disc pl-6 mb-4 space-y-2'
            style={{ ...listStyle, marginBottom: 0 }}
          >
            <li>EU Standard Contractual Clauses</li>
            <li>Adequacy decisions by the UK government</li>
            <li>Appropriate technical and organisational measures</li>
          </ul>
        </section>

        <section className='mb-8'>
          <h2 style={h2Style}>12. Changes to This Privacy Policy</h2>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            We may update this Privacy Policy from time to time. We will notify
            you of significant changes by email or through a prominent notice on
            our platform. Your continued use of Mintenance after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section
          className='mb-8 p-6'
          style={{
            background: 'var(--me-brand-soft)',
            borderRadius: 'var(--me-radius-card)',
            borderLeft: '4px solid var(--me-brand)',
          }}
        >
          <h2 style={h2Style}>13. Contact Us</h2>
          <p style={pStyle}>
            If you have questions about this Privacy Policy or wish to exercise
            your rights, please contact us:
          </p>
          <div
            className='space-y-2'
            style={{
              fontFamily: 'var(--me-font-body)',
              color: 'var(--me-ink-2)',
            }}
          >
            <p>
              <strong>Email:</strong> privacy@mintenance.app
            </p>
            <p>
              <strong>Post:</strong> Data Protection Officer, Mintenance Ltd,
              Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY
            </p>
            <p>
              <strong>ICO Registration:</strong> Pending &mdash; Mintenance Ltd
              has applied to the ICO and will update this page with the
              registration number once confirmed. Processing of personal data is
              conducted in compliance with UK GDPR in the interim.
            </p>
          </div>
        </section>

        <section className='mb-8'>
          <h3 style={h3Style}>Complaints to the ICO</h3>
          <p style={pStyle}>
            If you are not satisfied with our response, you have the right to
            lodge a complaint with the Information Commissioner&apos;s Office:
          </p>
          <div
            className='space-y-2'
            style={{
              fontFamily: 'var(--me-font-body)',
              color: 'var(--me-ink-2)',
            }}
          >
            <p>
              <strong>Website:</strong>{' '}
              <a
                href='https://ico.org.uk'
                className='hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded'
                style={{ color: 'var(--me-brand)' }}
                target='_blank'
                rel='noopener noreferrer'
              >
                ico.org.uk
              </a>
            </p>
            <p>
              <strong>Phone:</strong> 0303 123 1113
            </p>
            <p>
              <strong>Post:</strong> Information Commissioner&apos;s Office,
              Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF
            </p>
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
}
