import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contract
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
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
    const updateData: any = {
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
      console.error('Error updating contract signature:', updateError);
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
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
        console.error('Failed to create acceptance notifications:', notificationError);
        // Don't fail the request
      }

      // Update job status if needed
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('status')
        .eq('id', contract.job_id)
        .single();

      if (job && job.status === 'assigned') {
        // Job can now proceed to scheduling phase
        // Status will change to 'in_progress' when work actually starts
      }
    } else {
      // Notify the other party that contract needs their signature
      const otherPartyId = isContractor ? contract.homeowner_id : contract.contractor_id;
      try {
        await serverSupabase
          .from('notifications')
          .insert({
            user_id: otherPartyId,
            title: 'Contract Pending Your Signature',
            message: `${user.role === 'contractor' ? 'Contractor' : 'Homeowner'} has signed the contract. Your signature is required.`,
            type: 'contract_pending_signature',
            read: false,
            action_url: user.role === 'contractor' ? `/jobs/${contract.job_id}` : `/contractor/jobs/${contract.job_id}`,
            created_at: new Date().toISOString(),
          });
      } catch (notificationError) {
        console.error('Failed to create signature notification:', notificationError);
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
    console.error('Unexpected error in accept contract', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

