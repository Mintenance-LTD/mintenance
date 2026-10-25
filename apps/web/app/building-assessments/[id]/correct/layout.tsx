import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Correct Assessment Detections | Mintenance',
  description: 'Review stored building assessment detections.',
};

/** Keep correction-page metadata while sharing the parent survey shell. */
export default function CorrectAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The parent assessment layout supplies the shared app shell.
  return children;
}
