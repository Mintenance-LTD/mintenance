import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';
import {
  formatTenancyDate,
  INSPECTION_KINDS,
  tenancyPeriodLabel,
  uploadedPhotoLabel,
} from '@mintenance/shared';
import type { getInspectionRecord } from './property-inspections';

type InspectionRecord = Awaited<ReturnType<typeof getInspectionRecord>>;
type Photo = InspectionRecord['photos'][number];
type LinkedReport = Pick<
  InspectionRecord['report'],
  'id' | 'title' | 'inspected_on' | 'created_at'
>;

const recordedDate = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const recorded = (value: string) =>
  recordedDate.format(new Date(value)) + ' UTC';
const margin = 17;
const bodyWidth = 176;
const bottom = 274;
const imageBudget = 3_600_000;
const fontName = 'Inter-Regular.ttf';
let fontLoad: Promise<string> | undefined;

function getFont() {
  const fontAsset = 'mobile/assets/fonts/Inter-Regular.ttf';
  fontLoad ??= readFile(path.join(process.cwd(), '..', fontAsset), 'base64')
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return readFile(path.join(process.cwd(), 'apps', fontAsset), 'base64');
    })
    .catch((error) => {
      fontLoad = undefined;
      throw error;
    });
  return fontLoad;
}

async function preparePhoto(input: Blob, maxBytes: number) {
  const original = Buffer.from(await input.arrayBuffer());
  // Resize and compress the visual copies while keeping the saved evidence as-is.
  for (const [side, quality] of [
    [1600, 82],
    [1250, 72],
    [900, 65],
    [650, 57],
    [420, 48],
    [260, 42],
  ]) {
    const photo = await sharp(original, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({
        width: side,
        height: side,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    if (photo.data.length <= maxBytes) return photo;
  }
  throw new Error('Inspection photo exceeds the PDF size budget');
}

export async function makeInspectionPdf(
  { report, folder, photos }: InspectionRecord,
  property: { property_name: string; address: string },
  corrections: LinkedReport[],
  loadPhoto: (sourceId: string) => Promise<Blob>
) {
  const doc = new jsPDF({
    format: 'a4',
    unit: 'mm',
    compress: true,
    putOnlyUsedFonts: true,
  });
  doc.addFileToVFS(fontName, await getFont());
  doc.addFont(fontName, 'Inter', 'normal');
  doc.setFont('Inter');
  doc.setProperties({
    title: report.title,
    subject: 'Mintenance tenancy inspection',
    creator: 'Mintenance',
  });
  let y = 19;
  const ensureRoom = (height: number) => {
    if (y + height <= bottom) return;
    doc.addPage();
    y = 19;
  };
  function paragraph(text: string, size = 10) {
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(text, bodyWidth);
    const lineHeight = size * 0.46;
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 2;
  }
  function heading(label: string) {
    ensureRoom(18);
    y += 4;
    doc.setTextColor(15, 90, 70);
    paragraph(label, 13);
    doc.setTextColor(24, 34, 31);
  }
  paragraph('MINTENANCE  /  TENANCY INSPECTION', 10);
  heading(report.title);
  paragraph(`${property.property_name} · ${property.address}`);
  paragraph(`Reference: ${report.id}`);
  paragraph(
    `Inspection type: ${INSPECTION_KINDS.find((kind) => kind.value === report.kind)?.label ?? report.kind}`
  );
  paragraph(`Inspection date: ${formatTenancyDate(report.inspected_on)}`);
  paragraph(`Recorded: ${recorded(report.created_at)}`);

  heading('Tenancy');
  paragraph(folder.label);
  paragraph(
    report.tenancy_starts_on
      ? `Dates when recorded: ${tenancyPeriodLabel(report.tenancy_starts_on, report.tenancy_ends_on)}`
      : 'Dates when recorded: unavailable for this report'
  );
  paragraph(
    `Current dates: ${tenancyPeriodLabel(folder.starts_on, folder.ends_on)}`
  );
  if (report.date_exception_reason)
    paragraph(`Date exception: ${report.date_exception_reason}`);

  heading('Correction history');
  paragraph(
    report.corrected_by_report_id
      ? 'Status: Corrected'
      : 'Status: Current version'
  );
  for (const linked of corrections) {
    const label =
      linked.id === report.corrects_report_id
        ? 'Corrects'
        : linked.id === report.corrected_by_report_id
          ? 'Corrected by'
          : 'Linked version';
    ensureRoom(25);
    paragraph(`${label}: ${linked.title}`);
    paragraph(
      `Reference: ${linked.id} · Inspection: ${formatTenancyDate(linked.inspected_on)} · Recorded: ${recorded(linked.created_at)}`
    );
  }

  heading('Observations');
  if (report.outcome === 'no_issues_found') paragraph('No issues found.');
  if (report.outcome === 'evidence_free')
    paragraph('Recorded without observations or photos.');
  if (report.notes) paragraph(report.notes);
  else if (!report.outcome) paragraph('No written observations recorded.');

  if (!photos.length) {
    heading('Room photos');
    paragraph('No photos attached.');
  }
  const bytesPerPhoto = Math.min(
    420_000,
    Math.floor(
      imageBudget /
        Math.max(1, photos.filter((photo) => photo.available).length)
    )
  );
  // Limit simultaneous downloads and image decoding for large portfolios.
  const renderPhoto = async (photo: Photo) =>
    photo.source_photo_id
      ? preparePhoto(await loadPhoto(photo.source_photo_id), bytesPerPhoto)
      : null;
  for (let index = 0; index < photos.length; index += 3) {
    const batch = photos.slice(index, index + 3);
    const copies = await Promise.all(batch.map(renderPhoto));
    for (const [offset, photo] of batch.entries()) {
      const copy = copies[offset];
      const scale = copy
        ? Math.min(bodyWidth / copy.info.width, 105 / copy.info.height)
        : 0;
      const height = copy ? copy.info.height * scale : 0;
      const isFirst = index + offset === 0;
      ensureRoom(height + (isFirst ? 44 : 28));
      if (isFirst) heading(`Room photos (${photos.length})`);
      paragraph(`${photo.room_type.replaceAll('_', ' ')} · ${photo.file_name}`);
      paragraph(uploadedPhotoLabel(photo.uploaded_at), 9);
      if (copy) {
        doc.addImage(
          copy.data,
          'JPEG',
          margin,
          y,
          copy.info.width * scale,
          height
        );
        y += height + 8;
      } else paragraph('Original photo unavailable.');
    }
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(74, 83, 80);
    doc.text(report.id, margin, 286);
    doc.text(`${page} / ${pages}`, 193, 286, { align: 'right' });
  }

  const pdf = doc.output('arraybuffer');
  if (pdf.byteLength > 4_400_000)
    throw new Error('Inspection PDF exceeds the response size budget');
  return pdf;
}
