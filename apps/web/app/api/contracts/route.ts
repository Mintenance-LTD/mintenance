import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

// Type definitions for contracts
interface ContractTerms {
  [key: string]: string | number | boolean | null;
}

interface ContractCreateData {
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  title: string;
  description: string;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  terms: ContractTerms;
  contractor_company_name: string;
  contractor_license_registration: string;
  contractor_license_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ContractUpdateData {
  title?: string;
  description?: string;
  amount?: number;
  start_date?: string | null;
  end_date?: string | null;
  terms?: ContractTerms;
  status?: string;
  updated_at: string;
}

interface MessagePayload {
  job_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  read: boolean;
}

const createContractSchema = z.object({
  job_id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  amount: z.number().positive(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  contractor_company_name: z.string().min(1),
  contractor_license_registration: z.string().min(1),
  contractor_license_type: z.string().optional(),
});

const updateContractSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');
    const status = searchParams.get('status');

    let query = serverSupabase
      .from('contracts')
      .select(`
        *,
        job:jobs!inner(id, title, status),
        contractor:users!contracts_contractor_id_fkey(id, first_name, last_name, email),
        homeowner:users!contracts_homeowner_id_fkey(id, first_name, last_name, email)
      `);

    // Filter by role
    if (user.role === 'contractor') {
      query = query.eq('contractor_id', user.id);
    } else if (user.role === 'homeowner') {
      query = query.eq('homeowner_id', user.id);
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    // Additional filters
    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: contracts, error } = await query;

    if (error) {
      logger.error('Error fetching contracts', error, {
        service: 'contracts',
        userId: user.id,
        role: user.role,
      });
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
    }

    return NextResponse.json({ contracts: contracts || [] });
  } catch (error) {
    logger.error('Unexpected error in GET contracts', error, {
      service: 'contracts',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can create contracts' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createContractSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { job_id, title, description, amount, start_date, end_date, terms, contractor_company_name, contractor_license_registration, contractor_license_type } = parsed.data;

    // Verify job exists and contractor is assigned
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, title')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to create contract for this job' }, { status: 403 });
    }

    if (job.status !== 'assigned') {
      return NextResponse.json({ error: 'Job must be assigned before creating a contract' }, { status: 400 });
    }

    // Check if contract already exists
    const { data: existingContract } = await serverSupabase
      .from('contracts')
      .select('id')
      .eq('job_id', job_id)
      .single();

    if (existingContract) {
      return NextResponse.json({ error: 'Contract already exists for this job' }, { status: 400 });
    }

