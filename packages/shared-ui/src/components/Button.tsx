import * as React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'link' | 'danger' | 'destructive' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-900',
  outline: 'border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400',
  link: 'bg-transparent text-blue-600 hover:text-blue-700 hover:underline underline-offset-4',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => (
    <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />
  )
);
Button.displayName = 'Button';

