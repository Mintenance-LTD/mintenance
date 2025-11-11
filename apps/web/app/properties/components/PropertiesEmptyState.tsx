'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddPropertyDialog } from './AddPropertyDialog';
import { useRouter } from 'next/navigation';

export function PropertiesEmptyState() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div style={{ position: 'relative', zIndex: isDialogOpen ? 0 : 1 }}>
        <EmptyState
          icon="home"
          title="No properties yet"
          description="Add your first property to start tracking maintenance, jobs, and expenses. Link jobs to specific properties for better organization and financial tracking."
          actionLabel="Add Your First Property"
          onAction={() => setIsDialogOpen(true)}
          variant="illustrated"
        />
      </div>
      <AddPropertyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}

