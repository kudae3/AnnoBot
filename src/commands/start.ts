import { Composer } from 'grammy';
import type { MyContext } from '../bot';

const startCommand = new Composer<MyContext>();

startCommand.command('start', async (ctx) => {
  const welcomeMessage = `
💭 *Welcome to AnonBot!*

This is a safe space where you can share your thoughts anonymously.

🔒 *Your identity is completely protected* - we only store a hashed version of your ID that cannot be traced back to you.

📝 *What you can share:*
• Relationship confessions
• Mental health experiences
• Personal stories
• Anything on your mind

✨ *How it works:*
1. Send me your message (text or image)
2. Your confession will be reviewed
3. If approved, it will be posted to our channel anonymously

⚠️ *Rules:*
• Be respectful
• No hate speech or harassment
• No illegal content
• No spam

Ready? Just type your confession and send it to me! 💬
  `;

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

startCommand.command('rules', async (ctx) => {
  const rulesMessage = `
📜 *Community Rules*

1️⃣ *Be Respectful* - Treat others with kindness
2️⃣ *No Hate Speech* - Discrimination is not tolerated
3️⃣ *No Harassment* - Don't target individuals
4️⃣ *No Illegal Content* - Keep it legal
5️⃣ *No Spam* - Quality over quantity
6️⃣ *No Personal Info* - Protect yourself and others

Breaking rules may result in strikes or bans.
  `;

  await ctx.reply(rulesMessage, { parse_mode: 'Markdown' });
});

export default startCommand;
