const { PinpointClient, SendMessagesCommand } = require('@aws-sdk/client-pinpoint');
const pool = require('../src/config/database');

const pinpointClient = new PinpointClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Normalize phone numbers to E.164 format
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

    // Pinpoint requires an Application ID - we'll use a dummy one for transactional SMS
    const applicationId = process.env.AWS_PINPOINT_APP_ID || 'barbershop-sms';
    
    const params = {
      ApplicationId: applicationId,
      MessageRequest: {
        Addresses: {
          [normalizedPhone]: {
            ChannelType: 'SMS'
          }
        },
        MessageConfiguration: {
          SMSMessage: {
            Body: message,
            MessageType: 'TRANSACTIONAL',
            // OriginationNumber is optional for transactional messages
          }
        }
      }
    };

    const command = new SendMessagesCommand(params);
    const result = await pinpointClient.send(command);
    
    console.log('SMS sent successfully via Pinpoint:', result.MessageResponse.Result[normalizedPhone].MessageId);
    return { 
      success: true, 
      messageId: result.MessageResponse.Result[normalizedPhone].MessageId 
    };
  } catch (error) {
    console.error('Error sending SMS via Pinpoint:', error);
    throw error;
  }
};

// Template functions for common SMS messages
const sendBookingConfirmationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Hi ${bookingDetails.customerName}! Your appointment at Balkan Barber is confirmed for ${bookingDetails.date} at ${bookingDetails.time} with ${bookingDetails.barberName}. See you soon!`;
  return sendSMS(phoneNumber, message);
};

const sendBookingReminderSMS = async (phoneNumber, bookingDetails) => {
  const message = `Reminder: Your appointment at Balkan Barber is tomorrow at ${bookingDetails.time} with ${bookingDetails.barberName}.`;
  return sendSMS(phoneNumber, message);
};

const sendBookingCancellationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Your appointment at Balkan Barber on ${bookingDetails.date} at ${bookingDetails.time} has been cancelled. Book again anytime!`;
  return sendSMS(phoneNumber, message);
};

const sendBarberBookingNotificationSMS = async (phoneNumber, bookingDetails) => {
  const message = `New booking confirmed! Customer: ${bookingDetails.customerName}, Service: ${bookingDetails.service}, Date: ${bookingDetails.date} at ${bookingDetails.time}. Total: $${bookingDetails.price}`;
  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendBookingReminderSMS,
  sendBookingCancellationSMS,
  sendBarberBookingNotificationSMS,
};
