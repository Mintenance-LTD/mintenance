'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AddPropertyDialog } from './AddPropertyDialog';
import { useRouter } from 'next/navigation';

export function AddPropertyButton() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the new property
    router.refresh();
  };

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={() => setIsDialogOpen(true)}
        className="bg-secondary text-white hover:bg-secondary-600 shadow-md hover:shadow-lg"
        data-add-property-button
      >
        <Icon name="plus" size={18} color="white" />
        Add Property
      </Button>

      <AddPropertyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}