    // Create contract
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .insert({
        job_id,
        contractor_id: user.id,
        homeowner_id: job.homeowner_id,
        title: title || `Contract for ${job.title || 'Job'}`,
        description: description || '',
        amount,
        start_date: start_date || null,
        end_date: end_date || null,
        terms: terms || {},
        contractor_company_name,
        contractor_license_registration,
        contractor_license_type: contractor_license_type || null,
        status: 'pending_homeowner', // Contractor creates, homeowner needs to sign
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (contractError) {
      logger.error('Error creating contract', contractError, {
        service: 'contracts',
        jobId: job_id,
        contractorId: user.id,
      });
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    }

    // Create notification for homeowner
    try {
      await serverSupabase
        .from('notifications')
        .insert({
          user_id: job.homeowner_id,
          title: 'New Contract Created',
          message: `Contractor has created a contract for "${job.title || 'your job'}". Please review and sign.`,
          type: 'contract_created',
          read: false,
          action_url: `/jobs/${job_id}`,
          created_at: new Date().toISOString(),
        });
    } catch (notificationError) {
      logger.error('Failed to create notification', notificationError, {
        service: 'contracts',
        jobId: job_id,
        homeownerId: job.homeowner_id,
      });
      // Don't fail the request
    }

    // Create a message in the chat history for both parties to see
    try {
      // Get contractor name for the message
      const { data: contractorData } = await serverSupabase
        .from('users')
        .select('first_name, last_name, company_name')
        .eq('id', user.id)
        .single();
      
      const contractorName = contractorData 
        ? (contractorData.first_name && contractorData.last_name 
            ? `${contractorData.first_name} ${contractorData.last_name}`
            : contractorData.company_name || 'Contractor')
        : 'Contractor';
      
      // Create message text about the contract
      const contractMessageText = `📋 New contract submitted: £${amount.toLocaleString()}\n\n${title || `Contract for ${job.title || 'your job'}`}${description ? `\n\n${description}` : ''}`;
      
      logger.info('Creating contract message', {
        service: 'contracts',
        jobId: job_id,
        senderId: user.id,
        receiverId: job.homeowner_id,
        messageType: 'contract_submitted',
        messageLength: contractMessageText.length,
      });
      
      // Create contract submission message using 'content' column (schema uses 'content', not 'message_text')
      const messagePayload: MessagePayload = {
        job_id: job_id,
        sender_id: user.id,
        receiver_id: job.homeowner_id,
        content: contractMessageText, // Use 'content' column (schema uses 'content', not 'message_text')
        message_type: 'contract_submitted',
        read: false,
      };
      
      let messageInserted = false;
      let insertedMessageId: string | null = null;
      
      try {
        const { data: insertedMessage, error: msgError } = await serverSupabase
          .from('messages')
          .insert(messagePayload)
          .select('id, message_type, created_at')
          .single();
        
        if (msgError) {
          logger.error('Failed to create contract message', msgError, {
            service: 'contracts',
            jobId: job_id,
            errorCode: msgError.code,
          });
          throw msgError;
        }
        
        messageInserted = true;
        insertedMessageId = insertedMessage?.id || null;
        logger.info('Contract message created successfully', {
          service: 'contracts',
          messageId: insertedMessageId,
          messageType: insertedMessage?.message_type,
          createdAt: insertedMessage?.created_at,
        });
      } catch (msgError: unknown) {
        logger.error('Failed to create contract message', msgError, {
          service: 'contracts',
          jobId: job_id,
        });
        // Don't throw - message creation is not critical for contract creation
      }
      
      // Update job's updated_at so it appears at the top of messages list
      if (messageInserted) {
        await serverSupabase
          .from('jobs')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', job_id);
        logger.info('Job updated_at timestamp updated for contract message', {
          service: 'contracts',
          jobId: job_id,
          messageId: insertedMessageId,
        });
      } else {
        logger.warn('Contract message was not inserted, but contract creation succeeded', {
          service: 'contracts',
          jobId: job_id,
        });
      }
    } catch (messageError) {
      logger.error('Failed to create contract message', messageError, {
        service: 'contracts',
        jobId: job_id,
      });
      // Don't fail the request if message creation fails, but log it clearly
    }

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    logger.error('Unexpected error in POST contracts', error, {
      service: 'contracts',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('id');

    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
    }

    // Verify contract exists and user has permission
    const { data: contract, error: contractError } = await serverSupabase
      .from('contracts')
      .select('id, job_id, contractor_id, homeowner_id, title, description, amount, status, start_date, end_date, terms, created_at, updated_at, signed_at')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const canEdit = (user.role === 'contractor' && contract.contractor_id === user.id) ||
                    (user.role === 'homeowner' && contract.homeowner_id === user.id);

    if (!canEdit) {
      return NextResponse.json({ error: 'Not authorized to edit this contract' }, { status: 403 });
    }

    // Can only edit if status is draft or pending
    if (!['draft', 'pending_contractor', 'pending_homeowner'].includes(contract.status)) {
      return NextResponse.json({ error: 'Contract cannot be edited in current status' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateContractSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: ContractUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
    if (parsed.data.start_date !== undefined) updateData.start_date = parsed.data.start_date || null;
    if (parsed.data.end_date !== undefined) updateData.end_date = parsed.data.end_date || null;
    if (parsed.data.terms !== undefined) updateData.terms = parsed.data.terms as ContractTerms;

    // Update status based on who is editing
    if (user.role === 'contractor' && contract.status === 'pending_homeowner') {
      updateData.status = 'pending_homeowner'; // Still waiting for homeowner
    } else if (user.role === 'homeowner' && contract.status === 'pending_contractor') {
      updateData.status = 'pending_contractor'; // Still waiting for contractor
    }

    const { data: updatedContract, error: updateError } = await serverSupabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating contract', updateError, {
        service: 'contracts',
        contractId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
    }

    return NextResponse.json({ contract: updatedContract });
  } catch (error) {
    logger.error('Unexpected error in PUT contracts', error, {
      service: 'contracts',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

