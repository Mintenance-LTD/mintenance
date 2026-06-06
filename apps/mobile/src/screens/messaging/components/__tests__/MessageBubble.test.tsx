/**
 * MessageBubble branch-coverage suite.
 *
 * Exercises every rendering branch: own vs other sender, all delivery
 * statuses (sending/sent/delivered/read/failed), date separators, and
 * each message type (text, image, file/document, system, video_call,
 * empty). Externals mocked: @expo/vector-icons (rendered as Text so we
 * can assert icon names) and VideoCallMessage (heavy child). The
 * design-system token object and the date formatter are plain modules
 * and used real.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '../MessageBubble';
import type { Message } from '../../../../services/messaging/types';

// Mock Ionicons -> renders "icon-<name>" testID + name text so branches
// that pick different icons/colors are observable.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: any) => {
    const { Text } = require('react-native');
    return (
      <Text testID={`icon-${name}`}>
        {name}-{size}-{color}
      </Text>
    );
  },
}));

// Mock the heavy video-call child so the video_call branch is isolated.
jest.mock('../../../../components/messaging/VideoCallMessage', () => ({
  __esModule: true,
  default: ({ message }: any) => {
    const { Text } = require('react-native');
    return <Text testID='video-call-message'>VC:{message.id}</Text>;
  },
}));

const baseMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg_1',
  jobId: 'job_1',
  senderId: 'sender_1',
  receiverId: 'receiver_1',
  messageText: 'Hello world',
  messageType: 'text',
  read: false,
  createdAt: '2026-06-05T10:30:00.000Z',
  ...overrides,
});

const noop = () => {};

const defaultProps = {
  isFromCurrentUser: false,
  isDesktop: false,
  onCallAccept: noop,
  onCallDecline: noop,
};

describe('MessageBubble', () => {
  describe('date separator branch', () => {
    it('renders the date separator when showDateSeparator is provided', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage()}
          showDateSeparator='Today'
        />
      );
      expect(getByText('Today')).toBeTruthy();
    });

    it('does not render a date separator when omitted', () => {
      const { queryByText } = render(
        <MessageBubble {...defaultProps} item={baseMessage()} />
      );
      // The bubble text still renders, but no separator label.
      expect(queryByText('Today')).toBeNull();
    });
  });

  describe('video_call message branch', () => {
    it('renders VideoCallMessage for a video_call_invitation type', () => {
      const { getByTestId } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            id: 'vc_1',
            messageType: 'video_call_invitation',
          })}
        />
      );
      expect(getByTestId('video-call-message')).toBeTruthy();
    });

    it('renders date separator alongside the video call', () => {
      const { getByTestId, getByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            id: 'vc_2',
            messageType: 'video_call_started',
          })}
          showDateSeparator='Yesterday'
        />
      );
      expect(getByTestId('video-call-message')).toBeTruthy();
      expect(getByText('Yesterday')).toBeTruthy();
    });
  });

  describe('system message branch', () => {
    it('renders a system bubble with information icon', () => {
      const { getByText, getByTestId } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageText: 'Job was assigned',
            // 'system' is cast as string inside the component.
            messageType: 'system' as unknown as Message['messageType'],
          })}
        />
      );
      expect(getByText('Job was assigned')).toBeTruthy();
      expect(getByTestId('icon-information-circle')).toBeTruthy();
    });

    it('renders date separator above a system message', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageText: 'System note',
            messageType: 'system' as unknown as Message['messageType'],
          })}
          showDateSeparator='Mar 10'
        />
      );
      expect(getByText('Mar 10')).toBeTruthy();
      expect(getByText('System note')).toBeTruthy();
    });
  });

  describe('file/document message branch', () => {
    it('renders document name stripped of "Shared document:" prefix (sent)', () => {
      const { getByText, getByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({
            id: 'temp_message_doc', // -> sending status for current user
            messageType: 'file',
            attachmentUrl: 'https://example.com/report.pdf',
            messageText: 'Shared document: report.pdf',
          })}
        />
      );
      expect(getByText('report.pdf')).toBeTruthy();
      expect(getByText('Shared document')).toBeTruthy();
      expect(getByText('View Document')).toBeTruthy();
      // sent doc icon uses onBrand color
      expect(getByTestId('icon-document-text')).toBeTruthy();
    });

    it('falls back to "Document" when messageText is empty (received)', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser={false}
          item={baseMessage({
            messageType: 'file',
            attachmentUrl: 'https://example.com/file.pdf',
            messageText: '',
          })}
        />
      );
      expect(getByText('Document')).toBeTruthy();
    });

    it('does not show delivery status on a received document', () => {
      const { queryByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser={false}
          item={baseMessage({
            messageType: 'file',
            attachmentUrl: 'https://example.com/file.pdf',
            messageText: 'Shared document: spec.pdf',
          })}
        />
      );
      // received -> deliveryStatus undefined -> no checkmark/sending icons
      expect(queryByTestId('icon-checkmark')).toBeNull();
    });

    it('renders date separator above a document message', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({
            messageType: 'file',
            attachmentUrl: 'https://example.com/x.pdf',
            messageText: 'Shared document: x.pdf',
            deliveryStatus: 'delivered',
          })}
          showDateSeparator='Today'
        />
      );
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('x.pdf')).toBeTruthy();
    });

    it('treats file type without attachmentUrl as a normal text bubble', () => {
      // isFileMessage requires attachmentUrl; without it the component
      // falls through to the text branch.
      const { getByText, queryByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageType: 'file',
            attachmentUrl: undefined,
            messageText: 'just text, no file',
          })}
        />
      );
      expect(getByText('just text, no file')).toBeTruthy();
      expect(queryByText('View Document')).toBeNull();
    });
  });

  describe('empty message branch', () => {
    it('renders nothing when there is no text and no attachment and no separator', () => {
      const { toJSON } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({ messageText: '   ', attachmentUrl: undefined })}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders only the date separator when empty content but separator present', () => {
      const { getByText, queryByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({ messageText: '', attachmentUrl: undefined })}
          showDateSeparator='Today'
        />
      );
      expect(getByText('Today')).toBeTruthy();
      expect(queryByText('Hello world')).toBeNull();
    });
  });

  describe('image attachment branch', () => {
    it('renders an attached image when attachmentUrl is set and type is not file', () => {
      const { getByLabelText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageType: 'image',
            attachmentUrl: 'https://example.com/photo.jpg',
            messageText: '',
          })}
        />
      );
      expect(getByLabelText('Attached image')).toBeTruthy();
    });

    it('renders image plus caption text together', () => {
      const { getByLabelText, getByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageType: 'image',
            attachmentUrl: 'https://example.com/photo.jpg',
            messageText: 'check this out',
          })}
        />
      );
      expect(getByLabelText('Attached image')).toBeTruthy();
      expect(getByText('check this out')).toBeTruthy();
    });
  });

  describe('received text bubble — senderName branch', () => {
    it('renders the sender name when present on a received message', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser={false}
          item={baseMessage({ senderName: 'Jane Contractor' })}
        />
      );
      expect(getByText('Jane Contractor')).toBeTruthy();
      expect(getByText('Hello world')).toBeTruthy();
    });

    it('omits the sender name when absent', () => {
      const { queryByText, getByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser={false}
          item={baseMessage({ senderName: undefined })}
        />
      );
      expect(getByText('Hello world')).toBeTruthy();
      expect(queryByText('Jane Contractor')).toBeNull();
    });

    it('never shows sender name for current-user messages', () => {
      const { queryByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({ senderName: 'Me Myself' })}
        />
      );
      expect(queryByText('Me Myself')).toBeNull();
    });
  });

  describe('delivery status resolution (current user)', () => {
    it('uses explicit deliveryStatus when present: sending', () => {
      const { queryAllByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({ deliveryStatus: 'sending' })}
        />
      );
      expect(queryAllByText(/Sending/).length).toBeGreaterThan(0);
    });

    it('uses explicit deliveryStatus: delivered (single check)', () => {
      const { getByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({ deliveryStatus: 'delivered' })}
        />
      );
      expect(getByTestId('icon-checkmark')).toBeTruthy();
    });

    it('uses explicit deliveryStatus: read (double check)', () => {
      const { getAllByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({ deliveryStatus: 'read' })}
        />
      );
      // read renders two checkmark icons
      expect(getAllByTestId('icon-checkmark').length).toBe(2);
    });

    it('resolves to read when no deliveryStatus but read=true', () => {
      const { getAllByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({ deliveryStatus: undefined, read: true })}
        />
      );
      expect(getAllByTestId('icon-checkmark').length).toBe(2);
    });

    it('resolves to sending for a temp_message_ id with no status', () => {
      const { queryAllByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({
            id: 'temp_message_abc',
            deliveryStatus: undefined,
            read: false,
          })}
        />
      );
      expect(queryAllByText(/Sending/).length).toBeGreaterThan(0);
    });

    it('resolves to delivered by default (not read, not temp, no status)', () => {
      const { getByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({
            id: 'msg_real',
            deliveryStatus: undefined,
            read: false,
          })}
        />
      );
      expect(getByTestId('icon-checkmark')).toBeTruthy();
    });

    it('shows no delivery status indicator for received messages', () => {
      const { queryByTestId, queryByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser={false}
          item={baseMessage({ read: true })}
        />
      );
      expect(queryByTestId('icon-checkmark')).toBeNull();
      expect(queryByText(/Sending/)).toBeNull();
    });
  });

  describe('failed delivery branch', () => {
    it('renders the failed retry indicator below the bubble for current user', () => {
      const { getAllByText, getAllByTestId } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          onRetry={noop}
          item={baseMessage({ deliveryStatus: 'failed' })}
        />
      );
      // A failed text message renders the indicator twice: once in the
      // meta row and once below the bubble (the isFailed block).
      expect(getAllByText('Failed. Tap to retry').length).toBe(2);
      expect(getAllByTestId('icon-alert-circle').length).toBe(2);
    });

    it('renders failed styling on a failed document message', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          isFromCurrentUser
          item={baseMessage({
            messageType: 'file',
            attachmentUrl: 'https://example.com/y.pdf',
            messageText: 'Shared document: y.pdf',
            deliveryStatus: 'failed',
          })}
        />
      );
      expect(getByText('y.pdf')).toBeTruthy();
      // failed indicator appears within the meta row of the doc bubble
      expect(getByText('Failed. Tap to retry')).toBeTruthy();
    });
  });

  describe('desktop maxWidth branch', () => {
    it('renders with desktop sizing without crashing', () => {
      const { getByText } = render(
        <MessageBubble
          {...defaultProps}
          isDesktop
          item={baseMessage({ messageText: 'desktop bubble' })}
        />
      );
      expect(getByText('desktop bubble')).toBeTruthy();
    });
  });

  describe('messageText ternary branch', () => {
    it('renders attachment-only bubble (image, no text)', () => {
      const { getByLabelText, queryByText } = render(
        <MessageBubble
          {...defaultProps}
          item={baseMessage({
            messageType: 'image',
            attachmentUrl: 'https://example.com/only.jpg',
            messageText: '',
          })}
        />
      );
      expect(getByLabelText('Attached image')).toBeTruthy();
      expect(queryByText('Hello world')).toBeNull();
    });
  });
});
