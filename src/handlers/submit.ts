import { Composer } from 'grammy';
import crypto from 'crypto';
import prisma from '../db/prisma';
import type { MyContext } from '../bot';

const submitHandler = new Composer<MyContext>();

// Hash user ID for anonymity
function hashUserId(userId: number): string {
  return crypto.createHash('sha256').update(userId.toString()).digest('hex').substring(0, 16);
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

    // Check if user is banned
    if (user.isBanned) {
      await ctx.reply('❌ You have been banned from using this bot.');
      return;
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        userHash,
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

    // Check if user is banned
    if (user.isBanned) {
      await ctx.reply('❌ You have been banned from using this bot.');
      return;
    }

    // Create message record with image
    const message = await prisma.message.create({
      data: {
        userHash,
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

    await ctx.reply('✅ Your image confession has been received and is pending review. Thank you for sharing! 💙');
  } catch (error) {
    console.error('Error processing image submission:', error);
    await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
  }
});

export default submitHandler;
