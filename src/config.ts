import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Bot token from @BotFather
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  
  // Admin group ID (private group where admins/moderators review confessions)
  ADMIN_GROUP_ID: process.env.ADMIN_GROUP_ID || '',
  
  // Channel ID where approved messages will be posted
  CHANNEL_ID: process.env.CHANNEL_ID || '',
  
  // Database URL
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
};

// Validate required config
export function validateConfig(): void {
  if (!config.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required in .env file');
  }
  if (!config.ADMIN_GROUP_ID) {
    throw new Error('ADMIN_GROUP_ID is required in .env file');
  }
  if (!config.CHANNEL_ID) {
    throw new Error('CHANNEL_ID is required in .env file');
  }
}
