const twilio = require('twilio');
const pool = require('../src/config/database');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

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

const checkSMSConsent = async (phoneNumber) => {
  if (!phoneNumber) return false;
  
  try {
    const result = await pool.query(
      'SELECT sms_consent FROM users WHERE phone = $1 LIMIT 1',
      [phoneNumber]
    );
    return result.rows.length > 0 && result.rows[0].sms_consent === true;
  } catch (error) {
    console.error('Error checking SMS consent:', error);
    return false;
  }
};

const sendSMS = async (phoneNumber, message) => {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    // Check if user has consented to SMS
    const hasConsent = await checkSMSConsent(phoneNumber);
    if (!hasConsent) {
      console.log(`SMS not sent to ${normalizedPhone} (no SMS consent)`);
      return { success: false, skipped: true, reason: 'no_consent' };
    }

    // Skip sending if number is on the DND list
    if (await isPhoneInDnd(normalizedPhone)) {
      console.log(`SMS not sent to ${normalizedPhone} (in DND list)`);
      return { success: false, skipped: true, reason: 'dnd' };
    }

    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone
    });
    
    console.log('SMS sent successfully via Twilio:', twilioMessage.sid);
    return { success: true, messageId: twilioMessage.sid };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
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
