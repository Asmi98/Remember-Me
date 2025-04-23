import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { Database } from '@/types/supabase';
import { differenceInDays, addDays, parseISO } from 'date-fns';

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    // Use an App Password, not your regular password
    // Generate one at https://myaccount.google.com/apppasswords
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface PasswordExpiryNotification {
  userId: string;
  userEmail: string;
  expiringPasswords: {
    title: string;
    daysUntilExpiry: number;
    lastUpdated: string;
  }[];
}

export const sendPasswordExpiryNotification = async (notification: PasswordExpiryNotification) => {
  const { userId, userEmail, expiringPasswords } = notification;

  const passwordList = expiringPasswords
    .map(
      (pwd) =>
        `- ${pwd.title}: Last updated ${pwd.lastUpdated}, expires in ${pwd.daysUntilExpiry} days`
    )
    .join('\n');

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: userEmail,
    subject: 'Password Expiration Notice',
    text: `Hello,

Some of your passwords are approaching their expiration date (30 days from last update):

${passwordList}

Please update these passwords soon to maintain security.

Best regards,
Your Password Manager`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password expiry notification sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending password expiry notification:', error);
    throw error;
  }
};

export const checkPasswordExpiry = async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
  );

  try {
    // Get all passwords with their user information
    const { data: passwords, error: passwordsError } = await supabase
      .from('passwords')
      .select(`
        *,
        user:user_id (
          email
        )
      `);

    if (passwordsError) throw passwordsError;

    // Group passwords by user
    const userPasswordMap = new Map<
      string,
      { email: string; passwords: typeof passwords }
    >();

    passwords.forEach((password) => {
      const userId = password.user_id;
      const userEmail = (password.user as any)?.email;

      if (!userPasswordMap.has(userId)) {
        userPasswordMap.set(userId, { email: userEmail, passwords: [] });
      }
      userPasswordMap.get(userId)?.passwords.push(password);
    });

    // Check each user's passwords
    for (const [userId, userData] of userPasswordMap) {
      const expiringPasswords = userData.passwords
        .map((password) => {
          const lastUpdated = parseISO(password.updated_at);
          const daysUntilExpiry = 30 - differenceInDays(new Date(), lastUpdated);

          // Only include passwords that will expire in 3 days
          if (daysUntilExpiry === 3) {
            return {
              title: password.title,
              daysUntilExpiry,
              lastUpdated: password.updated_at,
            };
          }
          return null;
        })
        .filter((pwd): pwd is NonNullable<typeof pwd> => pwd !== null);

      // If there are expiring passwords, send notification
      if (expiringPasswords.length > 0) {
        await sendPasswordExpiryNotification({
          userId,
          userEmail: userData.email,
          expiringPasswords,
        });
      }
    }
  } catch (error) {
    console.error('Error checking password expiry:', error);
    throw error;
  }
};
