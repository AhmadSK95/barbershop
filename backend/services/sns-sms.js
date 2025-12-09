const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const pool = require('../src/config/database');

// Initialize SNS client
let snsClient = null;
let snsEnabled = false;

try {
  if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    snsClient = new SNSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    snsEnabled = true;
    console.log('📱 AWS SNS SMS service initialized');
  } else {
    console.log('⚠️  AWS SNS not configured - SMS notifications disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize AWS SNS:', error.message);
  snsEnabled = false;
}

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

// Check if phone number is in DND list
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
    return false; // Fail open - don't block SMS on DB error
  }
};

// Check if user has SMS consent
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
    return false; // Fail closed - don't send SMS without confirmed consent
  }
};

// Core SMS sending function with graceful failure
const sendSMS = async (phoneNumber, message) => {
  // If SNS is not configured, silently skip
  if (!snsEnabled || !snsClient) {
    console.log('📱 SMS skipped (SNS not configured)');
    return { success: false, skipped: true, reason: 'sns_not_configured' };
  }

  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    if (!normalizedPhone) {
      console.log('📱 SMS skipped (invalid phone number)');
      return { success: false, skipped: true, reason: 'invalid_phone' };
    }

    // Check SMS consent
    const hasConsent = await checkSMSConsent(phoneNumber);
    if (!hasConsent) {
      console.log(`📱 SMS skipped for ${normalizedPhone} (no consent)`);
      return { success: false, skipped: true, reason: 'no_consent' };
    }

    // Check DND list
    if (await isPhoneInDnd(normalizedPhone)) {
      console.log(`📱 SMS skipped for ${normalizedPhone} (DND list)`);
      return { success: false, skipped: true, reason: 'dnd' };
    }

    // Send SMS via AWS SNS
    // Note: AWS automatically uses your toll-free number (+18666068075) 
    // if configured as default origination identity in AWS Console
    const params = {
      Message: message,
      PhoneNumber: normalizedPhone
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    
    console.log(`✅ SMS sent via AWS SNS to ${normalizedPhone} (MessageId: ${response.MessageId})`);
    return { success: true, messageId: response.MessageId };
    
  } catch (error) {
    // Log error but don't throw - graceful failure
    console.error('❌ AWS SNS SMS error:', error.message);
    return { success: false, skipped: false, error: error.message };
  }
};

// Template functions for common SMS messages
const sendBookingConfirmationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Hi ${bookingDetails.customerName || 'there'}! Your appointment at Balkan Barber is confirmed for ${bookingDetails.date} at ${bookingDetails.time} with ${bookingDetails.barber}. See you soon!`;
  return sendSMS(phoneNumber, message);
};

const sendBookingReminderSMS = async (phoneNumber, bookingDetails) => {
  const message = `Reminder: Your appointment at Balkan Barber is tomorrow at ${bookingDetails.time} with ${bookingDetails.barber}.`;
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
  snsEnabled
};
