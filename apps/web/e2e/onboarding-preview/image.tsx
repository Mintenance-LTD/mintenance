import React from 'react';
export default function Image({
  fill: _fill,
  priority: _priority,
  ...props
}: any) {
  return <img {...props} />;
}
