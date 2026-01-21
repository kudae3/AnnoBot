// Bad words filter - Add banned words here
// These words will be auto-rejected and user will be asked to rewrite

const bannedWords: string[] = [
  // Add your banned words here (lowercase)
  // English examples
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  
  // Burmese examples (add as needed)
  // 'banned_word_1',
  // 'banned_word_2',
  
  // Add more words as needed...
];

// Phrases that are banned (for multi-word detection)
const bannedPhrases: string[] = [
  // Add banned phrases here
  // 'banned phrase 1',
  // 'banned phrase 2',
];

/**
 * Check if content contains any banned words or phrases
 * @param content - The message content to check
 * @returns Object with result and matched word/phrase if found
 */
export function checkBannedContent(content: string): { 
  isBanned: boolean; 
  matchedWord?: string;
} {
  const lowerContent = content.toLowerCase();
  
  // Check for banned words
  for (const word of bannedWords) {
    // Use word boundary to match whole words only
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (regex.test(lowerContent)) {
      return { isBanned: true, matchedWord: word };
    }
  }
  
  // Check for banned phrases
  for (const phrase of bannedPhrases) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      return { isBanned: true, matchedWord: phrase };
    }
  }
  
  return { isBanned: false };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the rejection message for banned content
 */
export function getBannedContentMessage(): string {
  return `⚠️ *Your message contains inappropriate language.*

Please rewrite your confession without using offensive words or phrases.

Your message was NOT sent to the admins.

📝 *Tips:*
• Express your feelings respectfully
• Avoid profanity and slurs
• Be mindful of others

Please try again with appropriate language.`;
}
