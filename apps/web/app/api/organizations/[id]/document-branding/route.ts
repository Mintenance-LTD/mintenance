import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { requireOrgRole } from '@/lib/auth-manager/org-roles';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import {
  documentBrandingInput,
  normalizeDocumentLogo,
} from '@/lib/services/property-team/document-branding';

const responseHeaders = { 'Cache-Control': 'private, no-store' };

async function getWorkspace(id: string, actor: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new BadRequestError('Invalid organization id');
  await requireOrgRole(id, actor, ['owner']);
  const { data, error } = await db
    .from('organizations')
    .select('id,name')
    .eq('id', id)
    .in('organization_type', ['portfolio', 'agency', 'property_management'])
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError('Agency workspace not found');
  return data;
}

function json(
  displayName: string,
  accentColour: string,
  logoBase64: string | null | undefined
) {
  return NextResponse.json(
    {
      displayName,
      accentColour,
      logoDataUrl: logoBase64 ? 'data:image/jpeg;base64,' + logoBase64 : null,
    },
    { headers: responseHeaders }
  );
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const workspace = await getWorkspace(params.id, user.id);
    const { data, error } = await db
      .from('organization_document_branding')
      .select('display_name,accent_colour,logo_base64')
      .eq('org_id', workspace.id)
      .maybeSingle();
    if (error) throw error;
    return json(
      data?.display_name ?? workspace.name,
      data?.accent_colour ?? '#0E5545',
      data?.logo_base64
    );
  }
);

export const PUT = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const workspace = await getWorkspace(params.id, user.id);
    const length = Number(request.headers.get('content-length'));
    if (length > 282000)
      throw new BadRequestError('Choose a PNG or JPEG logo under 200 KB.');
    let raw: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) throw new Error('Missing body');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 282000) {
            await reader.cancel();
            throw new Error('Body is too large');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new BadRequestError('Check your branding details and logo size.');
    }
    const parsed = documentBrandingInput.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestError(
        'Enter a business name, six-digit hex colour, and an optional PNG or JPEG logo.'
      );
    const { displayName, accentColour, logoDataUrl } = parsed.data;
    const fields: {
      org_id: string;
      display_name: string;
      accent_colour: string;
      logo_base64?: string | null;
    } = {
      org_id: workspace.id,
      display_name: displayName,
      accent_colour: accentColour,
    };
    if (logoDataUrl !== undefined) {
      try {
        fields.logo_base64 = logoDataUrl
          ? await normalizeDocumentLogo(logoDataUrl)
          : null;
      } catch {
        throw new BadRequestError(
          'Choose a valid, single-image PNG or JPEG under 200 KB and 4 megapixels.'
        );
      }
    }
    const { data, error } = await db
      .from('organization_document_branding')
      .upsert([fields], { onConflict: 'org_id', defaultToNull: false })
      .select('display_name,accent_colour,logo_base64')
      .single();
    if (error) throw error;
    return json(data.display_name, data.accent_colour, data.logo_base64);
  }
);
