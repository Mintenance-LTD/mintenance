import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger, CONTRACT_STATUS } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';

export const POST = withApiHandler({ roles: ['homeowner', 'contractor'] }, async (request, { user, params }) => {
  const userDb = createRequestScopedClient(request) ?? serverSupabase;
  const { id: contractId } = await params;

  // SECURITY: Validate UUID format before database query
  if (!isValidUUID(contractId)) {
    throw new BadRequestError('Invalid contract ID format');
  }

  // SECURITY: Fix IDOR - check ownership in query, not after fetch (user-scoped read)
  const { data: contract, error: contractError } = await userDb
    .from('contracts')
    .select(
      'id, job_id, contractor_id, homeowner_id, status, title, contractor_signed_at, homeowner_signed_at, start_date, end_date'
    )
    .eq('id', contractId)
    .or(`contractor_id.eq.${user.id},homeowner_id.eq.${user.id}`)
    .single();

  if (contractError || !contract) {
    // Don't reveal if contract exists or not - return generic error
    throw new NotFoundError('Contract not found or access denied');
  }

  // Verify user is authorized to sign
  const isContractor =
    user.role === 'contractor' && contract.contractor_id === user.id;
  const isHomeowner =
    user.role === 'homeowner' && contract.homeowner_id === user.id;

  if (!isContractor && !isHomeowner) {
    throw new ForbiddenError('Not authorized to sign this contract');
  }

  // Block signing draft contracts — contractor must prepare details first
  if (contract.status === CONTRACT_STATUS.DRAFT) {
    throw new BadRequestError(
      'Cannot sign a draft contract. The contractor must prepare the contract details first.'
    );
  }

  // Check if already signed
  if (isContractor && contract.contractor_signed_at) {
    throw new BadRequestError('Contractor has already signed this contract');
  }
  if (isHomeowner && contract.homeowner_signed_at) {
    throw new BadRequestError('Homeowner has already signed this contract');
  }

  // Pre-fetch data needed for appointment creation BEFORE writing the signature.
  // If these queries run after the write and fail, the contract ends up signed
  // but no appointment is ever created.
  const [{ data: jobDetails }, { data: homeownerProfile }] = await Promise.all([
    serverSupabase
      .from('jobs')
      .select('title, location, address')
      .eq('id', contract.job_id)
      .single(),
    serverSupabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', contract.homeowner_id)
      .single(),
  ]);

  // Update contract with signature
  const updateData: {
    updated_at: string;
    contractor_signed_at?: string;
    homeowner_signed_at?: string;
    status?: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (isContractor) {
    updateData.contractor_signed_at = new Date().toISOString();
    // If homeowner already signed, contract is accepted
    if (contract.homeowner_signed_at) {
      updateData.status = CONTRACT_STATUS.ACCEPTED;
    } else {
      updateData.status = CONTRACT_STATUS.PENDING_HOMEOWNER;
    }
  } else if (isHomeowner) {
    updateData.homeowner_signed_at = new Date().toISOString();
    // If contractor already signed, contract is accepted
    if (contract.contractor_signed_at) {
      updateData.status = CONTRACT_STATUS.ACCEPTED;
    } else {
      updateData.status = CONTRACT_STATUS.PENDING_CONTRACTOR;
    }
  }

  const { data: updatedContract, error: updateError } = await serverSupabase
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select(
      'id, job_id, contractor_id, homeowner_id, status, title, start_date, end_date, amount, contractor_signed_at, homeowner_signed_at, created_at, updated_at'
    )
    .single();

  if (updateError) {
    logger.error('Failed to update contract signature', updateError, {
      service: 'contracts',
      contractId,
      userId: user.id,
    });
    throw new InternalServerError('Failed to sign contract');
  }

  // Notify the other party that they need to sign (if contract is not yet fully accepted)
  if (updatedContract.status !== CONTRACT_STATUS.ACCEPTED) {
    const otherPartyId = isContractor
      ? contract.homeowner_id
      : contract.contractor_id;
    const otherPartyRole = isContractor ? 'homeowner' : 'contractor';

    // Get user's name for the notification message
    const { data: signerData } = await serverSupabase
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('id', user.id)
      .single();

    const signerName = signerData
      ? signerData.first_name && signerData.last_name
        ? `${signerData.first_name} ${signerData.last_name}`
        : signerData.company_name || 'Contractor'
      : user.role === 'contractor'
        ? 'The contractor'
        : 'The homeowner';

    try {
      await NotificationService.createNotification({
        userId: otherPartyId,
        title: 'Contract Pending Your Signature',
        message: `${signerName} has signed the contract for "${updatedContract.title || 'your job'}". Your signature is required to proceed.`,
        type: 'contract_pending_signature',
        actionUrl:
          otherPartyRole === 'contractor'
            ? `/contractor/jobs/${contract.job_id}`
            : `/jobs/${contract.job_id}`,
      });

      logger.info('Contract signature notification sent', {
        service: 'contracts',
        contractId,
        signerRole: user.role,
        notifiedUserId: otherPartyId,
        contractStatus: updatedContract.status,
      });
    } catch (notificationError) {
      logger.error(
        'Failed to create signature notification',
        notificationError,
        {
          service: 'contracts',
          contractId,
        }
      );
      // Don't fail the request if notification fails
    }

    // Send email to other party about pending signature
    try {
      const { data: otherPartyProfile } = await serverSupabase
        .from('profiles')
        .select('email, first_name, last_name, company_name')
        .eq('id', otherPartyId)
        .single();

      if (otherPartyProfile?.email) {
        const recipientName =
          otherPartyProfile.first_name && otherPartyProfile.last_name
            ? `${otherPartyProfile.first_name} ${otherPartyProfile.last_name}`
            : otherPartyProfile.company_name || 'there';
        const viewUrl =
          otherPartyRole === 'contractor'
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${contract.job_id}`
            : `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/jobs/${contract.job_id}`;

        await EmailService.sendContractSignedEmail(otherPartyProfile.email, {
          recipientName,
          signerName,
          jobTitle: updatedContract.title || 'Job',
          contractTitle: updatedContract.title || 'Contract',
          isFullyAccepted: false,
          viewUrl,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send contract signed email', emailError, {
        service: 'contracts',
        contractId,
      });
    }
  }

  // If contract is now accepted, create notifications and schedule job
  if (updatedContract.status === CONTRACT_STATUS.ACCEPTED) {
    // Notify both parties
    try {
      await Promise.all([
        NotificationService.createNotification({
          userId: contract.contractor_id,
          title: 'Contract Accepted!',
          message: `The contract for job "${updatedContract.title || 'your job'}" has been accepted by both parties.`,
          type: 'contract_signed',
          actionUrl: `/contractor/jobs/${contract.job_id}`,
        }),
        NotificationService.createNotification({
          userId: contract.homeowner_id,
          title: 'Contract Accepted!',
          message: `The contract for "${updatedContract.title || 'your job'}" has been accepted by both parties.`,
          type: 'contract_signed',
          actionUrl: `/jobs/${contract.job_id}`,
        }),
      ]);
    } catch (notificationError) {
      logger.error(
        'Failed to create acceptance notifications',
        notificationError,
        {
          service: 'contracts',
          contractId,
        }
      );
      // Don't fail the request
    }

    // Send email to both parties about fully accepted contract
    try {
      const { data: contractorProfile } = await serverSupabase
        .from('profiles')
        .select('email, first_name, last_name, company_name')
        .eq('id', contract.contractor_id)
        .single();

      const { data: homeownerProfile2 } = await serverSupabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', contract.homeowner_id)
        .single();

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

      if (contractorProfile?.email) {
        const name =
          contractorProfile.first_name && contractorProfile.last_name
            ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
            : contractorProfile.company_name || 'Contractor';
        await EmailService.sendContractSignedEmail(contractorProfile.email, {
          recipientName: name,
          signerName: homeownerProfile2
            ? `${homeownerProfile2.first_name || ''} ${homeownerProfile2.last_name || ''}`.trim() ||
              'Homeowner'
            : 'Homeowner',
          jobTitle: updatedContract.title || 'Job',
          contractTitle: updatedContract.title || 'Contract',
          isFullyAccepted: true,
          viewUrl: `${baseUrl}/contractor/jobs/${contract.job_id}`,
        });
      }

      if (homeownerProfile2?.email) {
        const name =
          homeownerProfile2.first_name && homeownerProfile2.last_name
            ? `${homeownerProfile2.first_name} ${homeownerProfile2.last_name}`
            : 'Homeowner';
        await EmailService.sendContractSignedEmail(homeownerProfile2.email, {
          recipientName: name,
          signerName: contractorProfile
            ? contractorProfile.first_name && contractorProfile.last_name
              ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
              : contractorProfile.company_name || 'Contractor'
            : 'Contractor',
          jobTitle: updatedContract.title || 'Job',
          contractTitle: updatedContract.title || 'Contract',
          isFullyAccepted: true,
          viewUrl: `${baseUrl}/jobs/${contract.job_id}`,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send contract accepted emails', emailError, {
        service: 'contracts',
        contractId,
      });
    }

    // Update job with contract dates and schedule on both calendars
    if (updatedContract.start_date || updatedContract.end_date) {
      const jobUpdateData: {
        updated_at: string;
        scheduled_date?: string;
        scheduled_start_date?: string;
        scheduled_end_date?: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      // Set scheduled_date to start_date for calendar display
      // This will appear on both homeowner and contractor calendars
      if (updatedContract.start_date) {
        jobUpdateData.scheduled_date = updatedContract.start_date;
      }

      // Also store start and end dates if they exist in the jobs table
      // (Some schemas have these fields)
      if (updatedContract.start_date) {
        jobUpdateData.scheduled_start_date = updatedContract.start_date;
      }
      if (updatedContract.end_date) {
        jobUpdateData.scheduled_end_date = updatedContract.end_date;
      }

      // Update job with contract dates
      const { error: jobUpdateError } = await serverSupabase
        .from('jobs')
        .update(jobUpdateData)
        .eq('id', contract.job_id);

      if (jobUpdateError) {
        logger.error(
          'Failed to update job with contract dates',
          jobUpdateError,
          {
            service: 'contracts',
            jobId: contract.job_id,
            contractId,
          }
        );
        // Don't fail the request, but log the error
      } else {
        logger.info('Job scheduled with contract dates', {
          service: 'contracts',
          jobId: contract.job_id,
          contractId,
          startDate: updatedContract.start_date,
          endDate: updatedContract.end_date,
          scheduledDate: updatedContract.start_date,
        });
      }

      // Create appointment record so it shows on dashboard "Upcoming Appointments"
      // jobDetails and homeownerProfile were pre-fetched above before the signature write
      try {
        const appointmentDate = updatedContract.start_date;
        const clientName = homeownerProfile
          ? `${homeownerProfile.first_name || ''} ${homeownerProfile.last_name || ''}`.trim()
          : undefined;

        const { error: appointmentError } = await serverSupabase
          .from('appointments')
          .insert({
            contractor_id: contract.contractor_id,
            client_id: contract.homeowner_id,
            job_id: contract.job_id,
            title:
              jobDetails?.title || updatedContract.title || 'Scheduled Job',
            appointment_date: appointmentDate,
            start_time: '09:00',
            end_time: '17:00',
            location_type: 'onsite',
            location_address:
              jobDetails?.address || jobDetails?.location || null,
            client_name: clientName || null,
            client_email: homeownerProfile?.email || null,
            client_phone: homeownerProfile?.phone || null,
            status: 'scheduled',
            notes: `Auto-created from contract "${updatedContract.title || 'Untitled'}" acceptance.`,
          });

        if (appointmentError) {
          logger.error(
            'Failed to create appointment from contract',
            appointmentError,
            {
              service: 'contracts',
              contractId,
              jobId: contract.job_id,
            }
          );
        } else {
          logger.info('Appointment created from contract acceptance', {
            service: 'contracts',
            contractId,
            jobId: contract.job_id,
            appointmentDate,
          });
        }
      } catch (appointmentCreationError) {
        logger.error(
          'Error creating appointment from contract',
          appointmentCreationError,
          {
            service: 'contracts',
            contractId,
          }
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    contract: updatedContract,
    message:
      updatedContract.status === CONTRACT_STATUS.ACCEPTED
        ? 'Contract accepted! Both parties have signed.'
        : 'Contract signed. Waiting for other party to sign.',
  });
});
