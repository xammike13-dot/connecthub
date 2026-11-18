import crypto from 'crypto';

export const hashEmailVerificationCode = (userId, code) => {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('EMAIL_VERIFICATION_SECRET or JWT_SECRET must be configured');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${code}`)
    .digest('hex');
};
