import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subject, message, errorType, walletAddress, timestamp } = body;

    // Validate required fields
    if (!email || !subject || !message || !errorType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Save to database
    // 2. Send email notification to support team
    // 3. Send confirmation email to user
    
    // For now, we'll just log the contact request
    console.log('Contact Support Request:', {
      email,
      subject,
      message,
      errorType,
      walletAddress,
      timestamp,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // In a real implementation, you might want to:
    // - Save to a database (MongoDB, PostgreSQL, etc.)
    // - Send email using a service like SendGrid, Nodemailer, etc.
    // - Create a ticket in a support system
    
    // Example database save (uncomment and modify as needed):
    /*
    const contactRequest = {
      email,
      subject,
      message,
      errorType,
      walletAddress,
      timestamp: new Date(timestamp),
      status: 'open',
      createdAt: new Date()
    };
    
    // Save to your database here
    // await db.collection('contact_requests').insertOne(contactRequest);
    */

    // Example email notification (uncomment and configure as needed):
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      // Configure your email service
    });
    
    await transporter.sendMail({
      from: process.env.SUPPORT_EMAIL,
      to: process.env.SUPPORT_EMAIL,
      subject: `Support Request: ${subject}`,
      html: `
        <h3>New Support Request</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Wallet:</strong> ${walletAddress || 'Not provided'}</p>
        <p><strong>Issue Type:</strong> ${errorType}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
      `
    });
    */

    return NextResponse.json(
      { 
        success: true, 
        message: 'Support request submitted successfully' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing contact request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}