import Link from 'next/link';
import Logo from '../components/Logo';

export const metadata = {
  title: 'Privacy Policy | Mintenance',
  description: 'Privacy Policy for Mintenance - How we collect, use, and protect your personal information',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
            <span className="text-2xl font-bold text-primary">Mintenance</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-12 group relative overflow-hidden">
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Mintenance Ltd ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, whether through our website or mobile application.
              </p>
              <p className="text-gray-700 leading-relaxed">
                By using Mintenance, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            {/* Company Information */}
            <section className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Company Details</h3>
              <p className="text-gray-700 leading-relaxed">
                <strong>MINTENANCE LTD</strong><br />
                Registered Office: Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY<br />
                Company Number: 16542104<br />
                Registered in England and Wales
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">We collect personal information that you provide to us, including:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Name and contact details (email address, phone number)</li>
                <li>Account credentials (username, password)</li>
                <li>Profile information (photo, bio, skills, experience)</li>
                <li>Location data (postcode, address)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Identity verification documents (for contractors)</li>
                <li>Job details and project information</li>
                <li>Messages and communications</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages viewed, time spent, features used)</li>
                <li>Location data (with your consent)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Analytics and performance data</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>To provide our services:</strong> Connect homeowners with tradespeople, facilitate job postings, manage bids and contracts</li>
                <li><strong>To process payments:</strong> Handle transactions securely through our payment partners</li>
                <li><strong>To communicate with you:</strong> Send notifications, updates, and respond to enquiries</li>
                <li><strong>To improve our platform:</strong> Analyse usage patterns, conduct research, and develop new features</li>
                <li><strong>To ensure safety:</strong> Verify identities, prevent fraud, and maintain platform integrity</li>
                <li><strong>To comply with legal obligations:</strong> Meet regulatory requirements and enforce our terms</li>
                <li><strong>Marketing:</strong> Send promotional content (with your consent, which you can withdraw at any time)</li>
              </ul>
            </section>

            {/* Legal Basis for Processing */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Legal Basis for Processing (UK GDPR)</h2>
              <p className="text-gray-700 leading-relaxed mb-4">Under UK GDPR, we process your data based on:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Contract performance:</strong> To provide our services to you</li>
                <li><strong>Consent:</strong> For marketing communications and optional features</li>
                <li><strong>Legitimate interests:</strong> To improve our services and prevent fraud</li>
                <li><strong>Legal obligations:</strong> To comply with UK laws and regulations</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. How We Share Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">We may share your information with:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Other users:</strong> Your profile is visible to facilitate connections (you control what is shared)</li>
                <li><strong>Service providers:</strong> Payment processors (Stripe), cloud hosting (Supabase), analytics tools</li>
                <li><strong>Legal authorities:</strong> When required by law or to protect rights and safety</li>
                <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or asset sale</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                We do not sell your personal information to third parties.
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organisational measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and updates</li>
                <li>Staff training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but are committed to protecting your data.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights Under UK GDPR</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw consent:</strong> For processing based on consent</li>
                <li><strong>Complain:</strong> Lodge a complaint with the Information Commissioner's Office (ICO)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                To exercise these rights, contact us at privacy@mintenance.app
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Account data: Until you delete your account, then up to 90 days for recovery</li>
                <li>Transaction records: 7 years (legal requirement for financial records)</li>
                <li>Marketing data: Until you unsubscribe or withdraw consent</li>
                <li>Analytics data: Aggregated and anonymised after 24 months</li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Keep you signed in</li>
                <li>Remember your preferences</li>
                <li>Analyse site usage and improve performance</li>
                <li>Provide personalised content</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                You can control cookies through your browser settings. Note that disabling cookies may affect platform functionality.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your data may be transferred to and processed in countries outside the UK. We ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>EU Standard Contractual Clauses</li>
                <li>Adequacy decisions by the UK government</li>
                <li>Appropriate technical and organisational measures</li>
              </ul>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on our platform. Your continued use of Mintenance after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8 bg-green-50 p-6 rounded-lg border-l-4 border-secondary">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <div className="text-gray-700 space-y-2">
                <p><strong>Email:</strong> privacy@mintenance.app</p>
                <p><strong>Post:</strong> Data Protection Officer, Mintenance Ltd, Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY</p>
                <p><strong>ICO Registration:</strong> [To be added]</p>
              </div>
            </section>

            {/* ICO Complaint */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Complaints to the ICO</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office:
              </p>
              <div className="text-gray-700 space-y-2">
                <p><strong>Website:</strong> <a href="https://ico.org.uk" className="text-secondary hover:underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a></p>
                <p><strong>Phone:</strong> 0303 123 1113</p>
                <p><strong>Post:</strong> Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>
              </div>
            </section>
          </div>

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="inline-flex items-center text-secondary hover:text-secondary-dark font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} MINTENANCE LTD. All rights reserved.</p>
          <p className="mt-2 text-gray-400">Company No. 16542104 | Registered in England and Wales</p>
        </div>
      </footer>
    </div>
  );
}
