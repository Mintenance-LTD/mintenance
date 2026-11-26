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
const margin = 16;
const bodyWidth = 178;
const bottom = 273;
const ink = '#172e28';
const muted = '#4b625a';
const green = '#0e5545';
const mint = '#eef6f1';
const rule = '#d4e2db';
const imageBudget = 3_600_000;
const fontName = 'Inter-Regular.ttf';
let fontLoad: Promise<string> | undefined;

function getFont() {
  const fontAsset = path.join('assets', 'fonts', fontName);
  fontLoad ??= readFile(path.join(process.cwd(), fontAsset), 'base64')
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return readFile(
        path.join(process.cwd(), 'apps', 'web', fontAsset),
        'base64'
      );
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
  let y = 0;
  function pageHeader(first: boolean) {
    const height = first ? 25 : 17;
    doc.setFillColor(green).rect(0, 0, 210, height, 'F');
    doc.setFillColor('#a8ddba').rect(margin, height - 2, 16, 2, 'F');
    doc.setTextColor('#ffffff').setFontSize(first ? 14 : 10);
    doc.text('Mintenance', margin, first ? 15 : 10.5);
    doc.setFontSize(8);
    doc.text('TENANCY INSPECTION', 210 - margin, first ? 15 : 10.5, {
      align: 'right',
    });
    y = height + (first ? 13 : 10);
  }
  const ensureRoom = (height: number) => {
    if (y + height <= bottom) return;
    doc.addPage();
    pageHeader(false);
  };
  const split = (text: string, size: number, width = bodyWidth) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text, width) as string[];
  };
  function paragraph(text: string, size = 10, colour = ink) {
    const lines = split(text, size);
    const lineHeight = size * 0.45;
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.setTextColor(colour).setFontSize(size);
      doc.text(line, margin, y, { baseline: 'top' });
      y += lineHeight;
    }
    y += 2;
  }
  function heading(number: string, label: string, lead = 0) {
    ensureRoom(19 + lead);
    doc
      .setDrawColor(rule)
      .setLineWidth(0.25)
      .line(margin, y, 210 - margin, y);
    y += 5;
    doc.setTextColor(green).setFontSize(8.5);
    doc.text(number, margin, y + 0.8, { baseline: 'top' });
    doc.setTextColor(green).setFontSize(12.5);
    doc.text(label, margin + 11, y, { baseline: 'top' });
    y += 10;
  }
  function item(label: string, value: string) {
    ensureRoom(15);
    paragraph(label, 8, muted);
    paragraph(value, 10);
  }

  const kind =
    INSPECTION_KINDS.find((option) => option.value === report.kind)?.label ??
    report.kind;
  const status = report.corrected_by_report_id
    ? 'Corrected'
    : report.corrects_report_id
      ? 'Current correction'
      : 'Current version';

  pageHeader(true);
  paragraph(report.title, 22);
  paragraph(property.property_name, 11, green);
  paragraph(property.address, 10, muted);
  y += 5;

  // The overview uses fixed, bounded labels; long names and notes use
  // the flowing layout rather than being clipped to a fixed card.
  const overview = [
    ['INSPECTION TYPE', kind],
    ['INSPECTION DATE', formatTenancyDate(report.inspected_on)],
    ['REPORT VERSION', status],
  ];
  const cellWidth = bodyWidth / overview.length;
  const overviewLines = overview.map(([, value]) =>
    split(value, 10.5, cellWidth - 12)
  );
  const bandHeight =
    17 + Math.max(...overviewLines.map((lines) => lines.length)) * 4.5;
  ensureRoom(bandHeight);
  doc
    .setFillColor(mint)
    .roundedRect(margin, y, bodyWidth, bandHeight, 2, 2, 'F');
  for (const [index, [label]] of overview.entries()) {
    const x = margin + index * cellWidth;
    if (index > 0) {
      doc.setDrawColor(rule).line(x, y + 5, x, y + bandHeight - 5);
    }
    doc.setTextColor(green).setFontSize(7.5);
    doc.text(label, x + 6, y + 5, { baseline: 'top' });
    doc.setTextColor(ink).setFontSize(10.5);
    overviewLines[index].forEach((line, lineIndex) =>
      doc.text(line, x + 6, y + 12 + lineIndex * 4.5, { baseline: 'top' })
    );
  }
  y += bandHeight + 9;

  heading('01', 'Inspection findings');
  if (report.outcome === 'no_issues_found')
    paragraph('No issues found.', 12, green);
  if (report.outcome === 'evidence_free')
    paragraph('Recorded without observations or photos.', 11);
  if (report.notes) paragraph(report.notes);
  else if (!report.outcome)
    paragraph('No written observations recorded.', 10, muted);
  y += 6;

  heading('02', 'Tenancy and record details');
  paragraph(folder.label, 11);
  item(
    'Tenancy dates at time of report',
    report.tenancy_starts_on
      ? tenancyPeriodLabel(report.tenancy_starts_on, report.tenancy_ends_on)
      : 'Unavailable for this report'
  );
  item(
    'Current tenancy dates',
    tenancyPeriodLabel(folder.starts_on, folder.ends_on)
  );
  if (report.date_exception_reason)
    item('Date exception', report.date_exception_reason);
  item('Recorded', recorded(report.created_at));
  y += 5;

  heading('03', 'Version history');
  if (!corrections.length)
    paragraph('No linked versions in this export.', 10, muted);
  for (const linked of corrections) {
    const label =
      linked.id === report.corrects_report_id
        ? 'Corrects'
        : linked.id === report.corrected_by_report_id
          ? 'Corrected by'
          : 'Linked version';
    ensureRoom(25);
    paragraph(label.toUpperCase(), 8, green);
    paragraph(linked.title, 11);
    paragraph(`Reference: ${linked.id}`, 8.5, muted);
    paragraph(
      `Inspected: ${formatTenancyDate(linked.inspected_on)}  /  Recorded: ${recorded(linked.created_at)}`,
      8.5,
      muted
    );
    y += 3;
  }
  y += 5;

  if (!photos.length) {
    heading('04', 'Room photo evidence');
    paragraph('No photos attached.', 10, muted);
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
        ? Math.min((bodyWidth - 8) / copy.info.width, 125 / copy.info.height)
        : 0;
      const width = copy ? copy.info.width * scale : 0;
      const height = copy ? copy.info.height * scale : 0;
      const first = index + offset === 0;
      const caption = `${photo.room_type.replaceAll('_', ' ')} / ${photo.file_name}`;
      const captionHeight = split(caption, 10).length * 4.5;
      const evidenceHeight = 28 + captionHeight + height;
      if (first)
        heading('04', `Room photo evidence (${photos.length})`, evidenceHeight);
      ensureRoom(evidenceHeight);
      paragraph(`PHOTO ${index + offset + 1} OF ${photos.length}`, 8, green);
      paragraph(caption, 10);
      paragraph(uploadedPhotoLabel(photo.uploaded_at), 8.5, muted);
      if (copy) {
        doc.setFillColor('#f3f6f4').rect(margin, y, bodyWidth, height + 8, 'F');
        doc.addImage(
          copy.data,
          'JPEG',
          margin + (bodyWidth - width) / 2,
          y + 4,
          width,
          height
        );
        y += height + 13;
      } else {
        paragraph('Original photo unavailable.', 9, muted);
        y += 4;
      }
    }
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc
      .setDrawColor(rule)
      .setLineWidth(0.25)
      .line(margin, 279, 210 - margin, 279);
    doc.setFontSize(7.5).setTextColor(muted);
    doc.text(`Report ref: ${report.id}`, margin, 285);
    doc.text(`Page ${page} of ${pages}`, 210 - margin, 285, { align: 'right' });
  }

  const pdf = doc.output('arraybuffer');
  if (pdf.byteLength > 4_400_000)
    throw new Error('Inspection PDF exceeds the response size budget');
  return pdf;
}
