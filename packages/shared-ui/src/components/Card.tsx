import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

function CardHeader({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`border-b border-slate-200 px-4 py-3 ${className}`}
      {...props}
    />
  );
}

function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`px-4 py-3 ${className}`} {...props} />;
}

function CardFooter({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`border-t border-slate-200 px-4 py-3 ${className}`}
      {...props}
    />
  );
}
