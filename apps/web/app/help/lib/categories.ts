/**
 * Help Center Categories and Articles Data
 * Contains all help articles organized by category
 */

export interface Article {
  title: string;
  content: string;
  fullContent?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  articles: Article[];
}

export const helpCategories: Category[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: '🚀',
    color: '#10B981',
    articles: [
      { 
        title: 'How to create an account', 
        content: 'Step-by-step guide to registering as a homeowner or tradesperson on Mintenance.',
        fullContent: `# How to Create an Account

Creating an account on Mintenance is quick and easy. Follow these steps:

## For Homeowners

1. Click the "Sign Up" button on the homepage
2. Select "I'm a Homeowner"
3. Enter your email address and create a secure password
4. Complete your profile with your name and location
5. Verify your email address by clicking the link in your inbox

## For Tradespeople

1. Click the "Sign Up" button on the homepage
2. Select "I'm a Tradesperson"
3. Enter your business email and create a secure password
4. Complete your professional profile including:
   - Business name and description
   - Services you offer
   - Your service area
   - Qualifications and certifications
5. Verify your email address
6. Complete identity verification for enhanced trust

## Next Steps

After creating your account:
- Complete your profile to get better matches
- Add a profile photo
- Set your notification preferences
- Explore the platform features

Need help? Contact our support team at support@mintenance.co.uk`
      },
      { 
        title: 'Setting up your profile', 
        content: 'Complete your profile to get better matches and more opportunities.',
        fullContent: `# Setting Up Your Profile

A complete profile helps you get better matches and build trust on Mintenance.

## Profile Essentials

### For Homeowners
- **Personal Information**: Name, location, and contact details
- **Profile Photo**: Add a clear photo of yourself
- **Property Details**: Information about your property
- **Preferences**: Service preferences and communication style

### For Tradespeople
- **Business Information**: Business name, description, and logo
- **Services**: List all services you offer
- **Service Area**: Define where you're willing to work
- **Qualifications**: Upload certifications and licenses
- **Portfolio**: Showcase your previous work with photos

## Tips for Success

- Use clear, professional photos
- Write a detailed description of your services or needs
- Keep your availability updated
- Respond promptly to messages
- Build your reputation with reviews`
      },
      { 
        title: 'Understanding the platform', 
        content: 'Learn about the features and how to navigate Mintenance effectively.',
        fullContent: `# Understanding the Platform

Mintenance connects homeowners with trusted tradespeople. Here's how it works:

## Key Features

### For Homeowners
- **Post Jobs**: Create detailed job postings
- **Browse Tradespeople**: Discover local professionals
- **Compare Quotes**: Review and compare multiple bids
- **Secure Payments**: Use our escrow system for safe transactions
- **Messaging**: Communicate directly with tradespeople

### For Tradespeople
- **Find Jobs**: Discover projects matching your skills
- **Submit Bids**: Create competitive quotes
- **Build Reputation**: Earn reviews and ratings
- **Manage Calendar**: Schedule and track projects
- **Get Paid**: Secure payment processing

## Navigation Tips

- Use the search bar to find specific features
- Check your dashboard for updates
- Review notifications regularly
- Use filters to narrow down results
- Save favorite tradespeople or jobs`
      },
      { 
        title: 'Verifying your account', 
        content: 'How to complete the verification process for enhanced security and trust.',
        fullContent: `# Verifying Your Account

Account verification enhances security and builds trust on Mintenance.

## Verification Process

### Email Verification
1. Check your inbox for the verification email
2. Click the verification link
3. You'll be redirected back to Mintenance
4. Your email is now verified

### Identity Verification (Tradespeople)
1. Go to your profile settings
2. Click "Verify Identity"
3. Upload a government-issued ID
4. Provide business registration documents (if applicable)
5. Wait for review (usually 24-48 hours)

## Benefits of Verification

- Enhanced trust from other users
- Verified badge on your profile
- Access to premium features
- Priority in search results
- Increased job opportunities

## Troubleshooting

If you don't receive the verification email:
- Check your spam folder
- Verify your email address is correct
- Request a new verification email
- Contact support if issues persist`
      },
    ],
  },
  {
    id: 'posting-jobs',
    name: 'Posting Jobs',
    icon: '📝',
    color: '#F59E0B',
    articles: [
      { 
        title: 'How to post a job', 
        content: 'Create a detailed job posting to attract the right tradespeople.',
        fullContent: `# How to Post a Job

Posting a job on Mintenance helps you find the right tradesperson for your project.

## Step-by-Step Guide

1. **Click "Post a Job"** from your dashboard
2. **Select Job Category** - Choose the type of work needed
3. **Add Job Details**:
   - Job title and description
   - Location and access details
   - Preferred timeline
   - Budget range
4. **Upload Photos** - Add clear photos of the work area
5. **Review and Post** - Double-check details before publishing

## Tips for Better Results

- Be specific about what you need
- Include all relevant details
- Add multiple photos from different angles
- Set a realistic budget range
- Be clear about your timeline
- Mention any special requirements

## After Posting

- Review incoming bids
- Ask questions to tradespeople
- Compare quotes carefully
- Check tradesperson profiles and reviews
- Select the best match for your project`
      },
      { 
        title: 'Setting a realistic budget', 
        content: 'Guidelines for determining fair pricing for your project.',
        fullContent: `# Setting a Realistic Budget

Setting a realistic budget helps attract quality tradespeople and ensures fair pricing.

## Budget Considerations

### Factors to Consider
- **Project Scope**: Size and complexity of work
- **Materials**: Cost of materials needed
- **Labor**: Time required for completion
- **Location**: Regional pricing variations
- **Timeline**: Urgency may affect pricing
- **Permits**: Any required permits or inspections

## Budget Ranges

- **Small Jobs**: £50 - £500
- **Medium Projects**: £500 - £5,000
- **Large Projects**: £5,000 - £50,000
- **Major Renovations**: £50,000+

## Tips

- Research average costs for similar projects
- Get multiple quotes to compare
- Factor in a 10-20% contingency
- Consider quality vs. cost trade-offs
- Be transparent about your budget range`
      },
      { 
        title: 'Adding photos and details', 
        content: 'Best practices for providing comprehensive job information.',
        fullContent: `# Adding Photos and Details

Detailed job postings attract better tradespeople and more accurate quotes.

## Photo Guidelines

### What to Include
- **Wide Shots**: Show the full area/room
- **Close-Ups**: Detail specific issues or areas
- **Multiple Angles**: Different perspectives
- **Problem Areas**: Highlight what needs fixing
- **Access Points**: Show how tradespeople can access the area

### Photo Tips
- Use good lighting
- Take clear, in-focus photos
- Include measurements if helpful
- Show any existing damage or issues
- Remove clutter for better visibility

## Detail Guidelines

### Essential Information
- **What**: Clear description of work needed
- **Where**: Specific location and access details
- **When**: Preferred timeline and availability
- **Why**: Reason for the work (if relevant)
- **Special Requirements**: Any unique considerations

### Additional Details
- Existing materials or fixtures
- Preferred materials or brands
- Access restrictions
- Parking availability
- Working hours preferences`
      },
      { 
        title: 'Editing or cancelling a job', 
        content: 'How to modify or cancel a job posting after it\'s been created.',
        fullContent: `# Editing or Cancelling a Job

You can edit or cancel your job posting at any time before accepting a bid.

## Editing a Job

1. Go to your dashboard
2. Find the job you want to edit
3. Click "Edit Job"
4. Update any details
5. Save changes

### What You Can Edit
- Job title and description
- Budget range
- Timeline
- Photos
- Location details
- Job status

## Cancelling a Job

1. Go to your dashboard
2. Find the job you want to cancel
3. Click "Cancel Job"
4. Confirm cancellation

### Important Notes
- You can only cancel jobs without accepted bids
- Cancelled jobs are removed from search
- Tradespeople who bid will be notified
- You can repost the job later if needed

## After Accepting a Bid

Once you accept a bid:
- Job details are locked
- Changes require tradesperson agreement
- Cancellation may incur fees
- Contact support for assistance`
      },
    ],
  },
  {
    id: 'finding-contractors',
    name: 'Finding Tradespeople',
    icon: '🔍',
    color: '#8B5CF6',
    articles: [
      { 
        title: 'Using the discovery feature', 
        content: 'How to swipe through and match with local tradespeople.',
        fullContent: `# Using the Discovery Feature

The discovery feature helps you find tradespeople who match your needs.

## How It Works

1. **Browse Profiles**: Swipe through tradesperson profiles
2. **Review Details**: Check services, reviews, and ratings
3. **Save Favorites**: Save tradespeople you're interested in
4. **Contact**: Message tradespeople directly
5. **Request Quotes**: Ask for quotes on your projects

## Discovery Tips

- Use filters to narrow results
- Read reviews carefully
- Check response times
- Review portfolios
- Compare multiple options
- Save favorites for later

## Making the Most of Discovery

- Be open to different tradespeople
- Don't judge solely on price
- Consider experience and reviews
- Look for verified badges
- Check service area coverage`
      },
      { 
        title: 'Reading reviews and ratings', 
        content: 'Understanding tradesperson profiles and reputation scores.',
        fullContent: `# Reading Reviews and Ratings

Reviews and ratings help you make informed decisions about tradespeople.

## Understanding Ratings

### Rating System
- **5 Stars**: Excellent service
- **4 Stars**: Very good service
- **3 Stars**: Good service
- **2 Stars**: Below average
- **1 Star**: Poor service

### What to Look For
- Overall rating
- Number of reviews
- Recent reviews
- Response to feedback
- Consistency of ratings

## Reading Reviews

### Key Information
- **Quality of Work**: Was the work done well?
- **Timeliness**: Did they arrive on time?
- **Communication**: Were they responsive?
- **Professionalism**: Were they courteous?
- **Value**: Was the price fair?

### Red Flags
- Multiple negative reviews
- Unprofessional responses
- Pattern of issues
- Lack of recent reviews
- Suspicious review patterns

## Tips

- Read multiple reviews
- Look for detailed feedback
- Check review dates
- Consider the context
- Trust your instincts`
      },
      { 
        title: 'Checking qualifications', 
        content: 'How to verify certifications and professional credentials.',
        fullContent: `# Checking Qualifications

Verifying qualifications ensures you're working with qualified professionals.

## Types of Qualifications

### Common Certifications
- **Gas Safe**: Required for gas work
- **NICEIC**: Electrical work certification
- **CITB**: Construction industry training
- **CSCS**: Construction Skills Certification
- **Trade Associations**: Industry memberships

## How to Verify

1. **Check Profile**: Look for verified badges
2. **Review Certificates**: View uploaded documents
3. **Ask Questions**: Inquire about specific qualifications
4. **Verify Online**: Check with certifying bodies
5. **Request Proof**: Ask to see certificates

## Important Notes

- Some work requires specific qualifications
- Verify qualifications match the work type
- Check expiration dates
- Confirm insurance coverage
- Trust verified badges on profiles

## For Your Safety

- Never hire unqualified tradespeople for regulated work
- Verify insurance coverage
- Check for complaints or disciplinary actions
- Report suspicious activity
- Use platform verification features`
      },
      { 
        title: 'Contacting tradespeople', 
        content: 'Best practices for initial communication and enquiries.',
        fullContent: `# Contacting Tradespeople

Effective communication helps you find the right tradesperson for your project.

## Initial Contact

### What to Include
- **Brief Introduction**: Who you are
- **Project Overview**: What you need done
- **Timeline**: When you need it done
- **Budget**: Your budget range
- **Questions**: Any specific questions

### Communication Tips
- Be clear and concise
- Provide relevant details
- Ask specific questions
- Be respectful and professional
- Respond promptly

## Best Practices

### Do's
- Provide clear project details
- Share photos if helpful
- Be honest about budget
- Ask about availability
- Request references if needed

### Don'ts
- Don't be vague about requirements
- Don't pressure for immediate response
- Don't share personal information unnecessarily
- Don't negotiate aggressively
- Don't ignore red flags

## Follow-Up

- Give tradespeople time to respond
- Follow up if no response after 48 hours
- Thank them for their time
- Keep communication on-platform
- Document important conversations`
      },
    ],
  },
  {
    id: 'bidding-quotes',
    name: 'Bids & Quotes',
    icon: '💷',
    color: '#EC4899',
    articles: [
      { 
        title: 'Receiving and comparing quotes', 
        content: 'How to evaluate multiple bids for your project.',
        fullContent: `# Receiving and Comparing Quotes

Comparing quotes helps you make the best decision for your project.

## Understanding Quotes

### What's Included
- **Labor Costs**: Time and expertise
- **Materials**: Cost of materials needed
- **Additional Fees**: Permits, disposal, etc.
- **Timeline**: Estimated completion time
- **Warranty**: Guarantee on work

### Quote Breakdown
- Itemized costs
- Material specifications
- Labor hours
- Timeline
- Payment terms

## Comparing Quotes

### Key Factors
- **Total Cost**: Overall price
- **Value**: Quality vs. price
- **Timeline**: Completion schedule
- **Materials**: Quality of materials
- **Warranty**: Guarantee coverage

### Comparison Checklist
- [ ] Compare total costs
- [ ] Review material quality
- [ ] Check timelines
- [ ] Evaluate warranties
- [ ] Consider experience
- [ ] Review references
- [ ] Assess communication

## Making a Decision

- Don't choose solely on price
- Consider value and quality
- Trust your instincts
- Ask clarifying questions
- Review all factors together`
      },
      { 
        title: 'Accepting a bid', 
        content: 'Process for hiring a tradesperson and starting your project.',
        fullContent: `# Accepting a Bid

Accepting a bid starts your project with a tradesperson.

## Before Accepting

### Final Checks
- Review the quote carefully
- Confirm all details
- Ask any remaining questions
- Verify availability
- Check references if needed

### Important Considerations
- Total cost and payment terms
- Timeline and milestones
- Material specifications
- Warranty coverage
- Communication expectations

## Accepting Process

1. **Review Quote**: Double-check all details
2. **Click Accept**: Confirm acceptance
3. **Set Timeline**: Agree on start date
4. **Make Deposit**: Secure the booking
5. **Confirm Details**: Finalize arrangements

## After Accepting

- Communicate start date
- Prepare work area
- Ensure access is available
- Be available for questions
- Track progress

## Payment

- Deposit is held in escrow
- Payment released upon completion
- Review work before final payment
- Report any issues promptly
- Leave a review after completion`
      },
      { 
        title: 'Negotiating price', 
        content: 'Tips for professional price discussions with tradespeople.',
        fullContent: `# Negotiating Price

Professional negotiation can help you get fair pricing for your project.

## When to Negotiate

- Quote seems higher than expected
- You have multiple competitive quotes
- Project scope has changed
- You're a repeat customer
- You can offer flexibility

## Negotiation Tips

### Do's
- Be respectful and professional
- Provide context for your budget
- Offer flexibility on timeline
- Consider bundling services
- Reference market rates

### Don'ts
- Don't be aggressive
- Don't undervalue their work
- Don't make unreasonable demands
- Don't compare unfairly
- Don't pressure tactics

## Effective Strategies

- **Bundle Services**: Combine multiple jobs
- **Flexible Timeline**: Offer schedule flexibility
- **Material Choices**: Discuss material options
- **Payment Terms**: Offer upfront payment
- **Repeat Business**: Mention future projects

## Fair Negotiation

- Understand fair market rates
- Respect tradesperson expertise
- Be reasonable in requests
- Consider value, not just price
- Maintain professional relationship`
      },
      { 
        title: 'Understanding quote breakdowns', 
        content: 'How to read detailed cost estimates and timelines.',
        fullContent: `# Understanding Quote Breakdowns

Reading quote breakdowns helps you understand what you're paying for.

## Quote Components

### Labor Costs
- Hourly rate or fixed price
- Number of workers
- Estimated hours
- Skill level required

### Materials
- Material costs
- Quantity needed
- Quality specifications
- Supplier information

### Additional Costs
- Permits and inspections
- Waste disposal
- Equipment rental
- Travel expenses
- Contingency

## Reading the Breakdown

### Key Sections
- **Itemized List**: Each cost item
- **Totals**: Subtotal and grand total
- **Timeline**: Start and completion dates
- **Payment Terms**: When payments are due
- **Warranty**: What's covered

## Questions to Ask

- What's included in labor costs?
- Are materials included?
- What's the contingency for?
- Are there any hidden fees?
- What's the payment schedule?

## Understanding Value

- Compare itemized costs
- Assess material quality
- Consider expertise level
- Evaluate warranty coverage
- Factor in timeline`
      },
    ],
  },
  {
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
  },
  {
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
  },
  {
    id: 'tradespeople',
    name: 'For Tradespeople',
    icon: '🔨',
    color: '#F97316',
    articles: [
      { 
        title: 'Finding jobs near you', 
        content: 'How to discover local projects that match your skills.',
        fullContent: `# Finding Jobs Near You

Discover local jobs that match your skills and availability.

## Job Discovery

### Browse Jobs
- View all available jobs
- Filter by category
- Search by location
- Sort by date or budget
- Save favorites

### Job Alerts
- Set up job alerts
- Get notified of new jobs
- Match your preferences
- Never miss opportunities
- Customize alerts

## Finding the Right Jobs

### Filters
- **Category**: Your service areas
- **Location**: Your service radius
- **Budget**: Price range
- **Timeline**: When work starts
- **Type**: One-time or recurring

### Tips
- Check daily for new jobs
- Respond quickly to inquiries
- Review job details carefully
- Ask questions if unclear
- Submit competitive bids

## Job Details

- Read full description
- Review photos
- Check location
- Understand timeline
- Assess budget

## Submitting Bids

- Create detailed quotes
- Include all costs
- Set realistic timeline
- Highlight your expertise
- Stand out from competition`
      },
      { 
        title: 'Submitting competitive bids', 
        content: 'Tips for creating winning proposals.',
        fullContent: `# Submitting Competitive Bids

Well-crafted bids help you win more jobs and grow your business.

## Bid Components

### Essential Elements
- **Price**: Competitive and fair
- **Timeline**: Realistic schedule
- **Description**: Clear explanation
- **Materials**: What's included
- **Warranty**: Guarantee offered

### Stand Out
- Professional presentation
- Detailed breakdown
- Clear communication
- Relevant experience
- Strong portfolio

## Pricing Strategy

- Research market rates
- Factor in all costs
- Consider competition
- Value your expertise
- Be competitive but fair

## Writing Effective Bids

### Structure
- Brief introduction
- Understanding of project
- Your approach
- Timeline and milestones
- Price breakdown

### Tips
- Be specific
- Show expertise
- Address concerns
- Highlight experience
- Be professional

## Follow-Up

- Respond to questions
- Provide additional info
- Show interest
- Be available
- Build rapport`
      },
      { 
        title: 'Building your reputation', 
        content: 'Strategies for earning positive reviews and growing your business.',
        fullContent: `# Building Your Reputation

A strong reputation helps you win more jobs and grow your business.

## Reputation Factors

### Key Elements
- **Reviews**: Customer feedback
- **Ratings**: Star ratings
- **Response Rate**: How quickly you respond
- **Completion Rate**: Jobs completed
- **Verification**: Verified badges

## Earning Reviews

### Provide Great Service
- Do quality work
- Communicate well
- Be professional
- Meet deadlines
- Exceed expectations

### Request Reviews
- Ask satisfied customers
- Make it easy to review
- Follow up after completion
- Thank reviewers
- Respond to reviews

## Managing Reviews

- Respond to all reviews
- Thank positive reviewers
- Address concerns professionally
- Learn from feedback
- Improve continuously

## Building Trust

- Complete your profile
- Get verified
- Showcase your work
- Share qualifications
- Be transparent

## Growth Tips

- Focus on quality
- Build relationships
- Ask for referrals
- Maintain consistency
- Keep improving`
      },
      { 
        title: 'Managing your calendar', 
        content: 'How to update availability and schedule projects.',
        fullContent: `# Managing Your Calendar

Effective calendar management helps you balance workload and availability.

## Setting Availability

1. Go to Calendar settings
2. Set working hours
3. Block unavailable dates
4. Set service areas
5. Save preferences

## Calendar Features

- **Availability**: Show when you're free
- **Bookings**: View scheduled jobs
- **Block Dates**: Mark unavailable
- **Recurring**: Set regular availability
- **Sync**: Connect external calendars

## Scheduling Jobs

- Accept jobs that fit schedule
- Block time for accepted jobs
- Set realistic timelines
- Allow buffer time
- Update as needed

## Tips

- Keep calendar updated
- Block time realistically
- Allow for travel time
- Factor in preparation
- Plan for contingencies

## Best Practices

- Update availability regularly
- Respond to booking requests quickly
- Confirm dates with customers
- Set reminders
- Manage time effectively`
      },
      { 
        title: 'Receiving payments', 
        content: 'Understanding the payout process and timeline.',
        fullContent: `# Receiving Payments

Understanding how and when you'll receive payments for completed work.

## Payment Process

### How It Works
1. **Work Completed**: Finish the job
2. **Customer Approval**: Customer reviews work
3. **Payment Released**: Funds released from escrow
4. **Transfer**: Money sent to your account
5. **Confirmation**: You receive notification

## Payment Timeline

- **Immediate**: Upon customer approval
- **Processing**: 1-2 business days
- **Transfer**: 2-3 business days
- **Total**: 3-5 business days typically

## Payment Methods

- Bank transfer
- PayPal
- Other methods available
- Set in account settings
- Update as needed

## Milestone Payments

- For larger projects
- Payments at milestones
- Agreed in advance
- Released upon approval
- Final payment at completion

## Getting Paid Faster

- Complete work to standard
- Communicate clearly
- Request approval promptly
- Follow up if delayed
- Maintain good ratings

## Payment Issues

- Contact customer first
- Use dispute resolution if needed
- Contact support for help
- Document everything
- Stay professional`
      },
    ],
  },
  {
    id: 'safety',
    name: 'Safety & Trust',
    icon: '🛡️',
    color: '#10B981',
    articles: [
      { 
        title: 'Our verification process', 
        content: 'How we verify tradespeople and ensure platform safety.',
        fullContent: `# Our Verification Process

Mintenance verifies tradespeople to ensure platform safety and trust.

## Verification Steps

### Identity Verification
- Government-issued ID check
- Business registration verification
- Address confirmation
- Background checks

### Professional Verification
- Qualification verification
- License checks
- Insurance verification
- Trade association membership

## Verified Badges

- **Identity Verified**: ID confirmed
- **Professional Verified**: Qualifications verified
- **Insurance Verified**: Insurance confirmed
- **Trusted**: High ratings and reviews

## Benefits

- Enhanced trust
- Priority in search
- Verified badge display
- Access to premium features
- More job opportunities

## For Tradespeople

- Complete verification process
- Upload required documents
- Wait for review (24-48 hours)
- Get verified badge
- Build trust

## Safety Measures

- Regular re-verification
- Ongoing monitoring
- Complaint handling
- Quality assurance
- Platform security`
      },
      { 
        title: 'Reporting concerns', 
        content: 'How to report suspicious activity or safety issues.',
        fullContent: `# Reporting Concerns

Report safety concerns or suspicious activity to keep Mintenance safe.

## What to Report

- Safety hazards
- Suspicious behavior
- Fraud or scams
- Unprofessional conduct
- Platform abuse

## How to Report

1. **In-App**: Use report button
2. **Email**: support@mintenance.co.uk
3. **Phone**: Contact support
4. **Emergency**: Call 999 if immediate danger

## Reporting Process

- Report reviewed promptly
- Investigation conducted
- Appropriate action taken
- You'll be updated
- Privacy protected

## Emergency Situations

- **Immediate Danger**: Call 999
- **Safety Hazard**: Report immediately
- **Criminal Activity**: Contact police
- **Platform Issue**: Report to support

## After Reporting

- Report acknowledged
- Investigation begins
- Action taken if needed
- You're kept informed
- Issue resolved

## Your Safety

- Trust your instincts
- Report concerns promptly
- Document issues
- Use platform safety features
- Stay safe`
      },
      { 
        title: 'Insurance and guarantees', 
        content: 'Understanding coverage and protection for your projects.',
        fullContent: `# Insurance and Guarantees

Mintenance provides protection and peace of mind for your projects.

## Platform Protection

### Escrow Protection
- Funds held securely
- Payment protection
- Dispute resolution
- Refund protection

### Guarantees
- Work quality guarantee
- Completion guarantee
- Material guarantee
- Timeline protection

## Tradesperson Insurance

- Public liability insurance
- Professional indemnity
- Employer's liability
- Tool and equipment insurance

## Understanding Coverage

- Check insurance details
- Verify coverage levels
- Understand limitations
- Know what's covered
- Ask questions

## Making Claims

- Document the issue
- Contact support
- Provide evidence
- Follow process
- Get resolution

## Protection Tips

- Verify insurance
- Check coverage levels
- Understand guarantees
- Read terms carefully
- Keep documentation`
      },
      { 
        title: 'Staying safe online', 
        content: 'Best practices for protecting your personal information.',
        fullContent: `# Staying Safe Online

Protect yourself and your information when using Mintenance.

## Account Security

### Strong Passwords
- Use unique passwords
- Include numbers and symbols
- Don't share passwords
- Change regularly
- Use password manager

### Two-Factor Authentication
- Enable 2FA
- Extra security layer
- Protect account
- Easy to set up
- Highly recommended

## Personal Information

- Don't share personal details unnecessarily
- Keep communication on-platform
- Be cautious with contact info
- Protect financial information
- Report suspicious requests

## Safe Practices

- Verify tradespeople
- Check reviews
- Use platform payments
- Keep communication on-platform
- Trust verified badges

## Red Flags

- Requests for off-platform payment
- Pressure tactics
- Suspicious behavior
- Unrealistic promises
- Requests for personal info

## If Something Seems Wrong

- Trust your instincts
- Report concerns
- Don't proceed if unsure
- Contact support
- Stay safe`
      },
    ],
  },
  {
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
  },
];

