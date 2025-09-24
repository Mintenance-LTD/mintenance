import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`} {...props} />
  );
}

export function CardHeader({ className = '', ...props }: CardProps) {
  return <div className={`border-b border-slate-200 px-4 py-3 ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`px-4 py-3 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: CardProps) {
  return <div className={`border-t border-slate-200 px-4 py-3 ${className}`} {...props} />;
}

