import { supabase } from '../config/supabase';
import { ContractorPost, ContractorPostComment } from '../types';
import { logger } from '../utils/logger';

export class ModerationService {
  // Flag content for review
  static async flagPost(
    postId: string,
    reportedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_posts')
        .update({
          is_flagged: true,
          flagged_reason: reason,
        })
        .eq('id', postId);

      if (error) throw error;

      // Log the report
      await this.logModerationAction(
        'post_flagged',
        postId,
        reportedBy,
        reason
      );
    } catch (error) {
      logger.error('Error flagging post:', error);
      throw error;
    }
  }

  static async flagComment(
    commentId: string,
    reportedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_post_comments')
        .update({
          is_flagged: true,
        })
        .eq('id', commentId);

      if (error) throw error;

      // Log the report
      await this.logModerationAction(
        'comment_flagged',
        commentId,
        reportedBy,
        reason
      );
    } catch (error) {
      logger.error('Error flagging comment:', error);
      throw error;
    }
  }

  // Get flagged content for moderation
  static async getFlaggedPosts(): Promise<ContractorPost[]> {
    try {
      const { data: posts, error } = await supabase
        .from('contractor_posts')
        .select(
          `
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('is_flagged', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (
        posts?.map((post: any) => ({
          id: post.id,
          contractorId: post.contractor_id,
          postType: post.post_type,
          title: post.title,
          content: post.content,
          images: post.images || [],
          skillsUsed: post.skills_used,
          materialsUsed: post.materials_used,
          projectDuration: post.project_duration,
          projectCost: post.project_cost,
          helpCategory: post.help_category,
          locationNeeded: post.location_needed,
          urgencyLevel: post.urgency_level,
          budgetRange: post.budget_range,
          itemName: post.item_name,
          itemCondition: post.item_condition,
          rentalPrice: post.rental_price,
          availableFrom: post.available_from,
          availableUntil: post.available_until,
          likesCount: post.likes_count || 0,
          commentsCount: post.comments_count || 0,
          sharesCount: post.shares_count || 0,
          viewsCount: post.views_count || 0,
          isActive: post.is_active,
          isFlagged: post.is_flagged,
          flaggedReason: post.flagged_reason,
          latitude: post.latitude,
          longitude: post.longitude,
          locationRadius: post.location_radius,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          contractor: post.contractor
            ? {
                id: post.contractor.id,
                firstName: post.contractor.first_name,
                lastName: post.contractor.last_name,
                email: post.contractor.email,
                role: 'contractor' as const,
                createdAt: '',
              }
            : undefined,
        })) || []
      );
    } catch (error) {
      logger.error('Error fetching flagged posts:', error);
      throw error;
    }
  }

  // Moderation actions
  static async approvePost(postId: string, moderatorId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_posts')
        .update({
          is_flagged: false,
          flagged_reason: null,
          moderated_at: new Date().toISOString(),
          moderated_by: moderatorId,
        })
        .eq('id', postId);

      if (error) throw error;

      await this.logModerationAction('post_approved', postId, moderatorId);
    } catch (error) {
      logger.error('Error approving post:', error);
      throw error;
    }
  }

  static async removePost(
    postId: string,
    moderatorId: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_posts')
        .update({
          is_active: false,
          moderated_at: new Date().toISOString(),
          moderated_by: moderatorId,
          flagged_reason: reason,
        })
        .eq('id', postId);

      if (error) throw error;

      await this.logModerationAction(
        'post_removed',
        postId,
        moderatorId,
        reason
      );
    } catch (error) {
      logger.error('Error removing post:', error);
      throw error;
    }
  }

  // Automated content filtering
  static async checkContentForViolations(content: string): Promise<{
    isViolation: boolean;
    reasons: string[];
  }> {
    // Simple keyword-based filtering
    const blockedWords = [
      'spam',
      'scam',
      'fake',
      'illegal',
      'drugs',
      'weapons',
      'discriminatory',
      'harassment',
      'threatening',
    ];

    const violations: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for blocked words
    blockedWords.forEach((word) => {
      if (lowerContent.includes(word)) {
        violations.push(`Contains blocked word: ${word}`);
      }
    });

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      violations.push('Excessive use of capital letters');
    }

    // Check for spam patterns
    if (/(.)\1{4,}/.test(content)) {
      violations.push('Repetitive character patterns detected');
    }

    // Check for external links (simple detection)
    if (
      /https?:\/\//.test(content) &&
      !/supabase\.co|expo\.dev/.test(content)
    ) {
      violations.push('Contains external links');
    }

    return {
      isViolation: violations.length > 0,
      reasons: violations,
    };
  }

  // Auto-moderate content on creation
  static async autoModeratePost(post: Partial<ContractorPost>): Promise<{
    approved: boolean;
    reason?: string;
  }> {
    const fullContent = `${(post as any).title || ''} ${post.content || ''}`;
    const check = await this.checkContentForViolations(fullContent);

    if (check.isViolation) {
      return {
        approved: false,
        reason: check.reasons.join(', '),
      };
    }

    return { approved: true };
  }

  // Logging system
  private static async logModerationAction(
    action: string,
    contentId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    try {
      // This would typically go to a separate moderation_logs table
      // For now, we'll just log to console in development
      console.log('Moderation Action:', {
        action,
        contentId,
        userId,
        reason,
        timestamp: new Date().toISOString(),
      });

      // In production, you'd want:
      // await supabase.from('moderation_logs').insert({
      //   action,
      //   content_id: contentId,
      //   user_id: userId,
      //   reason,
      //   created_at: new Date().toISOString()
      // });
    } catch (error) {
      logger.error('Error logging moderation action:', error);
    }
  }

  // Community reporting
  static async submitReport(
    contentType: 'post' | 'comment',
    contentId: string,
    reportedBy: string,
    reason:
      | 'spam'
      | 'inappropriate'
      | 'harassment'
      | 'misinformation'
      | 'other',
    details?: string
  ): Promise<void> {
    try {
      if (contentType === 'post') {
        await this.flagPost(
          contentId,
          reportedBy,
          `${reason}: ${details || ''}`
        );
      } else {
        await this.flagComment(
          contentId,
          reportedBy,
          `${reason}: ${details || ''}`
        );
      }
    } catch (error) {
      logger.error('Error submitting report:', error);
      throw error;
    }
  }

  // Get moderation stats
  static async getModerationStats(): Promise<{
    totalPosts: number;
    activePosts: number;
    flaggedPosts: number;
    removedPosts: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('contractor_posts')
        .select('is_active, is_flagged');

      if (error) throw error;

      const stats = data?.reduce(
        (
          acc: {
            totalPosts: number;
            activePosts: number;
            flaggedPosts: number;
            removedPosts: number;
          },
          post: any
        ) => {
          acc.totalPosts++;
          if (post.is_active) acc.activePosts++;
          if (post.is_flagged) acc.flaggedPosts++;
          if (!post.is_active) acc.removedPosts++;
          return acc;
        },
        {
          totalPosts: 0,
          activePosts: 0,
          flaggedPosts: 0,
          removedPosts: 0,
        }
      ) || {
        totalPosts: 0,
        activePosts: 0,
        flaggedPosts: 0,
        removedPosts: 0,
      };

      return stats;
    } catch (error) {
      logger.error('Error fetching moderation stats:', error);
      throw error;
    }
  }
}
