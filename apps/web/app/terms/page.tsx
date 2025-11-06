import Link from 'next/link';
import Logo from '../components/Logo';

export const metadata = {
  title: 'Terms of Service | Mintenance',
  description: 'Terms of Service for Mintenance - Rules and guidelines for using our platform',
};

export default function TermsOfServicePage() {
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
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Mintenance. These Terms of Service ("Terms") govern your use of the Mintenance platform, including our website and mobile application. By accessing or using Mintenance, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-gray-700 leading-relaxed">
                If you do not agree to these Terms, you may not use our services.
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

            {/* Platform Description */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Platform Description</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Mintenance is a marketplace platform that connects homeowners with verified tradespeople for home maintenance, repairs, and improvement projects. We provide:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>A platform for homeowners to post jobs and receive bids from contractors</li>
                <li>Tools for contractors to find work and showcase their skills</li>
                <li>Messaging, payment processing, and project management features</li>
                <li>Verification and rating systems to ensure quality and trust</li>
              </ul>
              <p className="text-gray-700 leading-relaxed font-medium">
                Important: Mintenance is a platform provider only. We do not provide home services ourselves and are not party to contracts between homeowners and contractors.
              </p>
            </section>

            {/* Eligibility */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
              <p className="text-gray-700 leading-relaxed mb-4">To use Mintenance, you must:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and complete registration information</li>
                <li>Not be prohibited from using our services under applicable laws</li>
                <li>For contractors: Hold all necessary licences, insurance, and qualifications required by law</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Accounts</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Account Creation</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must create an account to use Mintenance. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorised use</li>
                <li>Be responsible for all activity under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Account Types</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Homeowner Account:</strong> Post jobs, review bids, hire contractors, make payments</li>
                <li><strong>Contractor Account:</strong> Browse jobs, submit bids, provide services, receive payments</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Verification</h3>
              <p className="text-gray-700 leading-relaxed">
                Contractors must complete our verification process, which may include identity checks, qualification verification, and insurance validation. We reserve the right to request additional documentation at any time.
              </p>
            </section>

            {/* User Responsibilities */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. User Responsibilities</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Homeowners</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Provide accurate job descriptions and requirements</li>
                <li>Respond to bids and messages promptly</li>
                <li>Pay for completed work as agreed</li>
                <li>Provide honest reviews and feedback</li>
                <li>Maintain safe working conditions</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Contractors</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Maintain valid licences, insurance, and qualifications</li>
                <li>Submit honest and accurate bids</li>
                <li>Complete work to professional standards</li>
                <li>Communicate clearly and promptly</li>
                <li>Comply with all applicable laws and building regulations</li>
                <li>Ensure worker safety and public liability coverage</li>
              </ul>
            </section>

            {/* Prohibited Conduct */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Prohibited Conduct</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You must not:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to circumvent platform fees or payments</li>
                <li>Use automated systems to access the platform (bots, scrapers)</li>
                <li>Share your account with others</li>
                <li>Manipulate reviews or ratings</li>
                <li>Solicit users to use competing services</li>
                <li>Upload viruses or malicious code</li>
              </ul>
            </section>

            {/* Payments and Fees */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Payments and Fees</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Platform Fees</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Mintenance charges service fees for using the platform:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Homeowners:</strong> No listing fees. Optional premium features available.</li>
                <li><strong>Contractors:</strong> Commission on completed jobs (percentage varies by subscription tier)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Payment Processing</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Payments are processed securely through Stripe. By using our payment services, you agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Stripe's Terms of Service</li>
                <li>Provide valid payment information</li>
                <li>Pay all fees and charges when due</li>
                <li>Resolve any payment disputes directly with the other party</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.3 Escrow</h3>
              <p className="text-gray-700 leading-relaxed">
                For your protection, payments may be held in escrow until job completion. Funds are released when both parties confirm satisfactory completion or after the dispute resolution period.
              </p>
            </section>

            {/* Contracts Between Users */}
            <section className="mb-8 bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contracts Between Users</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Important:</strong> When a homeowner accepts a contractor's bid, a direct contract is formed between those parties. Mintenance is not a party to this contract.
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Mintenance does not guarantee the quality of work or behaviour of users</li>
                <li>We are not responsible for disputes between homeowners and contractors</li>
                <li>You are responsible for ensuring contracts comply with applicable laws</li>
                <li>We recommend written agreements for all jobs</li>
              </ul>
            </section>

            {/* Disputes */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 User Disputes</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                While we encourage users to resolve disputes amicably, we provide a comprehensive dispute resolution process:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Submit Dispute:</strong> Create a dispute through our platform within 30 days of job completion, providing detailed description and evidence (photos, documents)</li>
                <li><strong>Review Period:</strong> Our team reviews your dispute within 1-3 days. Resolution times vary by priority: Low (14 days), Medium (7 days), High (3 days), Critical (24 hours)</li>
                <li><strong>Mediation (Optional):</strong> Either party can request mediation. We schedule a session with an assigned mediator to help reach a resolution</li>
                <li><strong>Resolution:</strong> We make a final decision based on evidence and platform policies. Decisions on fund release (if in escrow) are binding</li>
                <li><strong>Appeal Process:</strong> If you disagree with the resolution, you may request a review within 7 days with additional evidence</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                For detailed dispute resolution procedures, visit our <a href="/help" className="text-blue-600 hover:underline">Help Center</a>.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Legal Disputes with Mintenance</h3>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by English law. Disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">10.1 Our Rights</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Mintenance platform, including all content, features, and functionality, is owned by Mintenance Ltd and protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">10.2 Your Content</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of content you post. By posting, you grant us a worldwide, non-exclusive, royalty-free licence to use, display, and distribute your content on our platform.
              </p>
            </section>

            {/* Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Mintenance is provided "as is" without warranties of any kind</li>
                <li>We do not warrant uninterrupted, error-free, or secure service</li>
                <li>We are not liable for user-generated content or conduct</li>
                <li>We are not liable for the quality or outcome of services between users</li>
                <li>Our liability is limited to fees paid by you in the last 12 months</li>
                <li>We are not liable for indirect, consequential, or punitive damages</li>
              </ul>
              <p className="text-gray-700 leading-relaxed font-medium">
                Nothing in these Terms excludes our liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold harmless Mintenance Ltd, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Your use of the platform</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Work performed or contracted through the platform</li>
              </ul>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Termination</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">13.1 By You</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may close your account at any time through account settings. Outstanding obligations (payments, jobs in progress) must be settled before closure.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">13.2 By Us</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may suspend or terminate your account if you:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Receive excessive complaints or negative reviews</li>
                <li>Fail to pay fees when due</li>
                <li>Create risk for us or other users</li>
              </ul>
            </section>

            {/* Changes to Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update these Terms from time to time. We will notify you of significant changes by email or through the platform. Your continued use after changes constitutes acceptance. If you do not agree to the updated Terms, you must stop using Mintenance.
              </p>
            </section>

            {/* Miscellaneous */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Miscellaneous</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Entire Agreement:</strong> These Terms and our Privacy Policy constitute the entire agreement</li>
                <li><strong>Severability:</strong> If any provision is found invalid, the remainder continues in effect</li>
                <li><strong>No Waiver:</strong> Our failure to enforce a right does not waive that right</li>
                <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
                <li><strong>Force Majeure:</strong> We are not liable for delays or failures due to circumstances beyond our control</li>
              </ul>
            </section>

            {/* Contact */}
            <section className="mb-8 bg-green-50 p-6 rounded-lg border-l-4 border-secondary">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Questions about these Terms? Contact us:
              </p>
              <div className="text-gray-700 space-y-2">
                <p><strong>Email:</strong> legal@mintenance.app</p>
                <p><strong>Support:</strong> support@mintenance.app</p>
                <p><strong>Post:</strong> Legal Team, Mintenance Ltd, Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY</p>
              </div>
            </section>

            {/* Acceptance */}
            <section className="mb-8 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Acceptance of Terms</h3>
              <p className="text-gray-700 leading-relaxed">
                By clicking "I Accept" during registration or by using Mintenance, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
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
