const { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses');

// Create SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Verify email identity (only needs to be done once per sender email)
const verifyEmailIdentity = async (email) => {
  try {
    const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
    await sesClient.send(command);
    console.log(`✅ Verification email sent to ${email}. Check inbox and click the verification link.`);
    return true;
  } catch (error) {
    console.error('Error verifying email identity:', error);
    throw error;
  }
};

// Send verification email
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  const senderEmail = process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@balkanbarbers.com';

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Verify Your Email - Balkan Barbers',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="margin: 0; color: #D4A574; font-size: 32px; font-weight: bold;">✂️ Balkan Barbers</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Welcome, ${firstName}!</h2>
                          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            Thank you for registering with Balkan Barbers. We're excited to have you!
                          </p>
                          <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            Please verify your email address by clicking the button below:
                          </p>
                          
                          <!-- Button -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 0 0 30px 0;">
                                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4A574 0%, #B8956A 100%); color: #1a0f0a; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #8B6F47;">
                                  Verify Email Address
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Or copy and paste this link into your browser:
                          </p>
                          <p style="margin: 0 0 30px 0; color: #0066cc; font-size: 14px; word-break: break-all;">
                            ${verificationUrl}
                          </p>
                          
                          <div style="background-color: #fff8e1; border-left: 4px solid #D4A574; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                              <strong>⏱️ This link will expire in 24 hours.</strong>
                            </p>
                          </div>
                          
                          <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">
                            If you didn't create an account, please ignore this email.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Balkan Barbers - Premium Grooming Services
                          </p>
                          <p style="margin: 0; color: #ccc; font-size: 12px;">
                            © ${new Date().getFullYear()} Balkan Barbers. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Welcome to Balkan Barbers, ${firstName}!\n\nThank you for registering. Please verify your email address by visiting:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.\n\n--\nBalkan Barbers\nPremium Grooming Services`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`✅ Verification email sent to ${email} via AWS SES (MessageId: ${response.MessageId})`);
    return response;
  } catch (error) {
    console.error('❌ Error sending verification email via AWS SES:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Send booking confirmation email
const sendBookingConfirmationEmail = async (email, firstName, bookingDetails) => {
  const senderEmail = process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@balkanbarbers.com';

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '✅ Booking Confirmed - Balkan Barbers',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="margin: 0; color: #D4A574; font-size: 32px; font-weight: bold;">✂️ Balkan Barbers</h1>
                        </td>
                      </tr>
                      
                      <!-- Success Badge -->
                      <tr>
                        <td style="padding: 30px 30px 0 30px; text-align: center;">
                          <div style="display: inline-block; background-color: #10b981; color: white; padding: 10px 25px; border-radius: 50px; font-weight: bold; font-size: 16px;">
                            ✅ Booking Confirmed
                          </div>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Hi ${firstName},</h2>
                          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            Your appointment has been confirmed! We look forward to seeing you.
                          </p>
                          
                          <!-- Booking Details Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a0f0a 0%, #2d1f18 100%); border-radius: 8px; overflow: hidden; margin: 20px 0;">
                            <tr>
                              <td style="padding: 25px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">SERVICE</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.service || 'Haircut'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">BARBER</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.barber || 'Any Available'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">📅 DATE</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.date}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">🕐 TIME</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.time}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0;">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">💰 TOTAL PRICE</span><br/>
                                      <span style="color: #fff; font-size: 20px; font-weight: bold;">$${bookingDetails.price}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <div style="background-color: #fff8e1; border-left: 4px solid #D4A574; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                              <strong>📍 Location:</strong> Balkan Barbers<br/>
                              <span style="color: #888; font-size: 13px;">123 Main Street, City, State 12345</span><br/>
                              <strong>⏱️ Please arrive 5 minutes early</strong>
                            </p>
                          </div>
                          
                          <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                            Need to cancel or reschedule? Please contact us at least 24 hours in advance.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Balkan Barbers - Premium Grooming Services
                          </p>
                          <p style="margin: 0; color: #ccc; font-size: 12px;">
                            © ${new Date().getFullYear()} Balkan Barbers. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Booking Confirmed!\n\nHi ${firstName},\n\nYour appointment has been confirmed:\n\nService: ${bookingDetails.service}\nBarber: ${bookingDetails.barber}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\nTotal Price: $${bookingDetails.price}\n\nLocation: Balkan Barbers\n123 Main Street, City, State 12345\n\nPlease arrive 5 minutes early.\n\n--\nBalkan Barbers\nPremium Grooming Services`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`✅ Booking confirmation email sent to ${email} via AWS SES (MessageId: ${response.MessageId})`);
    return response;
  } catch (error) {
    console.error('❌ Error sending booking confirmation email via AWS SES:', error);
    throw new Error(`Failed to send booking confirmation email: ${error.message}`);
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const senderEmail = process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@balkanbarbers.com';

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '🔐 Password Reset Request - Balkan Barbers',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="margin: 0; color: #D4A574; font-size: 32px; font-weight: bold;">✂️ Balkan Barbers</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Password Reset Request</h2>
                          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            Hi ${firstName},
                          </p>
                          <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            You recently requested to reset your password. Click the button below to reset it:
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 0 0 30px 0;">
                                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                  Reset Password
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Or copy and paste this link:
                          </p>
                          <p style="margin: 0 0 30px 0; color: #0066cc; font-size: 14px; word-break: break-all;">
                            ${resetUrl}
                          </p>
                          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                              <strong>⏱️ This link will expire in 1 hour.</strong>
                            </p>
                          </div>
                          <p style="margin: 0; color: #d32f2f; font-size: 14px; line-height: 1.6;">
                            <strong>If you didn't request this, please ignore this email or contact support if you have concerns.</strong>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Balkan Barbers - Premium Grooming Services
                          </p>
                          <p style="margin: 0; color: #ccc; font-size: 12px;">
                            © ${new Date().getFullYear()} Balkan Barbers. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Password Reset Request\n\nHi ${firstName},\n\nYou recently requested to reset your password. Visit this link to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\n--\nBalkan Barbers`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`✅ Password reset email sent to ${email} via AWS SES (MessageId: ${response.MessageId})`);
    return response;
  } catch (error) {
    console.error('❌ Error sending password reset email via AWS SES:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Send job application notification email to admin
const sendJobApplicationEmail = async (applicationDetails) => {
  const rootEmail = process.env.ROOT_EMAIL || process.env.ADMIN_EMAIL || 'admin@balkanbarbers.com';
  const senderEmail = process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@balkanbarbers.com';

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [rootEmail],
    },
    Message: {
      Subject: {
        Data: `🎯 New Job Application - ${applicationDetails.position}`,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎯 New Job Application</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Application Details</h2>
                          
                          <!-- Applicant Info Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a0f0a 0%, #2d1f18 100%); border-radius: 8px; overflow: hidden; margin: 20px 0;">
                            <tr>
                              <td style="padding: 25px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">👤 APPLICANT NAME</span><br/>
                                      <span style="color: #fff; font-size: 18px; font-weight: bold;">${applicationDetails.name}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">📧 EMAIL</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${applicationDetails.email}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">📱 PHONE</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${applicationDetails.phone}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0;">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">💼 POSITION APPLIED</span><br/>
                                      <span style="color: #fff; font-size: 18px; font-weight: bold;">${applicationDetails.position}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          ${applicationDetails.message ? `
                          <div style="background-color: #f9f9f9; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0 0 10px 0; color: #10b981; font-size: 14px; font-weight: bold;">📝 MESSAGE</p>
                            <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${applicationDetails.message}</p>
                          </div>
                          ` : ''}
                          
                          ${applicationDetails.hasResume ? `
                          <div style="background-color: #fff8e1; border-left: 4px solid #D4A574; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                              <strong>📎 Resume Attached:</strong> ${applicationDetails.resumeName}
                            </p>
                          </div>
                          ` : `
                          <div style="background-color: #f3f4f6; border-left: 4px solid #9ca3af; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                              <strong>ℹ️ No resume attached</strong>
                            </p>
                          </div>
                          `}
                          
                          <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                            Application received on ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Balkan Barbers - Premium Grooming Services
                          </p>
                          <p style="margin: 0; color: #ccc; font-size: 12px;">
                            © ${new Date().getFullYear()} Balkan Barbers. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `New Job Application Received\n\nPosition: ${applicationDetails.position}\n\nApplicant Details:\nName: ${applicationDetails.name}\nEmail: ${applicationDetails.email}\nPhone: ${applicationDetails.phone}\n\n${applicationDetails.message ? `Message:\n${applicationDetails.message}\n\n` : ''}${applicationDetails.hasResume ? `Resume: ${applicationDetails.resumeName} (attached)` : 'No resume attached'}\n\nApplication received: ${new Date().toLocaleString()}\n\n--\nBalkan Barbers\nPremium Grooming Services`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  // Note: AWS SES SendEmailCommand doesn't support attachments directly.
  // For resume attachments, we would need to use SendRawEmailCommand with MIME multipart format.
  // For now, we'll save the resume file separately and provide download instructions.
  // The applicant can also reply to the notification email with their resume attached.

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`✅ Job application notification sent to ${rootEmail} via AWS SES (MessageId: ${response.MessageId})`);
    
    // If there's a resume, log it for future implementation
    if (applicationDetails.hasResume) {
      console.log(`📎 Resume file received: ${applicationDetails.resumeName} (${(applicationDetails.resumeBuffer.length / 1024).toFixed(2)} KB)`);
      console.log(`💡 Note: Resume attachments require SendRawEmailCommand implementation for AWS SES`);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error sending job application notification via AWS SES:', error);
    throw new Error(`Failed to send job application notification: ${error.message}`);
  }
};

// Send booking reminder email (24h or 2h before appointment)
const sendBookingReminderEmail = async (email, firstName, bookingDetails, hoursUntil) => {
  const senderEmail = process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL || 'noreply@balkanbarbers.com';
  const reminderType = hoursUntil >= 24 ? '24-hour' : '2-hour';
  const urgencyColor = hoursUntil >= 24 ? '#2196F3' : '#ff9800';

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: `⏰ Reminder: Your appointment ${hoursUntil >= 24 ? 'tomorrow' : 'is in 2 hours'}`,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="margin: 0; color: #D4A574; font-size: 32px; font-weight: bold;">✂️ Balkan Barbers</h1>
                        </td>
                      </tr>
                      
                      <!-- Reminder Badge -->
                      <tr>
                        <td style="padding: 30px 30px 0 30px; text-align: center;">
                          <div style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 10px 25px; border-radius: 50px; font-weight: bold; font-size: 16px;">
                            ⏰ ${reminderType.toUpperCase()} REMINDER
                          </div>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Hi ${firstName},</h2>
                          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            This is a friendly reminder about your upcoming appointment ${hoursUntil >= 24 ? 'tomorrow' : 'in 2 hours'}.
                          </p>
                          
                          <!-- Booking Details Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a0f0a 0%, #2d1f18 100%); border-radius: 8px; overflow: hidden; margin: 20px 0;">
                            <tr>
                              <td style="padding: 25px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">SERVICE</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.service || 'Haircut'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">BARBER</span><br/>
                                      <span style="color: #fff; font-size: 16px;">${bookingDetails.barber || 'Any Available'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid rgba(212, 165, 116, 0.2);">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">📅 DATE</span><br/>
                                      <span style="color: #fff; font-size: 18px; font-weight: bold;">${bookingDetails.date}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 10px 0;">
                                      <span style="color: #D4A574; font-size: 14px; font-weight: bold;">🕐 TIME</span><br/>
                                      <span style="color: #fff; font-size: 18px; font-weight: bold;">${bookingDetails.time}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <div style="background-color: #fff8e1; border-left: 4px solid #D4A574; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                              <strong>📍 Location:</strong> Balkan Barbers<br/>
                              <span style="color: #888; font-size: 13px;">123 Main Street, City, State 12345</span><br/>
                              <strong>⏱️ Please arrive 5 minutes early</strong>
                            </p>
                          </div>
                          
                          <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                            Need to cancel or reschedule? Please contact us as soon as possible.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 14px;">
                            Balkan Barbers - Premium Grooming Services
                          </p>
                          <p style="margin: 0; color: #ccc; font-size: 12px;">
                            © ${new Date().getFullYear()} Balkan Barbers. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Appointment Reminder (${reminderType})\n\nHi ${firstName},\n\nThis is a reminder about your appointment ${hoursUntil >= 24 ? 'tomorrow' : 'in 2 hours'}:\n\nService: ${bookingDetails.service}\nBarber: ${bookingDetails.barber}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\n\nLocation: Balkan Barbers\n123 Main Street, City, State 12345\n\nPlease arrive 5 minutes early.\n\n--\nBalkan Barbers`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`✅ ${reminderType} reminder sent to ${email} via AWS SES (MessageId: ${response.MessageId})`);
    return response;
  } catch (error) {
    console.error(`❌ Error sending ${reminderType} reminder via AWS SES:`, error);
    throw new Error(`Failed to send reminder: ${error.message}`);
  }
};

module.exports = {
  verifyEmailIdentity,
  sendVerificationEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendJobApplicationEmail,
  sendBookingReminderEmail,
};
