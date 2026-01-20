import { Bot, Context } from 'grammy';
import { config, validateConfig } from './config';
import startCommand from './commands/start';
import submitHandler from './handlers/submit';

// Define custom context type
export type MyContext = Context;

// Validate configuration
validateConfig();

// Create bot instance
const bot = new Bot<MyContext>(config.BOT_TOKEN);

// Register commands
bot.use(startCommand);

// Register handlers
bot.use(submitHandler);

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start the bot
console.log('🤖 Starting AnonBot...');
bot.start({
  onStart: () => {
    console.log('✅ Bot is running!');
    console.log('📝 Waiting for confessions...');
  },
});
