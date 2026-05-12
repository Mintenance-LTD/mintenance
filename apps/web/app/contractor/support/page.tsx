import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { theme } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Contractor Support | Mintenance',
  description:
    'Get help with your Mintenance contractor account. Contact support, browse guides, and find answers.',
};

export default async function ContractorSupportPage() {
  // Server-side theme detection — the contractor /layout.tsx already
  // branches on the same cookie key when mounting MintEditorialContractorShell.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <div className='col' style={{ gap: 20 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Contractor support</h1>
          <p className='t-body'>
            Need a hand? Reach out to our team or browse guides tailored to your
            workflow.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <div className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 8 }}>
              Contact support
            </h2>
            <p className='t-body'>
              Email{' '}
              <a
                href='mailto:support@mintenance.co.uk'
                style={{ color: 'var(--me-brand)' }}
              >
                support@mintenance.co.uk
              </a>{' '}
              or start a chat with our contractor success team.
            </p>
          </div>

          <div className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 8 }}>
              Browse quick help
            </h2>
            <ul
              className='col'
              style={{
                gap: 6,
                margin: 0,
                padding: 0,
                listStylePosition: 'inside',
                color: 'var(--me-ink-2)',
              }}
            >
              <li>
                <Link
                  href='/contractor/verification'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Verification checklist
                </Link>
              </li>
              <li>
                <Link
                  href='/contractor/quotes'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Build and send quotes
                </Link>
              </li>
              <li>
                <Link
                  href='/contractor/service-areas'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Manage service coverage
                </Link>
              </li>
              <li>
                <Link
                  href='/contractor/insurance'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Insurance & licensing
                </Link>
              </li>
            </ul>
          </div>

          <div className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 8 }}>
              Response times
            </h2>
            <p className='t-body'>
              Standard support replies within 24 working hours. Payment + escrow
              issues are prioritised and typically answered within 2 hours
              during business hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}
        >
          Contractor Support
        </h1>
        <p
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          Need a hand? Reach out to our team or browse guides tailored to your
          workflow.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <div
          style={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              margin: 0,
            }}
          >
            Contact support
          </h2>
          <p
            style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Email{' '}
            <a
              href='mailto:support@mintenance.co.uk'
              style={{ color: theme.colors.primary }}
            >
              support@mintenance.co.uk
            </a>{' '}
            or start a chat with our contractor success team.
          </p>
        </div>

        <div
          style={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              margin: 0,
            }}
          >
            Browse quick help
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: theme.spacing[4],
              color: theme.colors.textSecondary,
            }}
          >
            <li>
              <Link
                href='/contractor/verification'
                style={{ color: theme.colors.primary }}
              >
                Verification checklist
              </Link>
            </li>
            <li>
              <Link
                href='/contractor/quotes'
                style={{ color: theme.colors.primary }}
              >
                Build and send quotes
              </Link>
            </li>
            <li>
              <Link
                href='/contractor/service-areas'
                style={{ color: theme.colors.primary }}
              >
                Manage service coverage
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
