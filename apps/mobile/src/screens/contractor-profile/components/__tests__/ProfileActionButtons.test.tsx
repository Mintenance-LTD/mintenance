/**
 * ProfileActionButtons Component Tests
 *
 * Realigned 2026-06-04 to the Mint Editorial redesign of ProfileActionButtons:
 *  - A dominant primary CTA ("Request a Quote", or "Message Contractor" when
 *    `hasActiveBid`) over a row of secondary icon buttons.
 *  - Secondary actions are Message / Call / Share. The Video action was
 *    intentionally removed pending the real video-call feature (see the
 *    SECONDARY_ACTIONS comment in the component) — the `onVideo` prop is
 *    retained on the interface but no button surfaces it.
 *  - Primary icon size 18 / color me.onBrand (#FFFFFF); secondary icons
 *    size 20 / color me.ink (#1A2520). Buttons carry testIDs
 *    request-quote-button / message-button / call-button / share-button.
 *
 * @component ProfileActionButtons
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { ProfileActionButtons } from '../ProfileActionButtons';
import { me } from '../../../../design-system/mint-editorial';

// ============================================================================
// MOCKS
// ============================================================================

// Local Ionicons mock that encodes name-size-color into the rendered text so
// icon props can be asserted, and exposes a stable `icon-<name>` testID.
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
  onRequestQuote: jest.fn(),
};

// ============================================================================
// PROFILEACTIONBUTTONS COMPONENT TESTS
// ============================================================================

describe('ProfileActionButtons Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders the primary "Request a Quote" CTA', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByText('Request a Quote')).toBeTruthy();
      expect(getByTestId('request-quote-button')).toBeTruthy();
    });

    it('renders the secondary action buttons (Message, Call, Share)', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      expect(getByText('Message')).toBeTruthy();
      expect(getByText('Call')).toBeTruthy();
      expect(getByText('Share')).toBeTruthy();
    });

    it('does not render a Video action button', () => {
      const { queryByText, queryByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(queryByText('Video')).toBeNull();
      expect(queryByTestId('video-button')).toBeNull();
    });

    it('renders Message button with icon', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByText('Message')).toBeTruthy();
      expect(getByTestId('icon-chatbubble-outline')).toBeTruthy();
    });

    it('renders Call button with icon', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByText('Call')).toBeTruthy();
      expect(getByTestId('icon-call-outline')).toBeTruthy();
    });

    it('renders Share button with icon', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByText('Share')).toBeTruthy();
      expect(getByTestId('icon-share-social-outline')).toBeTruthy();
    });

    it('renders the primary CTA icon', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByTestId('icon-document-text-outline')).toBeTruthy();
    });

    it('renders with all required props', () => {
      expect(() => {
        render(<ProfileActionButtons {...defaultProps} />);
      }).not.toThrow();
    });

    it('renders a primary CTA plus three secondary TouchableOpacity buttons', () => {
      const { UNSAFE_root } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const touchableElements = UNSAFE_root.findAllByType(
        TouchableOpacity as any
      );
      expect(touchableElements.length).toBe(4);
    });

    it('renders all secondary labels', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      ['Message', 'Call', 'Share'].forEach((label) => {
        expect(getByText(label)).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Icon Rendering Tests
  // --------------------------------------------------------------------------

  const iconContent = (icon: any) =>
    Array.isArray(icon.props.children)
      ? icon.props.children.join('')
      : icon.props.children;

  describe('Icon Rendering', () => {
    it('Message icon has correct name', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(iconContent(getByTestId('icon-chatbubble-outline'))).toContain(
        'chatbubble-outline'
      );
    });

    it('Call icon has correct name', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(iconContent(getByTestId('icon-call-outline'))).toContain(
        'call-outline'
      );
    });

    it('Share icon has correct name', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(iconContent(getByTestId('icon-share-social-outline'))).toContain(
        'share-social-outline'
      );
    });

    it('secondary icons are sized 20', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      [
        'icon-chatbubble-outline',
        'icon-call-outline',
        'icon-share-social-outline',
      ].forEach((id) => {
        expect(iconContent(getByTestId(id))).toContain('20');
      });
    });

    it('secondary icons use the ink token color', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      [
        'icon-chatbubble-outline',
        'icon-call-outline',
        'icon-share-social-outline',
      ].forEach((id) => {
        expect(iconContent(getByTestId(id))).toContain(me.ink);
      });
    });

    it('primary CTA icon is sized 18 and uses the onBrand color', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const content = iconContent(getByTestId('icon-document-text-outline'));
      expect(content).toContain('18');
      expect(content).toContain(me.onBrand);
    });
  });

  // --------------------------------------------------------------------------
  // Button Interaction Tests
  // --------------------------------------------------------------------------

  describe('Button Interaction', () => {
    it('calls onMessage when Message button is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
    });

    it('calls onCall when Call button is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
    });

    it('calls onShare when Share button is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('calls onRequestQuote when the primary CTA is pressed', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      fireEvent.press(getByTestId('request-quote-button'));
      expect(defaultProps.onRequestQuote).toHaveBeenCalledTimes(1);
    });

    it('falls back to onMessage for the primary CTA when onRequestQuote is omitted', () => {
      const onMessage = jest.fn();
      const { getByTestId } = render(
        <ProfileActionButtons
          onMessage={onMessage}
          onCall={jest.fn()}
          onVideo={jest.fn()}
          onShare={jest.fn()}
        />
      );
      fireEvent.press(getByTestId('request-quote-button'));
      expect(onMessage).toHaveBeenCalledTimes(1);
    });

    it('calls onMessage only once per press', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('handles multiple presses of the Message button', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      const messageButton = getByText('Message');
      fireEvent.press(messageButton);
      fireEvent.press(messageButton);
      fireEvent.press(messageButton);
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(3);
    });

    it('handles pressing different buttons sequentially', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Share'));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('handles rapid button presses', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Message'));
        fireEvent.press(getByText('Call'));
        fireEvent.press(getByText('Share'));
      }

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(10);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(10);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(10);
    });

    it('Message button is reachable by testID', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const messageButton = getByTestId('message-button');
      expect(messageButton).toBeTruthy();
      expect(messageButton.props.accessible).not.toBe(false);
    });

    it('Call button is reachable by testID', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByTestId('call-button')).toBeTruthy();
    });

    it('Share button is reachable by testID', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByTestId('share-button')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Callback Independence Tests
  // --------------------------------------------------------------------------

  describe('Callback Independence', () => {
    it('does not call other callbacks when Message is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
      expect(defaultProps.onRequestQuote).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Call is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalled();
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onShare).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Share is pressed', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      fireEvent.press(getByText('Share'));
      expect(defaultProps.onShare).toHaveBeenCalled();
      expect(defaultProps.onMessage).not.toHaveBeenCalled();
      expect(defaultProps.onCall).not.toHaveBeenCalled();
    });

    it('maintains callback independence with rapid sequential presses', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Share'));
      fireEvent.press(getByTestId('request-quote-button'));
      fireEvent.press(getByText('Message'));

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(2);
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
      expect(defaultProps.onRequestQuote).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // hasActiveBid / canMessage behaviour
  // --------------------------------------------------------------------------

  describe('Conditional behaviour', () => {
    it('flips the primary CTA to "Message Contractor" when hasActiveBid is true', () => {
      const { getByText, getByTestId, queryByText } = render(
        <ProfileActionButtons {...defaultProps} hasActiveBid />
      );
      expect(getByText('Message Contractor')).toBeTruthy();
      expect(getByTestId('message-contractor-button')).toBeTruthy();
      expect(queryByText('Request a Quote')).toBeNull();
    });

    it('routes the primary CTA to onMessage when hasActiveBid is true', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} hasActiveBid />
      );
      fireEvent.press(getByTestId('message-contractor-button'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);
      expect(defaultProps.onRequestQuote).not.toHaveBeenCalled();
    });

    it('hides the Message secondary button when canMessage is false', () => {
      const { queryByTestId, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} canMessage={false} />
      );
      expect(queryByTestId('message-button')).toBeNull();
      expect(getByTestId('call-button')).toBeTruthy();
      expect(getByTestId('share-button')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests
  // --------------------------------------------------------------------------

  const flatStyle = (el: any) =>
    Array.isArray(el?.props.style) ? el.props.style.flat() : [el?.props.style];

  describe('Button Styling', () => {
    it('primary CTA uses the brand background color', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const styles = flatStyle(getByTestId('request-quote-button'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: me.brand }),
        ])
      );
    });

    it('primary CTA text uses the onBrand color', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      const styles = flatStyle(getByText('Request a Quote'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: me.onBrand, fontWeight: '700' }),
        ])
      );
    });

    it('secondary buttons are center-aligned with a gap', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const styles = flatStyle(getByTestId('message-button'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ alignItems: 'center', gap: 4 }),
        ])
      );
    });

    it('secondary labels use the ink2 token color', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      const styles = flatStyle(getByText('Message'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: me.ink2, fontSize: 11 }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Container Styling Tests
  // --------------------------------------------------------------------------

  describe('Container Styling', () => {
    it('container has horizontal and vertical padding', () => {
      const { UNSAFE_root } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const container = UNSAFE_root.findAllByType('View' as any)[0];
      const styles = flatStyle(container);
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 16,
            paddingVertical: 12,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('complete workflow: request quote, message, call, share', () => {
      const { getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );

      fireEvent.press(getByTestId('request-quote-button'));
      expect(defaultProps.onRequestQuote).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Message'));
      expect(defaultProps.onMessage).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Call'));
      expect(defaultProps.onCall).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Share'));
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
      const { rerender, getByText, getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );

      rerender(<ProfileActionButtons {...defaultProps} />);

      fireEvent.press(getByText('Message'));
      fireEvent.press(getByText('Call'));
      fireEvent.press(getByText('Share'));
      fireEvent.press(getByTestId('request-quote-button'));

      expect(defaultProps.onMessage).toHaveBeenCalled();
      expect(defaultProps.onCall).toHaveBeenCalled();
      expect(defaultProps.onShare).toHaveBeenCalled();
      expect(defaultProps.onRequestQuote).toHaveBeenCalled();
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
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);

      for (let i = 0; i < 100; i++) {
        fireEvent.press(getByText('Message'));
      }

      expect(defaultProps.onMessage).toHaveBeenCalledTimes(100);
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

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<ProfileActionButtons {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(<ProfileActionButtons {...defaultProps} />);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
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
      const { UNSAFE_root } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const touchableElements = UNSAFE_root.findAllByType(
        TouchableOpacity as any
      );
      expect(touchableElements.length).toBe(4);
    });

    it('the primary CTA exposes an accessibility role and label', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      const cta = getByTestId('request-quote-button');
      expect(cta.props.accessibilityRole).toBe('button');
      expect(cta.props.accessibilityLabel).toBe(
        'Request a quote from this contractor'
      );
    });

    it('secondary buttons expose accessibility labels', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByTestId('message-button').props.accessibilityLabel).toBe(
        'Message'
      );
      expect(getByTestId('call-button').props.accessibilityLabel).toBe('Call');
      expect(getByTestId('share-button').props.accessibilityLabel).toBe(
        'Share'
      );
    });

    it('text labels are readable', () => {
      const { getByText } = render(<ProfileActionButtons {...defaultProps} />);
      ['Message', 'Call', 'Share'].forEach((label) => {
        const text = getByText(label);
        expect(text).toBeTruthy();
        expect(text.props.children).toBe(label);
      });
    });

    it('icons provide visual context for actions', () => {
      const { getByTestId } = render(
        <ProfileActionButtons {...defaultProps} />
      );
      expect(getByTestId('icon-chatbubble-outline')).toBeTruthy();
      expect(getByTestId('icon-call-outline')).toBeTruthy();
      expect(getByTestId('icon-share-social-outline')).toBeTruthy();
    });
  });
});
