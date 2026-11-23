import { formatMoney } from '@/lib/utils/currency';
import { escapeHtml, mintEmailShell } from './shared';

const introductions = new Map([
  [
    'contract-consent',
    'We recorded your signature and choices for this agreement.',
  ],
  [
    'agreement-formed',
    'Both parties have signed. Keep the attached copy for your records.',
  ],
  [
    'legacy-cancellation-information',
    'This records when cancellation information was provided for your existing agreement.',
  ],
  [
    'early-start-request',
    'We recorded a separate request to start work early.',
  ],
]);

const britishTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

function readAgreement(sections: string[], reference: string) {
  const snapshot = sections.find((section) =>
    /^(?:(?:Agreement snapshot|Signed agreement):\n)?\{/.test(section)
  );
  if (!snapshot) return;
  try {
    const { contract } = JSON.parse(snapshot.slice(snapshot.indexOf('{'))) as {
      contract?: { id?: unknown; title?: unknown; amount?: unknown };
    };
    if (contract?.id === reference) return contract;
  } catch {
    // Older outbox rows still carry their complete original record as an attachment.
  }
}

function formatChoice(value: string) {
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value;
}

function formatRecordedTime(value: string) {
  const date = new Date(
    value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
  );
  return Number.isNaN(date.getTime())
    ? value
    : `${britishTime.format(date)} UK time`;
}

export function agreementRecordEmail(
  eventKey: string,
  subject: string,
  body: string
) {
  const [event, reference] = eventKey.split(':');
  const introduction = introductions.get(event);
  if (!introduction) return;

  const [summary, ...sections] = body.replace(/\r\n/g, '\n').split('\n\n');
  const fields = new Map(
    summary.split('\n').flatMap((line) => {
      const separator = line.indexOf(': ');
      return separator < 0
        ? []
        : [[line.slice(0, separator), line.slice(separator + 2)] as const];
    })
  );
  const agreement = readAgreement(sections, reference);
  const details = [
    [
      'Agreement',
      typeof agreement?.title === 'string' ? agreement.title : undefined,
    ],
    ['Contract reference', reference],
    [
      'Agreed price',
      typeof agreement?.amount === 'number' && Number.isFinite(agreement.amount)
        ? formatMoney(agreement.amount)
        : undefined,
    ],
    ...[
      ['Accepted at', 'Signature recorded'],
      ['Agreement formed', 'Agreement formed'],
      ['Information provided', 'Information provided'],
      ['Requested at', 'Early start requested at'],
      ['Cancellation deadline (exclusive)', 'Cancellation deadline (before)'],
      ['Cancellation deadline', 'Cancellation deadline'],
    ].map(([key, label]) => {
      const value = fields.get(key);
      return [label, value ? formatRecordedTime(value) : undefined];
    }),
    ...['Early start requested', 'Full-performance acknowledgement'].map(
      (label) => {
        const value = fields.get(label);
        return [label, value ? formatChoice(value) : undefined];
      }
    ),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const attachmentNote =
    'The attached record contains the full agreement snapshot, recorded choices and any cancellation information provided with this email.';
  return {
    textContent: [
      introduction,
      details.map(([label, value]) => `${label}: ${value}`).join('\n'),
      attachmentNote,
    ].join('\n\n'),
    htmlContent: mintEmailShell(
      subject,
      introduction,
      `<p>${introduction}</p><dl>${details.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl><p>${attachmentNote}</p>`,
      '<p>Mintenance</p>'
    ),
    attachment: [
      {
        name: 'Mintenance-agreement-record.txt',
        content: Buffer.from(body, 'utf8').toString('base64'),
      },
    ],
  };
}
