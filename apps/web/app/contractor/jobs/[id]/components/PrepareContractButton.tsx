'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import { CreateContractDialog } from '@/app/contractor/messages/components/CreateContractDialog';
import { useRouter } from 'next/navigation';

interface PrepareContractButtonProps {
  jobId: string;
  jobTitle: string;
}

export function PrepareContractButton({ jobId, jobTitle }: PrepareContractButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        variant="primary"
        fullWidth
        leftIcon={<FileText className="h-5 w-5" />}
        onClick={() => setOpen(true)}
      >
        Prepare Contract
      </Button>
      <CreateContractDialog
        open={open}
        onOpenChange={setOpen}
        jobId={jobId}
        jobTitle={jobTitle}
        onContractCreated={() => router.refresh()}
      />
    </>
  );
}
