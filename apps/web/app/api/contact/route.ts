import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailService } from '@/lib/email-service';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  category: z.enum(['general', 'technical', 'billing', 'partnerships', 'press', 'feedback']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Privacy Policy',
  }),
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitResult = await checkApiRateLimit(`contact-form:${ip}`);

    if (!rateLimitResult.allowed) {
      logger.warn('Contact form rate limit exceeded', {
        service: 'contact',
        ip,
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: 'Invalid form data', 
          details: parsed.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const formData = parsed.data;

    // Get admin email from platform settings or use default
    const { data: setting } = await serverSupabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_email')
      .single();

    const adminEmail = setting?.setting_value || 
                      process.env.ADMIN_EMAIL || 
                      'admin@mintenance.co.uk';

    // Category labels for display
    const categoryLabels: Record<string, string> = {
      general: 'General Enquiry',
      technical: 'Technical Support',
      billing: 'Billing & Payments',
      partnerships: 'Partnership Opportunities',
      press: 'Press & Media',
      feedback: 'Feedback & Suggestions',
    };

    // Create email content
    const categoryLabel = categoryLabels[formData.category] || formData.category;
    const subject = `Contact Form: ${categoryLabel} - ${formData.subject}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 20px; }
            .field-label { font-weight: bold; color: #1F2937; margin-bottom: 5px; }
            .field-value { color: #4B5563; padding: 10px; background: #F9FAFB; border-radius: 4px; }
            .message-box { padding: 15px; background: #F9FAFB; border-left: 4px solid #3B82F6; margin-top: 10px; white-space: pre-wrap; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">Category:</div>
                <div class="field-value">${categoryLabel}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Name:</div>
                <div class="field-value">${formData.name}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">
                  <a href="mailto:${formData.email}">${formData.email}</a>
                </div>
              </div>
              
              <div class="field">
                <div class="field-label">Subject:</div>
                <div class="field-value">${formData.subject}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="message-box">${formData.message}</div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p>This message was submitted through the Mintenance contact form.</p>
                <p>You can reply directly to: <a href="mailto:${formData.email}">${formData.email}</a></p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mintenance. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New Contact Form Submission

Category: ${categoryLabel}
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}

---
This message was submitted through the Mintenance contact form.
You can reply directly to: ${formData.email}

© ${new Date().getFullYear()} Mintenance. All rights reserved.
    `;

    // Send email to admin
    const emailSent = await EmailService.sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
    });

    if (!emailSent) {
      logger.error('Failed to send contact form email', {
        service: 'contact',
        adminEmail,
        formData: {
          name: formData.name,
          email: formData.email,
          category: formData.category,
        },
      });
      
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    logger.info('Contact form submission received', {
      service: 'contact',
      category: formData.category,
      email: formData.email,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully. We\'ll get back to you within 24 hours.' 
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error('Contact form submission error', error, {
      service: 'contact',
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

