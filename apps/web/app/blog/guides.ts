export const guides = [
  {
    slug: 'prepare-your-job',
    title: 'A clearer brief gets a better conversation',
    category: 'Planning your project',
    summary: 'What to include before you ask a tradesperson for a quote.',
    sections: [
      [
        'Describe the outcome',
        'Explain what you want repaired or changed, where it is, and what a successful result would look like. Separate essential work from optional extras.',
      ],
      [
        'Add useful photos',
        'Include a wide view and close-ups of the issue. Avoid sharing personal documents, people or unrelated private details.',
      ],
      [
        'Share access and timing',
        'Mention access constraints, your preferred dates and anything the tradesperson should know before visiting. Agree the scope and price before work starts.',
      ],
    ],
  },
  {
    slug: 'compare-bids',
    title: 'Compare the whole proposal, not just the price',
    category: 'Choosing a tradesperson',
    summary:
      'Use scope, availability and profile details to make a considered choice.',
    sections: [
      [
        'Check what is included',
        'Compare materials, labour, expected duration and exclusions. Ask about unclear items through Messages before accepting a bid.',
      ],
      [
        'Review the profile',
        'Read job reviews and check the credentials relevant to your work. A profile badge is not a substitute for discussing the requirements of your particular job.',
      ],
      [
        'Agree the next step',
        'Confirm the scope, signatures, payment and visit arrangements in the app. Keep important agreements in the job conversation.',
      ],
    ],
  },
  {
    slug: 'review-completed-work',
    title: 'Make your final review count',
    category: 'Finishing a job',
    summary: 'Check the agreed work and record any outstanding concerns.',
    sections: [
      [
        'Compare the evidence',
        'Review before and after photos alongside the agreed scope. Ask for clarification if the photos do not show enough detail.',
      ],
      [
        'Raise concerns before approval',
        'Use the available request-changes or dispute options while the job and payment are eligible. Explain the specific issue and include relevant evidence.',
      ],
      [
        'Read the payment status',
        'Work approval and bank receipt are different steps. Payment release remains subject to the cooling-off period and final checks; bank arrival takes additional time. Contact support for a problem after settlement.',
      ],
    ],
  },
  {
    slug: 'keep-job-records',
    title: 'Keep your home maintenance records together',
    category: 'Looking after your home',
    summary: 'A few useful records make the next repair easier to plan.',
    sections: [
      [
        'Keep the agreement',
        'Retain the agreed scope, quote, contract and significant messages for each job.',
      ],
      [
        'Save completion details',
        'Keep invoices and relevant certificates or warranties supplied by the tradesperson. Check what each document covers and when it expires.',
      ],
      [
        'Plan the next check',
        'Use your property records to plan future maintenance. Follow manufacturer instructions and seek an appropriately qualified professional for specialist work.',
      ],
    ],
  },
] as const;
