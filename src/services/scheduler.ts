import schedule from 'node-schedule';
import { checkPasswordExpiry } from './email';

// Run the password expiry check every day at 9:00 AM
export const startPasswordExpiryScheduler = () => {
  schedule.scheduleJob('0 9 * * *', async () => {
    console.log('Running scheduled password expiry check...');
    try {
      await checkPasswordExpiry();
      console.log('Password expiry check completed successfully');
    } catch (error) {
      console.error('Error in scheduled password expiry check:', error);
    }
  });
  console.log('Password expiry scheduler started');
};
