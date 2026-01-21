import { Composer } from 'grammy';
import prisma from '../db/prisma';
import { config } from '../config';
import type { MyContext } from '../bot';

const actionHandler = new Composer<MyContext>();

// Strike system messages
function getStrikeMessage(strikeCount: number): string {
  if (strikeCount >= 10) {
    return `🚫 *You have been permanently banned.*\n\nYou have received ${strikeCount} strikes due to multiple violations. You can no longer use this bot.`;
  } else if (strikeCount >= 5) {
    const hoursBlocked = strikeCount >= 7 ? 72 : (strikeCount >= 6 ? 48 : 24);
    return `⏳ *You have been temporarily blocked for ${hoursBlocked} hours.*\n\nYou have ${strikeCount} strikes. After ${10 - strikeCount} more rejected submissions, you will be permanently banned.\n\nPlease follow our rules and guidelines.`;
  } else if (strikeCount >= 3) {
    return `⚠️ *Warning: Your confession was not approved.*\n\nYou now have ${strikeCount} strikes. After 5 strikes, you will be temporarily blocked. After 10 strikes, you will be permanently banned.\n\nPlease follow our rules and guidelines.`;
  } else {
    return `😔 *Your confession was not approved.*\n\nThis may be due to content guidelines. You have ${strikeCount} strike${strikeCount > 1 ? 's' : ''}.\n\n📌 *Reminder:*\n• 5 strikes = Temporary block (24-72h)\n• 10 strikes = Permanent ban\n\nPlease follow our rules and guidelines.`;
  }
}

// Get temporary block duration based on strike count
function getBlockDuration(strikeCount: number): number {
  // Returns hours of block
  if (strikeCount >= 7) return 72;
  if (strikeCount >= 6) return 48;
  return 24;
}

// Handle approve action
actionHandler.callbackQuery(/^approve_(\d+)$/, async (ctx) => {
  const messageId = parseInt(ctx.match[1]);
  const moderator = ctx.from;
  const moderatorName = moderator.first_name + (moderator.last_name ? ` ${moderator.last_name}` : '');
  
  try {
    // Get the message from database
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      await ctx.answerCallbackQuery({ text: '❌ Message not found!' });
      return;
    }

    if (message.status !== 'pending') {
      await ctx.answerCallbackQuery({ text: `⚠️ Already ${message.status} by another moderator!` });
      return;
    }

    // Update message status to approved
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'approved' },
    });

    // Post to channel
    const channelText = `💬 *Anonymous Confession #${messageId}*\n\n${message.content || ''}`;
    
    if (message.imageId) {
      await ctx.api.sendPhoto(config.CHANNEL_ID, message.imageId, {
        caption: channelText,
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.api.sendMessage(config.CHANNEL_ID, channelText, {
        parse_mode: 'Markdown',
      });
    }

    // Notify the sender
    try {
      await ctx.api.sendMessage(
        message.senderId,
        '🎉 Great news! Your confession has been approved and posted to the channel. Thank you for sharing! 💙'
      );
    } catch (error) {
      console.log('Could not notify user (they may have blocked the bot)');
    }

    // Update admin group message to show it's been processed
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    
    const approvedCaption = `✅ APPROVED by ${moderatorName}\n\n${message.content || '(Image)'}`;
    
    if (message.imageId) {
      await ctx.editMessageCaption({
        caption: approvedCaption,
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.editMessageText(approvedCaption, {
        parse_mode: 'Markdown',
      });
    }

    await ctx.answerCallbackQuery({ text: '✅ Approved and posted!' });
    
    console.log(`✅ Message #${messageId} approved by ${moderatorName} and posted to channel`);
  } catch (error) {
    console.error('Error approving message:', error);
    await ctx.answerCallbackQuery({ text: '❌ Error processing approval!' });
  }
});

// Handle reject action
actionHandler.callbackQuery(/^reject_(\d+)$/, async (ctx) => {
  const messageId = parseInt(ctx.match[1]);
  const moderator = ctx.from;
  const moderatorName = moderator.first_name + (moderator.last_name ? ` ${moderator.last_name}` : '');
  
  try {
    // Get the message from database
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      await ctx.answerCallbackQuery({ text: '❌ Message not found!' });
      return;
    }

    if (message.status !== 'pending') {
      await ctx.answerCallbackQuery({ text: `⚠️ Already ${message.status} by another moderator!` });
      return;
    }

    // Update message status to rejected
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'rejected' },
    });

    // Increment strike count for the user
    const updatedUser = await prisma.user.update({
      where: { userHash: message.userHash },
      data: { 
        strikeCount: { increment: 1 } 
      },
    });

    const newStrikeCount = updatedUser.strikeCount;
    console.log(`⚠️ User ${message.userHash} strike count: ${newStrikeCount}`);

    // Handle strike consequences
    let statusText = `Strike ${newStrikeCount}/10`;
    
    if (newStrikeCount >= 10) {
      // Permanent ban
      await prisma.user.update({
        where: { userHash: message.userHash },
        data: { isBanned: true },
      });
      statusText = '🚫 BANNED';
      console.log(`🚫 User ${message.userHash} has been permanently banned (10 strikes)`);
    } else if (newStrikeCount >= 5) {
      // Temporary block
      const blockHours = getBlockDuration(newStrikeCount);
      const blockedUntil = new Date(Date.now() + blockHours * 60 * 60 * 1000);
      await prisma.user.update({
        where: { userHash: message.userHash },
        data: { blockedUntil },
      });
      statusText = `⏳ Blocked ${blockHours}h (Strike ${newStrikeCount}/10)`;
      console.log(`⏳ User ${message.userHash} temporarily blocked for ${blockHours}h`);
    }

    // Notify the sender with appropriate message
    try {
      const userMessage = getStrikeMessage(newStrikeCount);
      await ctx.api.sendMessage(message.senderId, userMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.log('Could not notify user (they may have blocked the bot)');
    }

    // Update admin group message to show it's been processed
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    
    const adminCaption = `❌ REJECTED by ${moderatorName} | ${statusText}\n\n${message.content || '(Image)'}`;
    
    if (message.imageId) {
      await ctx.editMessageCaption({
        caption: adminCaption,
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.editMessageText(adminCaption, {
        parse_mode: 'Markdown',
      });
    }

    await ctx.answerCallbackQuery({ text: `❌ Rejected! ${statusText}` });
    
    console.log(`❌ Message #${messageId} rejected by ${moderatorName}`);
  } catch (error) {
    console.error('Error rejecting message:', error);
    await ctx.answerCallbackQuery({ text: '❌ Error processing rejection!' });
  }
});

export default actionHandler;
