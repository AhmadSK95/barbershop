const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sendEmail = async (to, subject, htmlBody, textBody = null) => {
  try {
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          ...(textBody && {
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    
    console.log('Email sent successfully:', result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Template functions for common emails
const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const subject = 'Booking Confirmation - Balkan Barber Shop';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8d6e63, #6d4c41); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-left: 4px solid #8d6e63; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #6d4c41; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .btn { display: inline-block; background: #8d6e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✂️ Balkan Barber Shop</h1>
          <p>Your Appointment is Confirmed!</p>
        </div>
        <div class="content">
          <p>Hi ${bookingDetails.customerName},</p>
          <p>Thank you for booking with us! Here are your appointment details:</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${bookingDetails.date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span>${bookingDetails.time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Barber:</span>
              <span>${bookingDetails.barberName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Services:</span>
              <span>${bookingDetails.services}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total:</span>
              <span><strong>$${bookingDetails.totalPrice}</strong></span>
            </div>
          </div>
          
          <p>We look forward to seeing you!</p>
          <p>If you need to reschedule or cancel, please contact us or visit your profile.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/profile" class="btn">View My Bookings</a>
          </div>
        </div>
        <div class="footer">
          <p>Balkan Barber Shop | Premium Grooming Services</p>
          <p>Questions? Reply to this email or call us</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textBody = `
Booking Confirmation - Balkan Barber Shop

Hi ${bookingDetails.customerName},

Your appointment is confirmed!

Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Barber: ${bookingDetails.barberName}
Services: ${bookingDetails.services}
Total: $${bookingDetails.totalPrice}

We look forward to seeing you!

Balkan Barber Shop
  `;

  return sendEmail(email, subject, htmlBody, textBody);
};

const sendBookingReminderEmail = async (email, bookingDetails) => {
  const subject = 'Reminder: Your Appointment Tomorrow - Balkan Barber Shop';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8d6e63; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⏰ Appointment Reminder</h2>
        </div>
        <div class="content">
          <p>Hi ${bookingDetails.customerName},</p>
          <p>This is a friendly reminder about your appointment tomorrow:</p>
          <p><strong>Time:</strong> ${bookingDetails.time}<br>
          <strong>Barber:</strong> ${bookingDetails.barberName}</p>
          <p>See you soon!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, htmlBody);
};

module.exports = {
  sendEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
};
