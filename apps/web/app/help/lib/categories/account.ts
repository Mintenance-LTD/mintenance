/**
 * Account Management Category
 * Help articles about managing your account settings and preferences
 */

import type { Category } from './types';

export const accountCategory: Category = {
  id: 'account',
  name: 'Account Management',
  icon: '⚙️',
  color: '#6B7280',
  articles: [
    { 
      title: 'Updating account details', 
      content: 'How to change your email, password, and personal information.',
      fullContent: `# Updating Account Details

Keep your account information up to date for better service.

## Updating Information

### Personal Details
1. Go to Account Settings
2. Select Personal Information
3. Edit details
4. Save changes
5. Verify if needed

### Contact Information
- Email address
- Phone number
- Address
- Notification preferences

## Changing Password

1. Go to Security Settings
2. Select Change Password
3. Enter current password
4. Enter new password
5. Confirm and save

## Email Updates

- Change email address
- Verify new email
- Update notifications
- Keep email current
- Check spam folder

## Privacy Settings

- Control visibility
- Manage sharing
- Set preferences
- Protect information
- Update regularly

## Important Notes

- Some changes require verification
- Keep information accurate
- Update as needed
- Protect your account
- Contact support if issues`
    },
    { 
      title: 'Privacy settings', 
      content: 'Control who can see your information and activity.',
      fullContent: `# Privacy Settings

Control your privacy and who can see your information.

## Privacy Options

### Profile Visibility
- Public: Everyone can see
- Private: Only connections
- Custom: Choose who sees what

### Information Sharing
- What's visible to others
- Contact information
- Activity visibility
- Review visibility

## Setting Preferences

1. Go to Privacy Settings
2. Choose visibility levels
3. Set sharing preferences
4. Configure notifications
5. Save settings

## Privacy Controls

- Control profile visibility
- Manage data sharing
- Set communication preferences
- Control review visibility
- Manage activity tracking

## Data Protection

- Your data is secure
- Encrypted storage
- GDPR compliant
- You control your data
- Can request deletion

## Best Practices

- Review settings regularly
- Adjust as needed
- Understand options
- Protect your privacy
- Stay informed`
    },
    { 
      title: 'Notification preferences', 
      content: 'Customise your email and push notification settings.',
      fullContent: `# Notification Preferences

Customize how and when you receive notifications.

## Notification Types

- **Messages**: New messages
- **Bids**: New bids received
- **Jobs**: New job matches
- **Updates**: Status changes
- **Reviews**: New reviews

## Setting Preferences

1. Go to Settings
2. Select Notifications
3. Choose notification types
4. Set delivery methods
5. Configure frequency

## Delivery Methods

- Email notifications
- Push notifications
- SMS alerts
- In-app notifications
- Digest summaries

## Customization

- Choose what to receive
- Set quiet hours
- Adjust frequency
- Prioritize important
- Mute specific types

## Managing Notifications

- Update preferences anytime
- Test notification settings
- Adjust as needed
- Stay informed
- Avoid overload`
    },
    { 
      title: 'Deactivating your account', 
      content: 'How to temporarily disable or permanently delete your account.',
      fullContent: `# Deactivating Your Account

You can deactivate or delete your account at any time.

## Deactivation vs Deletion

### Deactivation
- Temporarily disable account
- Can reactivate later
- Data preserved
- Profile hidden
- Can return anytime

### Deletion
- Permanently remove account
- Cannot be undone
- Data deleted
- All information removed
- Final decision

## Deactivating Account

1. Go to Account Settings
2. Select Account Management
3. Choose Deactivate
4. Confirm deactivation
5. Account disabled

## Deleting Account

1. Go to Account Settings
2. Select Account Management
3. Choose Delete Account
4. Read warnings carefully
5. Confirm deletion

## Before Deactivating

- Complete active jobs
- Resolve any disputes
- Download important data
- Save invoices/receipts
- Inform contacts if needed

## Important Notes

- Active jobs must be completed
- Outstanding payments resolved
- Disputes must be closed
- Data backup recommended
- Cannot be undone (deletion)

## Reactivation

- Can reactivate anytime
- Log in to reactivate
- Profile restored
- Data intact
- Resume using platform`
    },
  ],
};
