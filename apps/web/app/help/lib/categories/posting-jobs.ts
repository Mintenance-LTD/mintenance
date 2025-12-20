/**
 * Posting Jobs Category
 * 
 * Help articles for posting jobs.
 */

import type { Category } from './types';

export const postingjobsCategory: Category = {
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
};
