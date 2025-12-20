/**
 * Payments & Billing Category
 * Help articles about payments, invoices, and billing
 */

import type { Category } from './types';

export const paymentsCategory: Category = {
  id: 'payments',
  name: 'Payments & Billing',
  icon: '💳',
  color: '#06B6D4',
  articles: [
    { 
      title: 'How payments work', 
      content: 'Understanding our secure escrow payment system.',
      fullContent: `# How Payments Work

Mintenance uses a secure escrow system to protect both homeowners and tradespeople.

## Escrow System

### How It Works
1. **Deposit**: Initial payment held securely
2. **Work Progress**: Payments released at milestones
3. **Completion**: Final payment after approval
4. **Protection**: Funds held until work is approved

### Benefits
- **Security**: Funds held securely
- **Protection**: Both parties protected
- **Dispute Resolution**: Mediation available
- **Transparency**: Clear payment tracking
- **Peace of Mind**: Safe transactions

## Payment Methods

- Credit/Debit Cards
- Bank Transfer
- PayPal
- Apple Pay
- Google Pay

## Payment Schedule

### Typical Structure
- **Deposit**: 20-30% upfront
- **Milestone Payments**: As work progresses
- **Final Payment**: Upon completion

### Customizable
- Agree on payment schedule
- Set milestone dates
- Define completion criteria
- Adjust as needed

## Security Features

- Encrypted transactions
- Secure payment processing
- Fraud protection
- Dispute resolution
- Refund protection`
    },
    { 
      title: 'Payment methods accepted', 
      content: 'Supported payment options and how to add them.',
      fullContent: `# Payment Methods Accepted

Mintenance accepts various secure payment methods.

## Accepted Methods

### Credit/Debit Cards
- Visa
- Mastercard
- American Express
- All major cards accepted

### Digital Wallets
- PayPal
- Apple Pay
- Google Pay

### Bank Transfer
- Direct bank transfer
- Faster Payments
- BACS

## Adding Payment Methods

1. Go to Account Settings
2. Select Payment Methods
3. Click Add Payment Method
4. Enter payment details
5. Verify and save

## Security

- All payments encrypted
- PCI DSS compliant
- Secure storage
- Fraud protection
- Regular security audits

## Payment Preferences

- Set default method
- Save multiple methods
- Update as needed
- Remove old methods
- View payment history`
    },
    { 
      title: 'Releasing payment', 
      content: 'When and how to approve payment to your tradesperson.',
      fullContent: `# Releasing Payment

Releasing payment confirms work completion and pays your tradesperson.

## When to Release

### Completion Criteria
- Work is completed as agreed
- Quality meets expectations
- All items in quote are done
- Cleanup is finished
- You're satisfied with results

### Before Releasing
- Inspect completed work
- Verify all items done
- Check quality standards
- Ensure cleanup complete
- Test functionality if applicable

## Release Process

1. **Review Work**: Inspect completed project
2. **Click Release**: Approve payment
3. **Confirm**: Final confirmation
4. **Payment Processed**: Funds released
5. **Leave Review**: Share your experience

## Partial Releases

- Release for completed milestones
- Hold final payment until fully done
- Release in stages for large projects
- Adjust as work progresses

## Disputes

If work doesn't meet standards:
- Don't release payment
- Document issues with photos
- Contact tradesperson
- Use dispute resolution
- Contact support if needed`
    },
    { 
      title: 'Refunds and disputes', 
      content: 'Process for handling payment issues and disagreements.',
      fullContent: `# Refunds and Disputes

Mintenance provides fair dispute resolution for payment issues.

## When to Dispute

- Work not completed as agreed
- Quality doesn't meet standards
- Unauthorized charges
- Tradesperson no-show
- Safety concerns

## Dispute Process

1. **Document Issues**: Take photos/videos
2. **Contact Tradesperson**: Try to resolve directly
3. **Open Dispute**: If resolution fails
4. **Mediation**: Mintenance reviews case
5. **Resolution**: Fair outcome determined

## Documentation Needed

- Photos/videos of issues
- Original quote/agreement
- Communication records
- Timeline of events
- Any relevant evidence

## Refund Process

- Reviewed case-by-case
- Fair resolution sought
- Partial refunds possible
- Full refunds when warranted
- Timely processing

## Prevention

- Clear agreements upfront
- Regular communication
- Document everything
- Set expectations clearly
- Use milestone payments`
    },
    { 
      title: 'Dispute resolution process', 
      content: 'Step-by-step guide to creating and resolving disputes, including mediation options and SLA timelines.',
      fullContent: `# Dispute Resolution Process

Mintenance provides comprehensive dispute resolution to protect all parties.

## Opening a Dispute

1. **Document the Issue**: Take photos/videos
2. **Contact Tradesperson**: Attempt direct resolution
3. **Gather Evidence**: Collect all relevant documents
4. **Submit Dispute**: Use the dispute form
5. **Wait for Review**: Mediation team reviews

## Dispute Timeline

- **Initial Response**: Within 24 hours
- **Evidence Review**: 2-3 business days
- **Mediation**: 5-7 business days
- **Resolution**: Within 14 days typically

## Mediation Process

### Step 1: Review
- Both parties submit evidence
- Mediation team reviews
- Initial assessment made

### Step 2: Discussion
- Mediator facilitates discussion
- Both sides present case
- Attempt to find compromise

### Step 3: Resolution
- Fair outcome determined
- Payment adjustments made
- Case closed

## Types of Disputes

- **Quality Issues**: Work not meeting standards
- **Completion**: Work not finished
- **Payment**: Payment disagreements
- **Timeline**: Delays or scheduling
- **Materials**: Wrong materials used

## Best Practices

- Communicate clearly
- Document everything
- Be reasonable
- Respond promptly
- Cooperate with mediation`
    },
    { 
      title: 'Submitting evidence for disputes', 
      content: 'What documentation and evidence you need to support your dispute claim.',
      fullContent: `# Submitting Evidence for Disputes

Strong evidence helps resolve disputes fairly and quickly.

## Required Evidence

### Photos/Videos
- Clear images of issues
- Before and after photos
- Multiple angles
- Close-up details
- Video if helpful

### Documents
- Original quote/agreement
- Communication records
- Payment receipts
- Timeline documentation
- Any relevant contracts

## Evidence Guidelines

### Photo Tips
- Use good lighting
- Take clear, focused images
- Include date stamps
- Show context
- Multiple angles

### Document Tips
- Keep all communications
- Save agreements
- Document timeline
- Note important dates
- Keep receipts

## What to Include

- **Issue Description**: Clear explanation
- **Timeline**: When issues occurred
- **Communication**: All relevant messages
- **Photos**: Visual evidence
- **Expectations**: What was agreed

## Organizing Evidence

- Label photos clearly
- Date all documents
- Create timeline
- Highlight key points
- Make it easy to review

## Submitting

- Upload all evidence
- Provide clear description
- Be honest and accurate
- Respond to questions
- Cooperate with review`
    },
    { 
      title: 'Mediation services', 
      content: 'How to request and participate in mediation sessions to resolve disputes.',
      fullContent: `# Mediation Services

Mintenance mediation helps resolve disputes fairly and efficiently.

## Requesting Mediation

1. **Open Dispute**: Submit dispute form
2. **Provide Evidence**: Upload documentation
3. **Request Mediation**: Select mediation option
4. **Wait for Assignment**: Mediator assigned
5. **Participate**: Engage in process

## Mediation Process

### Initial Review
- Mediator reviews evidence
- Understands both perspectives
- Identifies key issues
- Prepares for discussion

### Mediation Session
- Facilitated discussion
- Both parties present case
- Mediator asks questions
- Explores solutions

### Resolution
- Fair outcome determined
- Agreement reached
- Payment adjustments made
- Case closed

## Participating Effectively

- Be prepared with evidence
- Be respectful
- Listen to other party
- Be open to compromise
- Focus on solutions

## Mediation Benefits

- Faster resolution
- Lower costs
- Preserves relationships
- Fair outcomes
- Professional guidance

## Timeline

- Request: Immediate
- Assignment: Within 24 hours
- Session: Within 3-5 days
- Resolution: Within 7-10 days`
    },
    { 
      title: 'VAT and invoices', 
      content: 'Understanding tax documentation and receipt generation.',
      fullContent: `# VAT and Invoices

Mintenance provides proper invoicing and VAT documentation.

## Invoice Generation

### Automatic Invoices
- Generated upon payment
- Include all details
- VAT breakdown included
- Downloadable PDF
- Email copy sent

### Invoice Contents
- Invoice number
- Date and payment details
- Itemized services
- VAT amount
- Total amount
- Tradesperson details

## VAT Information

### VAT Rates
- Standard rate: 20%
- Reduced rate: 5% (some services)
- Zero rate: Some exemptions
- Check with tradesperson

### VAT Registration
- Tradesperson VAT status shown
- VAT number included
- Proper documentation
- Compliant invoicing

## Accessing Invoices

1. Go to Payments section
2. Find completed payment
3. Click "View Invoice"
4. Download PDF
5. Save for records

## Tax Records

- Keep all invoices
- Download PDFs
- Organize by date
- Keep for tax purposes
- Consult accountant if needed

## Questions

- Contact tradesperson for VAT queries
- Check invoice details
- Verify VAT registration
- Contact support if issues
- Consult tax advisor for advice`
    },
  ],
};
