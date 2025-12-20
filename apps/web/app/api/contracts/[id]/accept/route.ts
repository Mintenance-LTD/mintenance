import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const { id: contractId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Validate UUID format before database query
    if (!isValidUUID(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID format' }, { status: 400 });
    }

    // SECURITY: Fix IDOR - check ownership in query, not after fetch
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .or(`contractor_id.eq.${user.id},homeowner_id.eq.${user.id}`)
      .single();

    if (contractError || !contract) {
      // Don't reveal if contract exists or not - return generic error
      return NextResponse.json({ error: 'Contract not found or access denied' }, { status: 404 });
    }

    // Verify user is authorized to sign
    const isContractor = user.role === 'contractor' && contract.contractor_id === user.id;
    const isHomeowner = user.role === 'homeowner' && contract.homeowner_id === user.id;

    if (!isContractor && !isHomeowner) {
      return NextResponse.json({ error: 'Not authorized to sign this contract' }, { status: 403 });
    }

    // Check if already signed
    if (isContractor && contract.contractor_signed_at) {
      return NextResponse.json({ error: 'Contractor has already signed this contract' }, { status: 400 });
    }
    if (isHomeowner && contract.homeowner_signed_at) {
      return NextResponse.json({ error: 'Homeowner has already signed this contract' }, { status: 400 });
    }

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
        updateData.status = 'accepted';
      } else {
        updateData.status = 'pending_homeowner';
      }
    } else if (isHomeowner) {
      updateData.homeowner_signed_at = new Date().toISOString();
      // If contractor already signed, contract is accepted
      if (contract.contractor_signed_at) {
        updateData.status = 'accepted';
      } else {
        updateData.status = 'pending_contractor';
      }
    }

    const { data: updatedContract, error: updateError } = await serverSupabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update contract signature', updateError, {
        service: 'contracts',
        contractId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    }

    // Notify the other party that they need to sign (if contract is not yet fully accepted)
    if (updatedContract.status !== 'accepted') {
      const otherPartyId = isContractor ? contract.homeowner_id : contract.contractor_id;
      const otherPartyRole = isContractor ? 'homeowner' : 'contractor';
      
      // Get user's name for the notification message
      const { data: signerData } = await serverSupabase
        .from('users')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single();
      
      const signerName = signerData 
        ? (signerData.first_name && signerData.last_name 
            ? `${signerData.first_name} ${signerData.last_name}`
            : signerData.company_name || 'Contractor')
        : (user.role === 'contractor' ? 'The contractor' : 'The homeowner');
      
      try {
        await serverSupabase
          .from('notifications')
          .insert({
            user_id: otherPartyId,
            title: 'Contract Pending Your Signature 📝',
            message: `${signerName} has signed the contract for "${updatedContract.title || 'your job'}". Your signature is required to proceed.`,
            type: 'contract_pending_signature',
            read: false,
            action_url: otherPartyRole === 'contractor' ? `/contractor/jobs/${contract.job_id}` : `/jobs/${contract.job_id}`,
            created_at: new Date().toISOString(),
          });
        
        logger.info('Contract signature notification sent', {
          service: 'contracts',
          contractId,
          signerRole: user.role,
          notifiedUserId: otherPartyId,
          contractStatus: updatedContract.status,
        });
      } catch (notificationError) {
        logger.error('Failed to create signature notification', notificationError, {
          service: 'contracts',
          contractId,
        });
        // Don't fail the request if notification fails
      }
    }

    // If contract is now accepted, create notifications and schedule job
    if (updatedContract.status === 'accepted') {
      // Notify both parties
      const notifications = [
        {
          user_id: contract.contractor_id,
          title: 'Contract Accepted! ✅',
          message: `The contract for job "${updatedContract.title || 'your job'}" has been accepted by both parties.`,
          type: 'contract_signed',
          read: false,
          action_url: `/contractor/jobs/${contract.job_id}`,
          created_at: new Date().toISOString(),
        },
        {
          user_id: contract.homeowner_id,
          title: 'Contract Accepted! ✅',
          message: `The contract for "${updatedContract.title || 'your job'}" has been accepted by both parties.`,
          type: 'contract_signed',
          read: false,
          action_url: `/jobs/${contract.job_id}`,
          created_at: new Date().toISOString(),
        },
      ];

      try {
        await serverSupabase.from('notifications').insert(notifications);
      } catch (notificationError) {
        logger.error('Failed to create acceptance notifications', notificationError, {
          service: 'contracts',
          contractId,
        });
        // Don't fail the request
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
          logger.error('Failed to update job with contract dates', jobUpdateError, {
            service: 'contracts',
            jobId: contract.job_id,
            contractId,
          });
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
      }
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: updatedContract.status === 'accepted' 
        ? 'Contract accepted! Both parties have signed.' 
        : 'Contract signed. Waiting for other party to sign.',
    });
  } catch (error) {
    logger.error('Unexpected error in accept contract', error, { service: 'contracts' });
    // SECURITY: Don't expose error details to client
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

