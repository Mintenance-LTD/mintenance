/**
 * Messaging Category
 * Help articles about communication and messaging on the platform
 */

import type { Category } from './types';

export const messagingCategory: Category = {
  id: 'messaging',
  name: 'Messaging & Communication',
  icon: '💬',
  color: '#EF4444',
  articles: [
    { 
      title: 'Using the messaging system', 
      content: 'How to communicate with tradespeople through our platform.',
      fullContent: `# Using the Messaging System

Mintenance messaging keeps all communication in one secure place.

## Getting Started

1. **Open Messages**: Click messages icon
2. **Start Conversation**: Click "New Message"
3. **Select Contact**: Choose tradesperson
4. **Type Message**: Write your message
5. **Send**: Click send button

## Features

- Real-time messaging
- File attachments
- Photo sharing
- Read receipts
- Notification alerts

## Best Practices

- Be clear and concise
- Respond promptly
- Be professional
- Ask questions
- Confirm details

## Tips

- Keep communication on-platform
- Save important messages
- Use photos when helpful
- Set notification preferences
- Archive old conversations`
    },
    { 
      title: 'Notification settings', 
      content: 'Customise your alerts for messages, bids, and updates.',
      fullContent: `# Notification Settings

Customize notifications to stay informed without being overwhelmed.

## Notification Types

- **Messages**: New messages received
- **Bids**: New bids on your jobs
- **Updates**: Job status changes
- **Reminders**: Important deadlines
- **Reviews**: New reviews received

## Setting Preferences

1. Go to Account Settings
2. Select Notifications
3. Choose notification types
4. Set frequency
5. Save preferences

## Options

- **Email**: Receive email notifications
- **Push**: Mobile push notifications
- **SMS**: Text message alerts
- **In-App**: Platform notifications
- **Digest**: Daily/weekly summaries

## Customization

- Choose what to be notified about
- Set quiet hours
- Adjust frequency
- Prioritize important notifications
- Mute specific conversations`
    },
    { 
      title: 'Sharing files and photos', 
      content: 'How to exchange images and documents securely.',
      fullContent: `# Sharing Files and Photos

Share files and photos securely through Mintenance messaging.

## Supported Files

- **Images**: JPG, PNG, GIF
- **Documents**: PDF, DOC, DOCX
- **Size Limit**: Up to 10MB per file
- **Multiple Files**: Attach multiple files

## Sharing Photos

1. Click attachment icon
2. Select photos
3. Add caption if needed
4. Send message
5. Photos uploaded securely

## Sharing Documents

1. Click attachment icon
2. Select document
3. Add description
4. Send message
5. Document shared securely

## Security

- All files encrypted
- Secure storage
- Private sharing
- Access controlled
- Safe transmission

## Tips

- Use clear photos
- Compress large files
- Add descriptions
- Organize files
- Keep important files`
    },
    { 
      title: 'Reporting inappropriate behaviour', 
      content: 'How to flag concerning messages or conduct.',
      fullContent: `# Reporting Inappropriate Behavior

Mintenance takes safety and professionalism seriously.

## What to Report

- Harassment or abuse
- Inappropriate language
- Spam or scams
- Unprofessional conduct
- Safety concerns

## How to Report

1. **In Messages**: Click report button
2. **On Profile**: Use report option
3. **Contact Support**: Email or chat
4. **Provide Details**: Describe issue
5. **Submit**: Report reviewed

## Reporting Process

- Report reviewed promptly
- Investigation conducted
- Appropriate action taken
- You'll be notified
- Privacy protected

## What Happens

- Report reviewed within 24 hours
- User may be warned
- Account may be suspended
- Serious violations: account banned
- You're protected

## Safety Tips

- Keep communication professional
- Don't share personal information
- Report suspicious behavior
- Trust your instincts
- Use platform features`
    },
  ],
};
