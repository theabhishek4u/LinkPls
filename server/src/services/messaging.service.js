const { pickRandom } = require('../utils/humanize');

/**
 * Message template builder for comment replies and DMs
 */
class MessagingService {
  /**
   * Default comment reply variations if none configured
   */
  static DEFAULT_REPLIES = [
    "Check your DM! 📩",
    "Sent! Check your inbox 🚀",
    "Just sent it to you! 💜",
    "It's in your DMs! Go check ✨",
    "Heading to your DMs right now! 🎉",
  ];

  /**
   * Pick a random comment reply from campaign config or defaults
   */
  getCommentReply(campaign) {
    const replies = campaign.comment_replies && campaign.comment_replies.length > 0
      ? campaign.comment_replies
      : MessagingService.DEFAULT_REPLIES;
    return pickRandom(replies);
  }

  /**
   * Build the welcome DM payload
   */
  buildWelcomeDM(campaign) {
    return {
      text: campaign.welcome_dm_text ||
        "Hey there! I'm so happy you're here, thanks so much for your interest 😊",
      quickReplies: campaign.welcome_dm_buttons || [
        { content_type: 'text', title: 'Give me access', payload: 'FOLLOW_CHECK' },
        { content_type: 'text', title: "I'm following ✅", payload: 'FOLLOW_CHECK' },
      ],
    };
  }

  /**
   * Build the resource success DM payload
   */
  buildResourceDM(campaign, resourceUrl) {
    const template = campaign.resource_template || {};
    const text = template.text || "You're amazing! 🎉 Here's your exclusive access:";
    return {
      text: resourceUrl ? `${text}\n\n🔗 ${resourceUrl}` : text,
    };
  }

  /**
   * Build the "not following" error DM payload
   */
  buildErrorDM(campaign) {
    const template = campaign.error_template || {};
    return {
      text: template.text ||
        "Oh no! It seems you're not following me 👀... Visit my profile and hit follow, then tap the button again!",
      quickReplies: template.buttons || [
        { content_type: 'text', title: "I'm following ✅", payload: 'FOLLOW_CHECK' },
      ],
    };
  }
}

module.exports = { messagingService: new MessagingService() };
