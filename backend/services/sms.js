const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const pool = require('../src/config/database');

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Normalize phone numbers to E.164 format (assume +1 for US if no country code)
const normalizePhone = (phoneNumber) => {
  if (!phoneNumber) return null;
  const raw = phoneNumber.toString().trim();

  if (raw.startsWith('+')) {
    return raw.replace(/[^\d+]/g, '');
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Default to US country code
  return `+1${digits}`;
};

const isPhoneInDnd = async (normalizedPhone) => {
  if (!normalizedPhone) return false;

  try {
    const result = await pool.query(
      'SELECT 1 FROM sms_dnd_numbers WHERE phone_number = $1 LIMIT 1',
      [normalizedPhone]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking SMS DND list:', error);
    return false;
  }
};

const sendSMS = async (phoneNumber, message) => {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    // Skip sending if number is on the DND list
    if (await isPhoneInDnd(normalizedPhone)) {
      console.log(`SMS not sent to ${normalizedPhone} (in DND list)`);
      return { success: false, skipped: true, reason: 'dnd' };
    }
    
    const params = {
      Message: message,
      PhoneNumber: normalizedPhone,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: process.env.AWS_SNS_SENDER_ID || 'BalkanBarber',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // or 'Promotional'
        },
      },
    };

    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    
    console.log('SMS sent successfully:', result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

// Build DND cancellation link for SMS messages
// Example final URL (if SMS_DND_BASE_URL=https://api.example.com):
//   https://api.example.com/api/sms/dnd?phone=<url-encoded-phone>
const buildDndLink = (phoneNumber) => {
  const baseUrl = process.env.SMS_DND_BASE_URL;
  if (!baseUrl) return null;

  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) return null;

  const trimmedBase = baseUrl.replace(/\/$/, '');
  const encodedPhone = encodeURIComponent(normalizedPhone);
  return `${trimmedBase}/api/sms/dnd?phone=${encodedPhone}`;
};

// Template functions for common SMS messages
const sendBookingConfirmationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Hi ${bookingDetails.customerName}! Your appointment at Balkan Barber is confirmed for ${bookingDetails.date} at ${bookingDetails.time} with ${bookingDetails.barberName}. See you soon!`;
  return sendSMS(phoneNumber, message);
};

const sendBookingReminderSMS = async (phoneNumber, bookingDetails) => {
  const dndLink = buildDndLink(phoneNumber);
  const baseMessage = `Reminder: Your appointment at Balkan Barber is tomorrow at ${bookingDetails.time} with ${bookingDetails.barberName}.`;
  const message = dndLink
    ? `${baseMessage} To stop SMS reminders, tap: ${dndLink}`
    : baseMessage;

  return sendSMS(phoneNumber, message);
};

const sendBookingCancellationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Your appointment at Balkan Barber on ${bookingDetails.date} at ${bookingDetails.time} has been cancelled. Book again anytime!`;
  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendBookingReminderSMS,
  sendBookingCancellationSMS,
};
