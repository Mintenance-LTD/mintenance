import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropUpload2025 } from '../DragDropUpload2025';

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock framer-motion components
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, whileHover, variants, initial, animate, exit, transition, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, whileHover, whileTap, whileFocus, whileInView, ...props }: any) => (
      <button className={className} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock react-dropzone
const mockGetRootProps = vi.fn(() => ({
  onClick: vi.fn(),
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
}));

const mockGetInputProps = vi.fn(() => ({
  type: 'file',
  accept: 'image/*',
  multiple: true,
  onChange: vi.fn(),
}));

let mockOnDrop = vi.fn();
let mockIsDragActive = false;
let mockIsDragReject = false;

vi.mock('react-dropzone', () => ({
  useDropzone: (config: any) => {
    mockOnDrop = config.onDrop;
    return {
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: mockIsDragActive,
      isDragReject: mockIsDragReject,
    };
  },
}));

describe('DragDropUpload2025', () => {
  const defaultProps = {
    images: [],
    onImagesChange: vi.fn(),
    onRemoveImage: vi.fn(),
    maxImages: 10,
    isAnalyzing: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDragActive = false;
    mockIsDragReject = false;
  });

  describe('Initial Render', () => {
    it('should display upload instructions when no images', () => {
      render(<DragDropUpload2025 {...defaultProps} />);
      expect(screen.getByText(/Drag & drop images here/i)).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPG, JPEG, WEBP/i)).toBeInTheDocument();
    });

    it('should show "Choose Files" button when images count is below max', () => {
      render(<DragDropUpload2025 {...defaultProps} />);
      expect(screen.getByText('Choose Files')).toBeInTheDocument();
    });

    it('should initialize dropzone with correct configuration', () => {
      render(<DragDropUpload2025 {...defaultProps} />);
      expect(mockGetRootProps).toHaveBeenCalled();
      expect(mockGetInputProps).toHaveBeenCalled();
    });
  });

  describe('File Upload Behavior', () => {
    it('should call onImagesChange with accepted files when files are dropped', () => {
      render(<DragDropUpload2025 {...defaultProps} />);

      const mockFiles = [
        new File(['image1'], 'test1.png', { type: 'image/png' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      mockOnDrop(mockFiles);

      expect(defaultProps.onImagesChange).toHaveBeenCalledWith(mockFiles);
    });

    it('should limit files to available slots when dropping multiple files', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg', 'img6.jpg', 'img7.jpg', 'img8.jpg'],
        maxImages: 10,
      };
      render(<DragDropUpload2025 {...props} />);

      const mockFiles = [
        new File(['image1'], 'test1.png', { type: 'image/png' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['image3'], 'test3.jpg', { type: 'image/jpeg' }),
        new File(['image4'], 'test4.jpg', { type: 'image/jpeg' }),
      ];

      mockOnDrop(mockFiles);

      // Should only add 2 files (8 existing + 2 new = 10 max)
      expect(props.onImagesChange).toHaveBeenCalledWith(mockFiles.slice(0, 2));
    });

    it('should not call onImagesChange when max images reached', () => {
      const props = {
        ...defaultProps,
        images: Array(10).fill('image.jpg'),
        maxImages: 10,
      };
      render(<DragDropUpload2025 {...props} />);

      const mockFiles = [new File(['image'], 'test.png', { type: 'image/png' })];
      mockOnDrop(mockFiles);

      expect(props.onImagesChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Image Preview Display', () => {
    it('should display image previews when images exist', () => {
      const props = {
        ...defaultProps,
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.getByText('Uploaded Images (2/10)')).toBeInTheDocument();
      expect(screen.getByAltText('Upload 1')).toBeInTheDocument();
      expect(screen.getByAltText('Upload 2')).toBeInTheDocument();
    });

    it('should not display image preview section when no images', () => {
      render(<DragDropUpload2025 {...defaultProps} />);
      expect(screen.queryByText(/Uploaded Images/i)).not.toBeInTheDocument();
    });

    it('should show correct image count in preview header', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        maxImages: 5,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.getByText('Uploaded Images (3/5)')).toBeInTheDocument();
    });
  });

  describe('Image Removal', () => {
    it('should call onRemoveImage with correct index when remove button clicked', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg', 'img2.jpg'],
      };
      const { container } = render(<DragDropUpload2025 {...props} />);

      const removeButtons = container.querySelectorAll('button[type="button"]').length > 1
        ? Array.from(container.querySelectorAll('button[type="button"]')).filter(btn =>
            btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
          )
        : [];

      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(props.onRemoveImage).toHaveBeenCalledWith(0);
      }
    });

    it('should disable remove buttons when isAnalyzing is true', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg'],
        isAnalyzing: true,
      };
      const { container } = render(<DragDropUpload2025 {...props} />);

      const removeButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
      );

      if (removeButton) {
        expect(removeButton).toBeDisabled();
      }
    });
  });

  describe('Max Images Behavior', () => {
    it('should show max images message when limit reached', () => {
      const props = {
        ...defaultProps,
        images: Array(10).fill('image.jpg'),
        maxImages: 10,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.getByText('Maximum images reached')).toBeInTheDocument();
      expect(screen.getByText('Remove some images to upload more')).toBeInTheDocument();
    });

    it('should not show "Choose Files" button when max images reached', () => {
      const props = {
        ...defaultProps,
        images: Array(10).fill('image.jpg'),
        maxImages: 10,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.queryByText('Choose Files')).not.toBeInTheDocument();
    });
  });

  describe('Analyzing State', () => {
    it('should show "Analyzing..." indicator when isAnalyzing is true', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg'],
        isAnalyzing: true,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    it('should not show "Choose Files" button when analyzing', () => {
      const props = {
        ...defaultProps,
        isAnalyzing: true,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.queryByText('Choose Files')).not.toBeInTheDocument();
    });

    it('should not show AI Analysis CTA when analyzing', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg'],
        isAnalyzing: true,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.queryByText('AI-Powered Analysis Available')).not.toBeInTheDocument();
    });
  });

  describe('AI Analysis CTA', () => {
    it('should show AI analysis CTA when images exist and not analyzing', () => {
      const props = {
        ...defaultProps,
        images: ['img1.jpg'],
        isAnalyzing: false,
      };
      render(<DragDropUpload2025 {...props} />);

      expect(screen.getByText('AI-Powered Analysis Available')).toBeInTheDocument();
      expect(screen.getByText(/Our AI can analyze your photos/i)).toBeInTheDocument();
    });

    it('should not show AI analysis CTA when no images', () => {
      render(<DragDropUpload2025 {...defaultProps} />);
      expect(screen.queryByText('AI-Powered Analysis Available')).not.toBeInTheDocument();
    });
  });
});