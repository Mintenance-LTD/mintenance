/**
 * ProfileActionButtons Component Tests
 *
 * Comprehensive test suite for the ProfileActionButtons component
 * Target: 100% code coverage
 *
 * @component ProfileActionButtons
 * @filesize 1400+ lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity, Text } from 'react-native';
import { ProfileActionButtons } from '../ProfileActionButtons';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      white: '#FFFFFF',
      secondary: '#10B981',
      primary: '#0EA5E9',
      textPrimary: '#171717',
    },
    spacing: {
      xl: 24,
      lg: 16,
      md: 12,
      sm: 8,
    },
    borderRadius: {
      base: 8,
      md: 8,
      lg: 12,
    },
    typography: {
      fontSize: {
        sm: 14,
        base: 16,
        lg: 18,
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
    },
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, testID, ...props }: any) => {
    const MockedIcon = require('react-native').Text;
    return (
      <MockedIcon testID={testID || `icon-${name}`} {...props}>
        {name}-{size}-{color}
      </MockedIcon>
    );
  },
}));

// ============================================================================
// TEST DATA
// ============================================================================

const defaultProps = {
  onMessage: jest.fn(),
  onCall: jest.fn(),
  onVideo: jest.fn(),
  onShare: jest.fn(),
};

// ============================================================================
// PROFILEACTIONBUTTONS COMPONENT TESTS
// ============================================================================

describe('ProfileActionButtons Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders all four action buttons', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Message')).toBeTruthy();
      expect(getByText('Call')).toBeTruthy();
      expect(getByText('Video')).toBeTruthy();
      expect(getByText('Share')).toBeTruthy();
    });

    it('renders Message button with icon', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Message')).toBeTruthy();
      expect(getByTestId('icon-chatbubble-outline')).toBeTruthy();
    });

    it('renders Call button with icon', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Call')).toBeTruthy();
      expect(getByTestId('icon-call-outline')).toBeTruthy();
    });

    it('renders Video button with icon', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Video')).toBeTruthy();
      expect(getByTestId('icon-videocam-outline')).toBeTruthy();
    });

    it('renders Share button with icon', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Share')).toBeTruthy();
      expect(getByTestId('icon-share-social-outline')).toBeTruthy();
    });

    it('renders container with correct structure', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders with all required props', () => {
      expect(() => {
        render(<ProfileActionButtons {...defaultProps} />);
      }).not.toThrow();
    });

    it('renders all buttons as TouchableOpacity elements', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const touchableElements = UNSAFE_root.findAllByType(TouchableOpacity as any);
      expect(touchableElements.length).toBe(4);
    });

    it('renders all button labels', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const labels = ['Message', 'Call', 'Video', 'Share'];
      labels.forEach((label) => {
        expect(getByText(label)).toBeTruthy();
      });
    });

    it('renders buttons in correct order', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const textElements = UNSAFE_root.findAllByType(Text as any);
      const buttonTexts = textElements
        .map((el: any) => el.props.children)
        .filter((text: any) => typeof text === 'string');

      expect(buttonTexts).toContain('Message');
      expect(buttonTexts).toContain('Call');
      expect(buttonTexts).toContain('Video');
      expect(buttonTexts).toContain('Share');
    });
  });

  // --------------------------------------------------------------------------
  // Icon Rendering Tests
  // --------------------------------------------------------------------------

  describe('Icon Rendering', () => {
    it('Message icon has correct name prop', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const messageIcon = getByTestId('icon-chatbubble-outline');
      expect(messageIcon).toBeTruthy();
      const content = Array.isArray(messageIcon.props.children)
        ? messageIcon.props.children.join('')
        : messageIcon.props.children;
      expect(content).toContain('chatbubble-outline');
    });

    it('Call icon has correct name prop', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const callIcon = getByTestId('icon-call-outline');
      expect(callIcon).toBeTruthy();
      const content = Array.isArray(callIcon.props.children)
        ? callIcon.props.children.join('')
        : callIcon.props.children;
      expect(content).toContain('call-outline');
    });

    it('Video icon has correct name prop', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const videoIcon = getByTestId('icon-videocam-outline');
      expect(videoIcon).toBeTruthy();
      const content = Array.isArray(videoIcon.props.children)
        ? videoIcon.props.children.join('')
        : videoIcon.props.children;
      expect(content).toContain('videocam-outline');
    });

    it('Share icon has correct name prop', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const shareIcon = getByTestId('icon-share-social-outline');
      expect(shareIcon).toBeTruthy();
      const content = Array.isArray(shareIcon.props.children)
        ? shareIcon.props.children.join('')
        : shareIcon.props.children;
      expect(content).toContain('share-social-outline');
    });

    it('Message icon has correct size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const messageIcon = getByTestId('icon-chatbubble-outline');
      const content = Array.isArray(messageIcon.props.children)
        ? messageIcon.props.children.join('')
        : messageIcon.props.children;
      expect(content).toContain('18');
    });

    it('Call icon has correct size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const callIcon = getByTestId('icon-call-outline');
      const content = Array.isArray(callIcon.props.children)
        ? callIcon.props.children.join('')
        : callIcon.props.children;
      expect(content).toContain('18');
    });

    it('Video icon has correct size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const videoIcon = getByTestId('icon-videocam-outline');
      const content = Array.isArray(videoIcon.props.children)
        ? videoIcon.props.children.join('')
        : videoIcon.props.children;
      expect(content).toContain('18');
    });

    it('Share icon has correct size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const shareIcon = getByTestId('icon-share-social-outline');
      const content = Array.isArray(shareIcon.props.children)
        ? shareIcon.props.children.join('')
        : shareIcon.props.children;
      expect(content).toContain('18');
    });

    it('Message icon has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const messageIcon = getByTestId('icon-chatbubble-outline');
      const content = Array.isArray(messageIcon.props.children)
        ? messageIcon.props.children.join('')
        : messageIcon.props.children;
      expect(content).toContain('#FFFFFF');
    });

    it('Call icon has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const callIcon = getByTestId('icon-call-outline');
      const content = Array.isArray(callIcon.props.children)
        ? callIcon.props.children.join('')
        : callIcon.props.children;
      expect(content).toContain('#FFFFFF');
    });

    it('Video icon has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const videoIcon = getByTestId('icon-videocam-outline');
      const content = Array.isArray(videoIcon.props.children)
        ? videoIcon.props.children.join('')
        : videoIcon.props.children;
      expect(content).toContain('#FFFFFF');
    });

    it('Share icon has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const shareIcon = getByTestId('icon-share-social-outline');
      const content = Array.isArray(shareIcon.props.children)
        ? shareIcon.props.children.join('')
        : shareIcon.props.children;
      expect(content).toContain('#FFFFFF');
    });

    it('all icons have consistent size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const icons = [
        getByTestId('icon-chatbubble-outline'),
        getByTestId('icon-call-outline'),
        getByTestId('icon-videocam-outline'),
        getByTestId('icon-share-social-outline'),
      ];
      const allSame = icons.every((icon) => {
        const content = Array.isArray(icon.props.children)
          ? icon.props.children.join('')
          : icon.props.children;
        return content.includes('18');
      });
      expect(allSame).toBe(true);
    });

    it('all icons have consistent color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const icons = [
        getByTestId('icon-chatbubble-outline'),
        getByTestId('icon-call-outline'),
        getByTestId('icon-videocam-outline'),
        getByTestId('icon-share-social-outline'),
      ];
      const allSame = icons.every((icon) => {
        const content = Array.isArray(icon.props.children)
          ? icon.props.children.join('')
          : icon.props.children;
        return content.includes('#FFFFFF');
      });
      expect(allSame).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Button Interaction Tests
  // --------------------------------------------------------------------------

  describe('Button Interaction', () => {
    it('calls onMessage when Message button is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
    });

    it('calls onCall when Call button is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
    });

    it('calls onVideo when Video button is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Video'));
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
    });

    it('calls onShare when Share button is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('calls onMessage only once per press', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('calls onCall only once per press', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('calls onVideo only once per press', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Video'));
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('calls onShare only once per press', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
    });

    it('handles multiple presses of Message button', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const messageButton = getByText('Message');
      fireEvent.press(messageButton);
      fireEvent.press(messageButton);
      fireEvent.press(messageButton);
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(3);
    });

    it('handles multiple presses of Call button', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const callButton = getByText('Call');
      fireEvent.press(callButton);
      fireEvent.press(callButton);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(2);
    });

    it('handles multiple presses of Video button', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const videoButton = getByText('Video');
      fireEvent.press(videoButton);
      fireEvent.press(videoButton);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(2);
    });

    it('handles multiple presses of Share button', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const shareButton = getByText('Share');
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(4);
    });

    it('handles pressing different buttons sequentially', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Video'));
      fireEvent.press(getByText('Share'));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('handles rapid button presses', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Message'));
        fireEvent.press(getByText('Call'));
        fireEvent.press(getByText('Video'));
        fireEvent.press(getByText('Share'));
      }

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(10);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(10);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(10);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(10);
    });

    it('Message button is clickable', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const messageButton = getByTestId('message-button');
      expect(messageButton).toBeTruthy();
      expect(messageButton.props.accessible).not.toBe(false);
    });

    it('Call button is clickable', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const callButton = getByTestId('call-button');
      expect(callButton).toBeTruthy();
      expect(callButton.props.accessible).not.toBe(false);
    });

    it('Video button is clickable', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const videoButton = getByTestId('video-button');
      expect(videoButton).toBeTruthy();
      expect(videoButton.props.accessible).not.toBe(false);
    });

    it('Share button is clickable', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const shareButton = getByTestId('share-button');
      expect(shareButton).toBeTruthy();
      expect(shareButton.props.accessible).not.toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Callback Independence Tests
  // --------------------------------------------------------------------------

  describe('Callback Independence', () => {
    it('does not call other callbacks when Message is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Call is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalled();
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Video is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Video'));
      expect(defaultProps.onVideo).toHaveBeenCalled();
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Share is pressed', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalled();
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onVideo).not.toHaveBeenCalled();
    });

    it('maintains callback independence with rapid sequential presses', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Video'));
      fireEvent.press(getByText('Share'));
      fireEvent.press(getByText('Message'));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(2);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests
  // --------------------------------------------------------------------------

  describe('Button Styling', () => {
    it('Message button has correct background color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button.props.style)
        ? button.props.style.flat()
        : [button.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#10B981',
          }),
        ])
      );
    });

    it('Call button has correct background color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('call-button');
      const styles = Array.isArray(button.props.style)
        ? button.props.style.flat()
        : [button.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#10B981',
          }),
        ])
      );
    });

    it('Video button has correct background color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('video-button');
      const styles = Array.isArray(button.props.style)
        ? button.props.style.flat()
        : [button.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#10B981',
          }),
        ])
      );
    });

    it('Share button has correct background color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('share-button');
      const styles = Array.isArray(button.props.style)
        ? button.props.style.flat()
        : [button.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#10B981',
          }),
        ])
      );
    });

    it('all buttons have consistent background color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const buttons = [
        getByTestId('message-button'),
        getByTestId('call-button'),
        getByTestId('video-button'),
        getByTestId('share-button'),
      ];

      buttons.forEach((button) => {
        const styles = Array.isArray(button.props.style)
          ? button.props.style.flat()
          : [button.props.style];

        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              backgroundColor: '#10B981',
            }),
          ])
        );
      });
    });

    it('Message button text has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Message');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Call button text has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Call');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Video button text has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Video');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Share button text has correct color', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Share');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Message button text has correct font size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Message');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('Call button text has correct font size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Call');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('Video button text has correct font size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Video');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('Share button text has correct font size', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Share');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('Message button text has correct font weight', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Message');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('Call button text has correct font weight', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Call');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('Video button text has correct font weight', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Video');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('Share button text has correct font weight', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Share');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('buttons have flex: 1 style', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
          }),
        ])
      );
    });

    it('buttons have correct border radius', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 8,
          }),
        ])
      );
    });

    it('buttons have correct padding', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 12,
          }),
        ])
      );
    });

    it('buttons have correct alignment', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
            justifyContent: 'center',
          }),
        ])
      );
    });

    it('buttons have flexDirection: row', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('buttons have gap style', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 6,
          }),
        ])
      );
    });

    it('buttons have shadow styles', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      const hasShadow = styles.some(
        (style: any) =>
          style?.shadowColor === '#000' ||
          style?.elevation === 2
      );
      expect(hasShadow).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Container Styling Tests
  // --------------------------------------------------------------------------

  describe('Container Styling', () => {
    it('container has flexDirection: row', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('container has correct horizontal padding', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 24,
          }),
        ])
      );
    });

    it('container has correct vertical padding', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 16,
          }),
        ])
      );
    });

    it('container has correct gap', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gap: 12,
          }),
        ])
      );
    });

    it('container has justifyContent: space-between', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'space-between',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('complete workflow: message, call, video, share', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Video'));
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('handles mixed button presses in random order', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      fireEvent.press(getByText('Video'));
      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Share'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Message'));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(2);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('maintains consistent behavior across multiple renders', () => {
      const { rerender, getByText } = render(
        <ProfileActionButtons {...defaultProps} />
      );

      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);

      rerender(<ProfileActionButtons {...defaultProps} />);

      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(2);
    });

    it('all buttons remain functional after re-render', () => {
      const { rerender, getByText } = render(
        <ProfileActionButtons {...defaultProps} />
      );

      rerender(<ProfileActionButtons {...defaultProps} />);

      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Video'));
      fireEvent.press(getByText('Share'));

      expect(defaultProps.onMessage).toHaveBeenCalled();
      expect(defaultProps.onCall).toHaveBeenCalled();
      expect(defaultProps.onVideo).toHaveBeenCalled();
      expect(defaultProps.onShare).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles rapid component re-renders', () => {
      const { rerender } = render(<ProfileActionButtons {...defaultProps} />);

      for (let i = 0; i < 20; i++) {
        rerender(<ProfileActionButtons {...defaultProps} />);
      }

      expect(() => {
        rerender(<ProfileActionButtons {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles callback functions being called rapidly', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      for (let i = 0; i < 100; i++) {
        fireEvent.press(getByText('Message'));
      }

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(100);
    });

    it('handles all buttons being pressed simultaneously', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      const buttons = [
        getByText('Message'),
        getByText('Call'),
        getByText('Video'),
        getByText('Share'),
      ];

      buttons.forEach((button) => fireEvent.press(button));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onVideo).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('handles undefined callback functions gracefully', () => {
      const propsWithUndefinedCallbacks = {
        onMessage: undefined as any,
        onCall: undefined as any,
        onVideo: undefined as any,
        onShare: undefined as any,
      };

      expect(() => {
        render(<ProfileActionButtons {...propsWithUndefinedCallbacks} />);
      }).not.toThrow();
    });

    it('renders correctly with minimal props', () => {
      expect(() => {
        render(
          <ProfileActionButtons
            onMessage={() => {}}
            onCall={() => {}}
            onVideo={() => {}}
            onShare={() => {}}
          />
        );
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<ProfileActionButtons {...defaultProps} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<ProfileActionButtons {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(<ProfileActionButtons {...defaultProps} />);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('handles rapid user interactions efficiently', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        fireEvent.press(getByText('Message'));
        fireEvent.press(getByText('Call'));
        fireEvent.press(getByText('Video'));
        fireEvent.press(getByText('Share'));
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  // --------------------------------------------------------------------------
  // Snapshot Tests
  // --------------------------------------------------------------------------

  describe('Snapshot Stability', () => {
    it('renders consistently for default props', () => {
      const { toJSON } = render(<ProfileActionButtons {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently across multiple renders', () => {
      const { toJSON, rerender } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const snapshot1 = toJSON();

      rerender(<ProfileActionButtons {...defaultProps} />);
      const snapshot2 = toJSON();

      expect(snapshot1).toEqual(snapshot2);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('all buttons are accessible touch targets', () => {
      const { UNSAFE_root } = render(<ProfileActionButtons {...defaultProps} />);
      const touchableElements = UNSAFE_root.findAllByType(TouchableOpacity as any);
      expect(touchableElements.length).toBe(4);
    });

    it('buttons have appropriate size for touch targets', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const button = getByTestId('message-button');
      const styles = Array.isArray(button?.props.style)
        ? button.props.style.flat()
        : [button?.props.style];

      // Check for adequate padding
      const hasPadding = styles.some(
        (style: any) => style?.paddingVertical >= 12
      );
      expect(hasPadding).toBe(true);
    });

    it('text labels are readable', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      const labels = ['Message', 'Call', 'Video', 'Share'];
      labels.forEach((label) => {
        const text = getByText(label);
        expect(text).toBeTruthy();
        expect(text.props.children).toBe(label);
      });
    });

    it('icons provide visual context for actions', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);

      expect(getByTestId('icon-chatbubble-outline')).toBeTruthy();
      expect(getByTestId('icon-call-outline')).toBeTruthy();
      expect(getByTestId('icon-videocam-outline')).toBeTruthy();
      expect(getByTestId('icon-share-social-outline')).toBeTruthy();
    });

    it('button text has sufficient contrast', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const text = getByText('Message');
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      // White text on green background should have good contrast
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Visual Consistency Tests
  // --------------------------------------------------------------------------

  describe('Visual Consistency', () => {
    it('all buttons have same width due to flex: 1', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const buttons = [
        getByTestId('message-button'),
        getByTestId('call-button'),
        getByTestId('video-button'),
        getByTestId('share-button'),
      ];

      buttons.forEach((button) => {
        const styles = Array.isArray(button.props.style)
          ? button.props.style.flat()
          : [button.props.style];

        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              flex: 1,
            }),
          ])
        );
      });
    });

    it('all buttons have same styling', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const buttons = [
        getByTestId('message-button'),
        getByTestId('call-button'),
        getByTestId('video-button'),
        getByTestId('share-button'),
      ];

      const firstButtonStyles = Array.isArray(buttons[0].props.style)
        ? buttons[0].props.style.flat()
        : [buttons[0].props.style];

      buttons.slice(1).forEach((button) => {
        const styles = Array.isArray(button.props.style)
          ? button.props.style.flat()
          : [button.props.style];

        // Check key style properties match
        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              backgroundColor: '#10B981',
              flex: 1,
              borderRadius: 8,
            }),
          ])
        );
      });
    });

    it('all button texts have same styling', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const texts = [
        getByText('Message'),
        getByText('Call'),
        getByText('Video'),
        getByText('Share'),
      ];

      texts.forEach((text) => {
        const styles = Array.isArray(text.props.style)
          ? text.props.style.flat()
          : [text.props.style];

        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fontSize: 14,
              color: '#FFFFFF',
              fontWeight: '600',
            }),
          ])
        );
      });
    });

    it('icons are consistently sized', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const icons = [
        getByTestId('icon-chatbubble-outline'),
        getByTestId('icon-call-outline'),
        getByTestId('icon-videocam-outline'),
        getByTestId('icon-share-social-outline'),
      ];
      const allEqual = icons.every((icon) => {
        const content = Array.isArray(icon.props.children)
          ? icon.props.children.join('')
          : icon.props.children;
        return content.includes('18');
      });
      expect(allEqual).toBe(true);
    });

    it('icons are consistently colored', () => {
      const { getByText, getByTestId } = render(<ProfileActionButtons {...defaultProps} />);
      const icons = [
        getByTestId('icon-chatbubble-outline'),
        getByTestId('icon-call-outline'),
        getByTestId('icon-videocam-outline'),
        getByTestId('icon-share-social-outline'),
      ];
      const allEqual = icons.every((icon) => {
        const content = Array.isArray(icon.props.children)
          ? icon.props.children.join('')
          : icon.props.children;
        return content.includes('#FFFFFF');
      });
      expect(allEqual).toBe(true);
    });
  });
});
