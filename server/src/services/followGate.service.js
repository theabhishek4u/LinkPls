const { instagramService } = require('./instagram.service');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Follow-Gate verification engine
 * Checks if a user follows the business and routes to success/error paths
 */
class FollowGateService {
  /**
   * Verify follow status and send appropriate DM template
   */
  async verifyAndRespond(interactionId, igUserId, campaign) {
    try {
      // 1. Check follow status via Instagram API
      const profile = await instagramService.getUserProfile(igUserId);
      const isFollowing = profile.is_user_follow_business === true;

      logger.info('Follow check result', {
        igUserId,
        username: profile.username,
        isFollowing,
        interactionId,
      });

      // 2. Update interaction record
      const now = new Date().toISOString();

      if (isFollowing) {
        // Send resource template
        const resourceTemplate = campaign.resource_template;
        const resourceText = resourceTemplate.text || 'Here is your resource!';

        // Find the media mapping to get the resource URL
        const { data: interaction } = await supabase
          .from('interactions')
          .select('media_mapping_id')
          .eq('id', interactionId)
          .single();

        let resourceUrl = '';
        if (interaction?.media_mapping_id) {
          const { data: mapping } = await supabase
            .from('media_mappings')
            .select('resource_url, resource_label')
            .eq('id', interaction.media_mapping_id)
            .single();
          resourceUrl = mapping?.resource_url || '';
        }

        const finalMessage = resourceUrl
          ? `${resourceText}\n\n🔗 ${resourceUrl}`
          : resourceText;

        await instagramService.sendTypingOn(igUserId);
        await new Promise((r) => setTimeout(r, 1500));
        await instagramService.sendDM(igUserId, finalMessage);

        await supabase
          .from('interactions')
          .update({
            status: 'follow_verified',
            follow_checked_at: now,
            resource_sent_at: now,
          })
          .eq('id', interactionId);

        return { success: true, isFollowing: true };
      } else {
        // Send error template (not following)
        const errorTemplate = campaign.error_template;
        const errorText = errorTemplate.text || "You're not following me yet!";
        const errorButtons = errorTemplate.buttons || [];

        await instagramService.sendTypingOn(igUserId);
        await new Promise((r) => setTimeout(r, 1500));
        await instagramService.sendDM(igUserId, errorText, errorButtons);

        await supabase
          .from('interactions')
          .update({
            status: 'follow_failed',
            follow_checked_at: now,
          })
          .eq('id', interactionId);

        return { success: true, isFollowing: false };
      }
    } catch (err) {
      logger.error('Follow gate verification failed', {
        interactionId,
        igUserId,
        error: err.message,
      });

      await supabase
        .from('interactions')
        .update({ status: 'error', error_message: err.message })
        .eq('id', interactionId);

      throw err;
    }
  }

  /**
   * Re-verify: check if a previously verified user has unfollowed
   */
  async reVerify(interactionId, igUserId) {
    try {
      const profile = await instagramService.getUserProfile(igUserId);

      if (!profile.is_user_follow_business) {
        await supabase
          .from('interactions')
          .update({ status: 'revoked', follow_checked_at: new Date().toISOString() })
          .eq('id', interactionId);

        logger.info('Access revoked — user unfollowed', { igUserId, interactionId });
        return { revoked: true };
      }

      return { revoked: false };
    } catch (err) {
      logger.error('Re-verification failed', { interactionId, error: err.message });
      throw err;
    }
  }
}

module.exports = { followGateService: new FollowGateService() };
