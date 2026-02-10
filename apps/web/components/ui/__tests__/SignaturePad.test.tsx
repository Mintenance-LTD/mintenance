import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { SignaturePad } from '../SignaturePad';

vi.mock('./Button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick} {...props}>{children}</button>,
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: { primary: '#0D9488', border: '#E5E7EB', textSecondary: '#9CA3AF', surface: '#FFF' },
    spacing: { 2: '8px', 3: '12px', 4: '16px' },
    borderRadius: { lg: '12px' },
  },
}));

describe('SignaturePad', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      lineWidth: 2,
      lineCap: 'round',
      strokeStyle: '#000',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    });
  });

  it('should render a canvas', () => {
    const { container } = render(<SignaturePad onSave={vi.fn()} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('should render clear and save buttons', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
    expect(screen.getByText(/save/i)).toBeInTheDocument();
  });
});
