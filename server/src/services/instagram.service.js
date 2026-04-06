const axios = require('axios');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

const GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * Instagram Graph API wrapper
 */
class InstagramService {
  constructor(accessToken = env.IG_ACCESS_TOKEN) {
    this.token = accessToken;
    this.api = axios.create({
      baseURL: GRAPH_API,
      params: { access_token: this.token },
      timeout: 15000,
    });
  }

  /**
   * Reply to a comment on a media
   */
  async replyToComment(commentId, message) {
    try {
      const res = await this.api.post(`/${commentId}/replies`, {
        message,
      });
      logger.info('Comment reply sent', { commentId, messageId: res.data.id });
      return res.data;
    } catch (err) {
      logger.error('Failed to reply to comment', {
        commentId,
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * Send a DM with optional quick reply buttons
   */
  async sendDM(recipientId, message, quickReplies = []) {
    const payload = {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: {
        text: message,
        ...(quickReplies.length > 0 && { quick_replies: quickReplies }),
      },
    };

    try {
      const res = await this.api.post('/me/messages', payload);
      logger.info('DM sent', { recipientId, messageId: res.data.message_id });
      return res.data;
    } catch (err) {
      logger.error('Failed to send DM', {
        recipientId,
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * Send typing indicator before a DM
   */
  async sendTypingOn(recipientId) {
    try {
      await this.api.post('/me/messages', {
        recipient: { id: recipientId },
        sender_action: 'typing_on',
      });
    } catch (err) {
      // Non-critical, log and continue
      logger.debug('Typing indicator failed', { recipientId });
    }
  }

  /**
   * Get user profile (including follow status)
   */
  async getUserProfile(igScopedUserId) {
    try {
      const res = await this.api.get(`/${igScopedUserId}`, {
        params: {
          fields: 'name,username,is_user_follow_business,is_business_follow_user',
          access_token: this.token,
        },
      });
      return res.data;
    } catch (err) {
      logger.error('Failed to get user profile', {
        igScopedUserId,
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * Get media details by ID
   */
  async getMedia(mediaId) {
    try {
      const res = await this.api.get(`/${mediaId}`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink',
          access_token: this.token,
        },
      });
      return res.data;
    } catch (err) {
      logger.error('Failed to get media', {
        mediaId,
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * List recent media from the business account
   */
  async listMedia(limit = 25) {
    try {
      const res = await this.api.get(`/${env.IG_BUSINESS_ACCOUNT_ID}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
          limit,
          access_token: this.token,
        },
      });
      return res.data.data || [];
    } catch (err) {
      logger.error('Failed to list media', { error: err.response?.data || err.message });
      throw err;
    }
  }
}

module.exports = { InstagramService, instagramService: new InstagramService() };
