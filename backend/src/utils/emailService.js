/**
 * Email Service Router
 * Automatically uses the appropriate email service based on configuration
 */

const useAWS = process.env.EMAIL_SERVICE === 'ses' && 
               process.env.AWS_ACCESS_KEY_ID && 
               process.env.AWS_SECRET_ACCESS_KEY;

// Use AWS SES or fallback to SMTP
const emailProvider = useAWS 
  ? require('./sesEmail')
  : require('./email');

console.log(`📧 Email Provider: ${useAWS ? 'AWS SES' : 'SMTP/Gmail'}`);

module.exports = {
  sendVerificationEmail: emailProvider.sendVerificationEmail,
  sendPasswordResetEmail: emailProvider.sendPasswordResetEmail,
  sendBookingConfirmationEmail: emailProvider.sendBookingConfirmationEmail,
  verifyEmailIdentity: emailProvider.verifyEmailIdentity || (() => Promise.resolve()),
};
