import { Composer, InlineKeyboard } from 'grammy';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { config } from '../config';
import type { MyContext } from '../bot';

const submitHandler = new Composer<MyContext>();

// Hash user ID for anonymity
function hashUserId(userId: number): string {
  return crypto.createHash('sha256').update(userId.toString()).digest('hex').substring(0, 16);
}

// Send message to admin group for review
async function sendToAdminGroup(ctx: MyContext, messageId: number, content: string | null, imageId: string | null) {
  const keyboard = new InlineKeyboard()
    .text('✅ Approve', `approve_${messageId}`)
    .text('❌ Reject', `reject_${messageId}`);

  const reviewText = `📬 *New Confession #${messageId}*\n\n${content || '(Image only)'}`;

  if (imageId) {
    // Send photo with caption to admin group
    await ctx.api.sendPhoto(config.ADMIN_GROUP_ID, imageId, {
      caption: reviewText,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else {
    // Send text message to admin group
    await ctx.api.sendMessage(config.ADMIN_GROUP_ID, reviewText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}

// Handle text messages
submitHandler.on('message:text', async (ctx) => {
  // Ignore commands
  if (ctx.message.text.startsWith('/')) return;

  const userId = ctx.from.id;
  const userHash = hashUserId(userId);
  const content = ctx.message.text;

  try {
    // Upsert user (create if not exists, update if exists)
    const user = await prisma.user.upsert({
      where: { userHash },
      update: { lastSubmissionAt: new Date() },
      create: {
        userHash,
        strikeCount: 0,
        isBanned: false,
        lastSubmissionAt: new Date(),
      },
    });

    // Check if user is permanently banned
    if (user.isBanned) {
      await ctx.reply('🚫 You have been permanently banned from using this bot due to multiple violations.');
      return;
    }

    // Check if user is temporarily blocked
    if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.blockedUntil).getTime() - Date.now()) / (1000 * 60 * 60));
      await ctx.reply(`⏳ You are temporarily blocked. Please try again in approximately ${remainingTime} hour${remainingTime > 1 ? 's' : ''}.\n\nYou have ${user.strikeCount} strikes. Please follow our rules and guidelines.`);
      return;
    }

    // Clear expired block if any
    if (user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
      await prisma.user.update({
        where: { userHash },
        data: { blockedUntil: null },
      });
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        userHash,
        senderId: userId.toString(),
        content,
        status: 'pending',
      },
    });

    // Console log the data
    console.log('='.repeat(50));
    console.log('📩 NEW SUBMISSION RECEIVED');
    console.log('='.repeat(50));
    console.log('User Hash:', userHash);
    console.log('Strike Count:', user.strikeCount);
    console.log('Is Banned:', user.isBanned);
    console.log('Last Submission:', user.lastSubmissionAt);
    console.log('Message ID:', message.id);
    console.log('Content:', content);
    console.log('Status:', message.status);
    console.log('Created At:', message.createdAt);
    console.log('='.repeat(50));

    // Send to admin group for review
    await sendToAdminGroup(ctx, message.id, content, null);

    await ctx.reply('✅ Your confession has been received and is pending review. Thank you for sharing! 💙');
  } catch (error) {
    console.error('Error processing submission:', error);
    await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
  }
});

// Handle photo messages
submitHandler.on('message:photo', async (ctx) => {
  const userId = ctx.from.id;
  const userHash = hashUserId(userId);
  const photo = ctx.message.photo;
  const caption = ctx.message.caption || '';
  
  // Get the largest photo (last in array)
  const largestPhoto = photo[photo.length - 1];

  try {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { userHash },
      update: { lastSubmissionAt: new Date() },
      create: {
        userHash,
        strikeCount: 0,
        isBanned: false,
        lastSubmissionAt: new Date(),
      },
    });

    // Check if user is permanently banned
    if (user.isBanned) {
      await ctx.reply('🚫 You have been permanently banned from using this bot due to multiple violations.');
      return;
    }

    // Check if user is temporarily blocked
    if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.blockedUntil).getTime() - Date.now()) / (1000 * 60 * 60));
      await ctx.reply(`⏳ You are temporarily blocked. Please try again in approximately ${remainingTime} hour${remainingTime > 1 ? 's' : ''}.\n\nYou have ${user.strikeCount} strikes. Please follow our rules and guidelines.`);
      return;
    }

    // Clear expired block if any
    if (user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
      await prisma.user.update({
        where: { userHash },
        data: { blockedUntil: null },
      });
    }

    // Create message record with image
    const message = await prisma.message.create({
      data: {
        userHash,
        senderId: userId.toString(),
        content: caption || null,
        imageId: largestPhoto.file_id,
        status: 'pending',
      },
    });

    // Console log the data
    console.log('='.repeat(50));
    console.log('🖼️ NEW IMAGE SUBMISSION RECEIVED');
    console.log('='.repeat(50));
    console.log('User Hash:', userHash);
    console.log('Strike Count:', user.strikeCount);
    console.log('Is Banned:', user.isBanned);
    console.log('Last Submission:', user.lastSubmissionAt);
    console.log('Message ID:', message.id);
    console.log('Image File ID:', largestPhoto.file_id);
    console.log('Caption:', caption || '(no caption)');
    console.log('Status:', message.status);
    console.log('Created At:', message.createdAt);
    console.log('='.repeat(50));

    // Send to admin group for review
    await sendToAdminGroup(ctx, message.id, caption || null, largestPhoto.file_id);

    await ctx.reply('✅ Your image confession has been received and is pending review. Thank you for sharing! 💙');
  } catch (error) {
    console.error('Error processing image submission:', error);
    await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
  }
});

export default submitHandler;
