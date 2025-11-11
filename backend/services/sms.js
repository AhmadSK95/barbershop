const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sendSMS = async (phoneNumber, message) => {
  try {
    // Format phone number to E.164 format if not already
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
    
    const params = {
      Message: message,
      PhoneNumber: formattedPhone,
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

// Template functions for common SMS messages
const sendBookingConfirmationSMS = async (phoneNumber, bookingDetails) => {
  const message = `Hi ${bookingDetails.customerName}! Your appointment at Balkan Barber is confirmed for ${bookingDetails.date} at ${bookingDetails.time} with ${bookingDetails.barberName}. See you soon!`;
  return sendSMS(phoneNumber, message);
};

const sendBookingReminderSMS = async (phoneNumber, bookingDetails) => {
  const message = `Reminder: Your appointment at Balkan Barber is tomorrow at ${bookingDetails.time} with ${bookingDetails.barberName}. Reply CANCEL to cancel.`;
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
