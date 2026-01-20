import { Composer } from 'grammy';
import prisma from '../db/prisma';
import { config } from '../config';
import type { MyContext } from '../bot';

const actionHandler = new Composer<MyContext>();

// Handle approve action
actionHandler.callbackQuery(/^approve_(\d+)$/, async (ctx) => {
  const messageId = parseInt(ctx.match[1]);
  
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
      await ctx.answerCallbackQuery({ text: `⚠️ Message already ${message.status}!` });
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
      console.log('Could not notify user (they may have blocked the bot):', error);
    }

    // Update admin message to show it's been processed
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.editMessageCaption({
      caption: `✅ APPROVED\n\n${message.content || '(Image)'}`,
      parse_mode: 'Markdown',
    }).catch(() => {
      // If it's a text message (no caption), edit the text instead
      ctx.editMessageText(`✅ APPROVED\n\n${message.content || ''}`, {
        parse_mode: 'Markdown',
      });
    });

    await ctx.answerCallbackQuery({ text: '✅ Approved and posted!' });
    
    console.log(`✅ Message #${messageId} approved and posted to channel`);
  } catch (error) {
    console.error('Error approving message:', error);
    await ctx.answerCallbackQuery({ text: '❌ Error processing approval!' });
  }
});

// Handle reject action
actionHandler.callbackQuery(/^reject_(\d+)$/, async (ctx) => {
  const messageId = parseInt(ctx.match[1]);
  
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
      await ctx.answerCallbackQuery({ text: `⚠️ Message already ${message.status}!` });
      return;
    }

    // Update message status to rejected
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'rejected' },
    });

    // Notify the sender
    try {
      await ctx.api.sendMessage(
        message.senderId,
        '😔 Unfortunately, your confession was not approved. This could be due to content guidelines. Feel free to try again with a different message.'
      );
    } catch (error) {
      console.log('Could not notify user (they may have blocked the bot):', error);
    }

    // Update admin message to show it's been processed
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.editMessageCaption({
      caption: `❌ REJECTED\n\n${message.content || '(Image)'}`,
      parse_mode: 'Markdown',
    }).catch(() => {
      // If it's a text message (no caption), edit the text instead
      ctx.editMessageText(`❌ REJECTED\n\n${message.content || ''}`, {
        parse_mode: 'Markdown',
      });
    });

    await ctx.answerCallbackQuery({ text: '❌ Rejected!' });
    
    console.log(`❌ Message #${messageId} rejected`);
  } catch (error) {
    console.error('Error rejecting message:', error);
    await ctx.answerCallbackQuery({ text: '❌ Error processing rejection!' });
  }
});

export default actionHandler;
