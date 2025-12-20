import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MessageCircle } from 'lucide-react';

interface MessageContractorButtonProps {
  jobId: string;
  contractorId: string;
  contractorName: string;
  jobTitle: string;
}

export function MessageContractorButton({
  jobId,
  contractorId,
  contractorName,
  jobTitle,
}: MessageContractorButtonProps) {
  const href = `/messages/${jobId}?userId=${contractorId}&userName=${encodeURIComponent(contractorName)}&jobTitle=${encodeURIComponent(jobTitle)}`;

  return (
    <Link href={href} className="block">
      <Button
        variant="primary"
        fullWidth
        leftIcon={<MessageCircle className="h-5 w-5" />}
        className="w-full"
      >
        Message Contractor
      </Button>
    </Link>
  );
}
