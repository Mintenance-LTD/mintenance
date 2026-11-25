import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { NotFoundError, ServiceUnavailableError } from '@/lib/errors/api-error';
import {
  databaseError,
  getInspectionRecord,
  privateHeaders,
} from '@/lib/services/property-team/property-inspections';
import { getInspectionPhotoBytes } from '@/lib/services/property-team/inspection-photo-bytes';
import { makeInspectionPdf } from '@/lib/services/property-team/inspection-pdf';

export const maxDuration = 60;

async function readCorrectionChain(
  propertyId: string,
  folderId: string,
  reportId: string,
  nextId: string | null,
  direction: 'earlier' | 'later'
) {
  const chain = [];
  const visited = new Set([reportId]);
  while (nextId) {
    const { data, error } = await db
      .from('property_inspection_reports')
      .select('id,title,inspected_on,created_at,corrects_report_id')
      .eq('property_id', propertyId)
      .eq('folder_id', folderId)
      .eq(direction === 'earlier' ? 'id' : 'corrects_report_id', nextId)
      .maybeSingle();
    databaseError(error);
    if (!data) break;
    if (visited.has(data.id))
      throw new ServiceUnavailableError('Inspection correction history');
    visited.add(data.id);
    chain.push(data);
    nextId = direction === 'earlier' ? data.corrects_report_id : data.id;
  }
  return chain;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const record = await getInspectionRecord(
      user.id,
      params.id,
      params.reportId
    );
    const { report } = record;
    const [property, earlier, later] = await Promise.all([
      db
        .from('properties')
        .select('property_name,address')
        .eq('id', params.id)
        .maybeSingle(),
      readCorrectionChain(
        params.id,
        report.folder_id,
        report.id,
        report.corrects_report_id,
        'earlier'
      ),
      readCorrectionChain(
        params.id,
        report.folder_id,
        report.id,
        report.corrected_by_report_id ? report.id : null,
        'later'
      ),
    ]);
    databaseError(property.error);
    if (!property.data) throw new NotFoundError('Property not found');
    let pdf: ArrayBuffer;
    try {
      pdf = await makeInspectionPdf(
        record,
        property.data,
        [...earlier.reverse(), ...later],
        async (sourceId) =>
          (await getInspectionPhotoBytes(params.id, sourceId)).data
      );
    } catch {
      throw new ServiceUnavailableError('Inspection PDF');
    }
    return new NextResponse(pdf, {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-${report.inspected_on}-${report.id}.pdf"`,
      },
    });
  }
);
