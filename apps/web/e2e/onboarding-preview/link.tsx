import React from 'react';
import { previewHref } from './navigation';
export default function Link({
  href,
  children,
  prefetch: _prefetch,
  ...props
}: any) {
  return (
    <a href={previewHref(href)} {...props}>
      {children}
    </a>
  );
}
