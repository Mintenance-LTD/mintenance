import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { JobCreationService } from '@/lib/services/job-creation-service';
import { NotFoundError, ForbiddenError, BadRequestError } from '@/lib/errors/api-error';

const CERT_TYPE_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety (CP12)',
  eicr: 'EICR - Electrical Installation',
  epc: 'EPC - Energy Performance',
  smoke_alarm: 'Smoke Alarm Inspection',
  co_detector: 'CO Detector Inspection',
};

/**
 * POST /api/compliance/[id]/renew
 * One-click renewal: creates a job from an expired/expiring certificate
 */
export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (_req, { user, params }) => {
    const certId = params.id;

    // Fetch the certificate with property ownership check
    const { data: cert, error: certError } = await serverSupabase
      .from('compliance_certificates')
      .select('id, property_id, cert_type, status, expiry_date, renewal_job_id')
      .eq('id', certId)
      .single();

    if (certError || !cert) {
      throw new NotFoundError('Certificate not found');
    }

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id, property_name, address')
      .eq('id', cert.property_id)
      .single();

    if (!property || property.owner_id !== user.id) {
      throw new ForbiddenError('Not authorized');
    }

    // Only renew expired or expiring certs
    if (cert.status !== 'expired' && cert.status !== 'expiring') {
      throw new BadRequestError('Certificate is still valid and does not need renewal');
    }

    // Prevent duplicate renewal jobs
    if (cert.renewal_job_id) {
      return NextResponse.json({
        jobId: cert.renewal_job_id,
        message: 'A renewal job already exists for this certificate',
        alreadyExists: true,
      });
    }

    const certLabel = CERT_TYPE_LABELS[cert.cert_type] || cert.cert_type.replace(/_/g, ' ');

    // Create the job
    const job = await JobCreationService.getInstance().createJob(
      { id: user.id, role: 'homeowner' },
      {
        title: `${certLabel} Renewal – ${property.property_name}`,
        description: `Renewal required for ${certLabel} at ${property.address}. ${
          cert.expiry_date
            ? `Certificate ${cert.status === 'expired' ? 'expired' : 'expiring'} on ${new Date(cert.expiry_date).toLocaleDateString('en-GB')}.`
            : ''
        }`,
        category: cert.cert_type,
        property_id: cert.property_id,
      },
    );

    // Link the renewal job back to the certificate
    await serverSupabase
      .from('compliance_certificates')
      .update({ renewal_job_id: job.id })
      .eq('id', certId);

    return NextResponse.json({
      jobId: job.id,
      message: 'Renewal job created successfully',
      alreadyExists: false,
    }, { status: 201 });
  },
);
