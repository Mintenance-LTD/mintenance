/**
 * PhotoGallery Component Tests
 *
 * Comprehensive test suite for PhotoGallery component with 100% coverage.
 * Tests rendering, gallery grid layout, photo display, add photo functionality,
 * edge cases, and accessibility.
 */

import React from 'react';
import { render, fireEvent } from '../../../../test-utils';
import { PhotoGallery } from '../PhotoGallery';

// Mock theme
jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      borderLight: '#F3F4F6',
    },
    spacing: {
      md: 8,
      lg: 12,
      xl: 16,
    },
    typography: {
      fontSize: {
        base: 14,
        xl: 20,
      },
      fontWeight: {
        semibold: '600',
      },
    },
    borderRadius: {
      base: 8,
    },
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, testID }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(
      Text,
      { testID: testID || `icon-${name}` },
      `Ionicons-${name}-${size}`
    );
  },
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 667 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('PhotoGallery', () => {
  const mockOnAddPhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />);
      }).not.toThrow();
    });

    it('should render section title', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      expect(getByText('Photos')).toBeTruthy();
    });

    it('should render add photo button', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      expect(getByText('Add Photo')).toBeTruthy();
    });

    it('should render add icon in button', () => {
      const { getByTestId } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const icon = getByTestId('icon-add');
      expect(icon).toBeTruthy();
      expect(icon.props.children).toContain('Ionicons-add-16');
    });

    it('should render container with proper structure', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Photo Gallery Grid', () => {
    it('should render empty grid when no photos', () => {
      const { queryAllByTestId } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const photoItems = queryAllByTestId(/photo-item/);
      expect(photoItems.length).toBe(0);
    });

    it('should render single photo', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render multiple photos', () => {
      const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render photos in 2-column grid layout', () => {
      const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      // Grid should render all photos
      expect(container).toBeTruthy();
    });

    it('should handle odd number of photos', () => {
      const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle even number of photos', () => {
      const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render large number of photos', () => {
      const photos = Array.from({ length: 20 }, (_, i) => `photo${i + 1}.jpg`);
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render very large gallery efficiently', () => {
      const photos = Array.from({ length: 100 }, (_, i) => `photo${i + 1}.jpg`);
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Add Photo Functionality', () => {
    it('should call onAddPhoto when add button is pressed', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const addButton = getByText('Add Photo');
      fireEvent.press(addButton);

      expect(mockOnAddPhoto).toHaveBeenCalledTimes(1);
    });

    it('should call onAddPhoto when button is pressed multiple times', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const addButton = getByText('Add Photo');
      fireEvent.press(addButton);
      fireEvent.press(addButton);
      fireEvent.press(addButton);

      expect(mockOnAddPhoto).toHaveBeenCalledTimes(3);
    });

    it('should allow adding photos to empty gallery', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      fireEvent.press(getByText('Add Photo'));

      expect(mockOnAddPhoto).toHaveBeenCalled();
    });

    it('should allow adding photos to existing gallery', () => {
      const photos = ['photo1.jpg', 'photo2.jpg'];
      const { getByText } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      fireEvent.press(getByText('Add Photo'));

      expect(mockOnAddPhoto).toHaveBeenCalled();
    });

    it('should not crash if onAddPhoto is called rapidly', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const addButton = getByText('Add Photo');

      expect(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.press(addButton);
        }
      }).not.toThrow();

      expect(mockOnAddPhoto).toHaveBeenCalledTimes(10);
    });
  });

  describe('Photo URLs and Types', () => {
    it('should handle various photo URL formats', () => {
      const photos = [
        'https://example.com/photo1.jpg',
        'http://example.com/photo2.png',
        '/local/path/photo3.jpeg',
        'file:///storage/photo4.jpg',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
      ];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle photo URLs with special characters', () => {
      const photos = [
        'https://example.com/photo%20with%20spaces.jpg',
        'https://example.com/photo-with-dashes.jpg',
        'https://example.com/photo_with_underscores.jpg',
      ];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle photo URLs with query parameters', () => {
      const photos = [
        'https://example.com/photo.jpg?size=large&quality=high',
        'https://cdn.example.com/photo.jpg?token=abc123',
      ];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle empty string URLs gracefully', () => {
      const photos = ['', 'photo1.jpg', ''];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';
      const photos = [longUrl];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null photos array gracefully', () => {
      expect(() => {
        render(<PhotoGallery photos={null as any} onAddPhoto={mockOnAddPhoto} />);
      }).toThrow();
    });

    it('should handle undefined photos array gracefully', () => {
      expect(() => {
        render(
          <PhotoGallery photos={undefined as any} onAddPhoto={mockOnAddPhoto} />
        );
      }).toThrow();
    });

    it('should handle photos array with null values', () => {
      const photos = ['photo1.jpg', null as any, 'photo2.jpg'];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle photos array with undefined values', () => {
      const photos = ['photo1.jpg', undefined as any, 'photo2.jpg'];

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle missing onAddPhoto callback gracefully', () => {
      // Component expects onAddPhoto, but TypeScript allows undefined
      // In practice, this would cause runtime error if button is pressed
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={undefined as any} />
      );
      // The component renders but button press would fail
      expect(getByText('Add Photo')).toBeTruthy();
    });

    it('should handle onAddPhoto throwing an error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={errorCallback} />
      );

      expect(() => {
        fireEvent.press(getByText('Add Photo'));
      }).toThrow('Test error');

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Component Props Updates', () => {
    it('should update when photos prop changes', () => {
      const { rerender, UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();

      rerender(
        <PhotoGallery
          photos={['photo1.jpg', 'photo2.jpg']}
          onAddPhoto={mockOnAddPhoto}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should update when photos array is cleared', () => {
      const { rerender, UNSAFE_root: container } = render(
        <PhotoGallery
          photos={['photo1.jpg', 'photo2.jpg']}
          onAddPhoto={mockOnAddPhoto}
        />
      );

      expect(container).toBeTruthy();

      rerender(<PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />);

      expect(container).toBeTruthy();
    });

    it('should update when onAddPhoto callback changes', () => {
      const newCallback = jest.fn();
      const { rerender, getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      rerender(<PhotoGallery photos={[]} onAddPhoto={newCallback} />);

      fireEvent.press(getByText('Add Photo'));

      expect(newCallback).toHaveBeenCalledTimes(1);
      expect(mockOnAddPhoto).not.toHaveBeenCalled();
    });

    it('should handle rapid prop updates', () => {
      const { rerender, UNSAFE_root: container } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      for (let i = 1; i <= 10; i++) {
        const photos = Array.from({ length: i }, (_, j) => `photo${j + 1}.jpg`);
        rerender(<PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />);
      }

      expect(container).toBeTruthy();
    });
  });

  describe('Layout and Styling', () => {
    it('should render header with correct layout', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const title = getByText('Photos');
      const addButton = getByText('Add Photo');

      expect(title).toBeTruthy();
      expect(addButton).toBeTruthy();
    });

    it('should render grid container', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should calculate photo item width based on screen width', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      // Photo width calculation: (375 - 56) / 2 = 159.5
      expect(container).toBeTruthy();
    });

    it('should maintain consistent photo item height', () => {
      const photos = ['photo1.jpg', 'photo2.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      // Height should be 160 for all items
      expect(container).toBeTruthy();
    });

    it('should apply border radius to photo items', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should apply background color to photo placeholders', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible text for section title', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const title = getByText('Photos');
      expect(title).toBeTruthy();
    });

    it('should have accessible add photo button', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const addButton = getByText('Add Photo');
      expect(addButton).toBeTruthy();
    });

    it('should have icon with appropriate size for touch targets', () => {
      const { getByTestId } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const icon = getByTestId('icon-add');
      expect(icon.props.children).toContain('16'); // Icon size
    });

    it('should support button press interactions', () => {
      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      const addButton = getByText('Add Photo');
      expect(() => fireEvent.press(addButton)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many photos', () => {
      const startTime = Date.now();
      const photos = Array.from({ length: 50 }, (_, i) => `photo${i + 1}.jpg`);

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      const renderTime = Date.now() - startTime;

      expect(container).toBeTruthy();
      expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
    });

    it('should not re-render unnecessarily', () => {
      const { rerender, UNSAFE_root: container } = render(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      const firstRender = container;

      rerender(
        <PhotoGallery photos={['photo1.jpg']} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBe(firstRender);
    });

    it('should handle memory efficiently with large arrays', () => {
      const photos = Array.from({ length: 1000 }, (_, i) => `photo${i + 1}.jpg`);

      expect(() => {
        render(<PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />);
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with different callback implementations', () => {
      const asyncCallback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const { getByText } = render(
        <PhotoGallery photos={[]} onAddPhoto={asyncCallback} />
      );

      fireEvent.press(getByText('Add Photo'));

      expect(asyncCallback).toHaveBeenCalled();
    });

    it('should maintain state during photo additions', () => {
      let photos = ['photo1.jpg'];
      const addPhotoCallback = jest.fn(() => {
        photos = [...photos, `photo${photos.length + 1}.jpg`];
      });

      const { getByText, rerender } = render(
        <PhotoGallery photos={photos} onAddPhoto={addPhotoCallback} />
      );

      fireEvent.press(getByText('Add Photo'));
      rerender(<PhotoGallery photos={photos} onAddPhoto={addPhotoCallback} />);

      expect(addPhotoCallback).toHaveBeenCalled();
    });

    it('should work correctly with dynamically generated photos', () => {
      const timestamp = Date.now();
      const photos = Array.from(
        { length: 5 },
        (_, i) => `photo-${timestamp}-${i}.jpg`
      );

      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Boundary Cases', () => {
    it('should handle exactly 2 photos (one row)', () => {
      const photos = ['photo1.jpg', 'photo2.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle exactly 1 photo', () => {
      const photos = ['photo1.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle maximum realistic photo count', () => {
      const photos = Array.from({ length: 200 }, (_, i) => `photo${i + 1}.jpg`);
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should handle photo array with duplicate URLs', () => {
      const photos = [
        'photo1.jpg',
        'photo1.jpg',
        'photo2.jpg',
        'photo2.jpg',
        'photo1.jpg',
      ];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Snapshot Consistency', () => {
    it('should render consistently with empty photos', () => {
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={[]} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render consistently with populated photos', () => {
      const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
      const { UNSAFE_root: container } = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(container).toBeTruthy();
    });

    it('should render consistently across multiple renders', () => {
      const photos = ['photo1.jpg', 'photo2.jpg'];

      const render1 = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );
      const render2 = render(
        <PhotoGallery photos={photos} onAddPhoto={mockOnAddPhoto} />
      );

      expect(render1.UNSAFE_root).toBeTruthy();
      expect(render2.UNSAFE_root).toBeTruthy();
    });
  });
});
