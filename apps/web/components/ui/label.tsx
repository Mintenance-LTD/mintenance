'use client'

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Define base classes as a constant to ensure consistent SSR/client rendering
const LABEL_BASE_CLASSES = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

const labelVariants = cva(LABEL_BASE_CLASSES)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => {
  // Use constant directly to ensure consistent class merging on server and client
  const mergedClasses = cn(LABEL_BASE_CLASSES, className)
  
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={mergedClasses}
      {...props}
    />
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

