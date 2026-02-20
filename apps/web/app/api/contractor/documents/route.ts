import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/contractor/documents
 * List all documents for the authenticated contractor
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('contractor_documents')
      .select('*, jobs(title)')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch contractor documents', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const documents = (data || []).map((doc: Record<string, unknown>) => ({
      ...doc,
      jobTitle: (doc.jobs as { title?: string } | null)?.title || null,
      jobs: undefined,
    }));

    return NextResponse.json({ documents });
  },
);

/**
 * POST /api/contractor/documents
 * Upload a document for the authenticated contractor
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (req, { user }) => {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'other';
    const jobId = formData.get('job_id') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 400 });
    }

    // Validate category
    const validCategories = ['contracts', 'photos', 'certifications', 'insurance', 'receipts', 'templates', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Extract file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeFileName = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await serverSupabase.storage
      .from('contractor-documents')
      .upload(safeFileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload contractor document', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = serverSupabase.storage
      .from('contractor-documents')
      .getPublicUrl(uploadData.path);

    // Insert document record
    const { data: doc, error: insertError } = await serverSupabase
      .from('contractor_documents')
      .insert({
        contractor_id: user.id,
        name: file.name,
        file_type: ext,
        category,
        size_bytes: file.size,
        storage_path: uploadData.path,
        public_url: urlData.publicUrl,
        job_id: jobId || null,
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded file on DB insert failure
      await serverSupabase.storage.from('contractor-documents').remove([safeFileName]);
      logger.error('Failed to insert document record', insertError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  },
);

/**
 * DELETE /api/contractor/documents?id=xxx
 * Delete a contractor document
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Fetch document to verify ownership and get storage path
    const { data: doc, error: fetchError } = await serverSupabase
      .from('contractor_documents')
      .select('id, storage_path, contractor_id')
      .eq('id', docId)
      .eq('contractor_id', user.id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    if (doc.storage_path) {
      const { error: storageError } = await serverSupabase.storage
        .from('contractor-documents')
        .remove([doc.storage_path]);

      if (storageError) {
        logger.error('Failed to delete document from storage', storageError);
      }
    }

    // Delete record
    const { error: deleteError } = await serverSupabase
      .from('contractor_documents')
      .delete()
      .eq('id', docId)
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete document record', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
);

/**
 * PATCH /api/contractor/documents
 * Update document metadata (star, tags, category)
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (req, { user }) => {
    const body = await req.json();
    const { id, starred, tags, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (starred !== undefined) updates.starred = starred;
    if (tags !== undefined) updates.tags = tags;
    if (category !== undefined) updates.category = category;

    const { data: doc, error } = await serverSupabase
      .from('contractor_documents')
      .update(updates)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update document', error);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({ document: doc });
  },
);
