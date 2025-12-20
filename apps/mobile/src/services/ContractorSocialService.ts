import { supabase } from '../config/supabase';
import {
  ContractorPost,
  ContractorPostComment,
  ContractorPostType,
  ContractorFollow,
  ContractorEndorsement,
  LocationData,
} from '../types';
import { logger } from '../utils/logger';

export class ContractorSocialService {
  // ===== POSTS =====

  static async getFeedPosts(
    contractorId: string,
    location?: LocationData,
    postType?: ContractorPostType,
    limit: number = 20
  ): Promise<ContractorPost[]> {
    try {
      let query = supabase
        .from('contractor_posts')
        .select(
          `
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            rating,
            total_jobs_completed
          ),
          contractor_post_likes!inner (
            contractor_id
          )
        `
        )
        .eq('is_active', true)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postType) {
        query = query.eq('post_type', postType);
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      // Check which posts are liked by current user
      const { data: userLikes } = await supabase
        .from('contractor_post_likes')
        .select('post_id')
        .eq('contractor_id', contractorId);

      const likedPostIds = new Set(
        userLikes?.map((like: any) => like.post_id) || []
      );

      return (
        posts?.map((post: any) =>
          this.mapToContractorPost(post, likedPostIds.has(post.id))
        ) || []
      );
    } catch (error) {
      logger.error('Error fetching feed posts:', error);
      throw error;
    }
  }

  static async getPostsByContractor(
    contractorId: string
  ): Promise<ContractorPost[]> {
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
            profile_image_url,
            rating
          )
        `
        )
        .eq('contractor_id', contractorId)
        .eq('is_active', true)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        posts?.map((post: any) => this.mapToContractorPost(post, false)) || []
      );
    } catch (error) {
      logger.error('Error fetching contractor posts:', error);
      throw error;
    }
  }

  static async createPost(
    post: Partial<ContractorPost>
  ): Promise<ContractorPost> {
    try {
      const p: any = post as any;

      // Prepare the insert data with proper field mapping
      const insertData: any = {
        contractor_id: p.contractorId,
        post_type: p.type || p.postType || 'project_showcase',
        content: p.content,
        images: p.photos || p.images || [],
        hashtags: p.hashtags || [],
        is_active: true,
        is_flagged: false,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
      };

      // Add optional fields if they exist
      if (p.title) insertData.title = p.title;
      if (p.jobId) insertData.job_id = p.jobId;
      if (p.skillsUsed) insertData.skills_used = p.skillsUsed;
      if (p.materialsUsed) insertData.materials_used = p.materialsUsed;
      if (p.projectDuration) insertData.project_duration = p.projectDuration;
      if (p.projectCost) insertData.project_cost = p.projectCost;
      if (p.helpCategory) insertData.help_category = p.helpCategory;
      if (p.locationNeeded) insertData.location_needed = p.locationNeeded;
      if (p.urgencyLevel) insertData.urgency_level = p.urgencyLevel;
      if (p.budgetRange) insertData.budget_range = p.budgetRange;
      if (p.itemName) insertData.item_name = p.itemName;
      if (p.itemCondition) insertData.item_condition = p.itemCondition;
      if (p.rentalPrice) insertData.rental_price = p.rentalPrice;
      if (p.availableFrom) insertData.available_from = p.availableFrom;
      if (p.availableUntil) insertData.available_until = p.availableUntil;
      if (p.latitude) insertData.latitude = p.latitude;
      if (p.longitude) insertData.longitude = p.longitude;
      if (p.locationRadius) insertData.location_radius = p.locationRadius;

      const { data, error } = await supabase
        .from('contractor_posts')
        .insert(insertData)
        .select(`
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            rating,
            total_jobs_completed
          )
        `)
        .single();

      if (error) {
        logger.error('Database error creating post:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      return this.mapToContractorPost(data, false);
    } catch (error) {
      logger.error('Error creating post:', error);
      throw error;
    }
  }

  static async updatePost(
    postId: string,
    updates: Partial<ContractorPost>
  ): Promise<ContractorPost> {
    try {
      const u: any = updates as any;
      const { data, error } = await supabase
        .from('contractor_posts')
        .update({
          title: u.title,
          content: u.content,
          images: u.images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToContractorPost(data, false);
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    }
  }

  static async deletePost(postId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    }
  }

  // ===== LIKES =====

  static async toggleLike(
    postId: string,
    contractorId: string
  ): Promise<boolean> {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('contractor_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('contractor_id', contractorId)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('contractor_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('contractor_id', contractorId);

        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await supabase.from('contractor_post_likes').insert({
          post_id: postId,
          contractor_id: contractorId,
        });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
      throw error;
    }
  }

  // ===== COMMENTS =====

  static async getPostComments(
    postId: string
  ): Promise<ContractorPostComment[]> {
    try {
      const { data: comments, error } = await supabase
        .from('contractor_post_comments')
        .select(
          `
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            rating
          )
        `
        )
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (
        comments?.map((comment: any) =>
          this.mapToContractorPostComment(comment)
        ) || []
      );
    } catch (error) {
      logger.error('Error fetching comments:', error);
      throw error;
    }
  }

  static async createComment(
    postId: string,
    contractorId: string,
    commentText: string,
    parentCommentId?: string
  ): Promise<ContractorPostComment> {
    try {
      const { data, error } = await supabase
        .from('contractor_post_comments')
        .insert({
          post_id: postId,
          contractor_id: contractorId,
          comment_text: commentText,
          parent_comment_id: parentCommentId,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToContractorPostComment(data);
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }

  static async markCommentAsSolution(
    commentId: string,
    verifiedBy: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_post_comments')
        .update({
          is_solution: true,
          solution_verified_by: verifiedBy,
        })
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error marking solution:', error);
      throw error;
    }
  }

  // ===== FOLLOWS =====

  static async followContractor(
    followerId: string,
    followingId: string
  ): Promise<ContractorFollow> {
    try {
      const { data, error } = await supabase
        .from('contractor_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        followerId: data.follower_id,
        followingId: data.following_id,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.error('Error following contractor:', error);
      throw error;
    }
  }

  static async unfollowContractor(
    followerId: string,
    followingId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contractor_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error unfollowing contractor:', error);
      throw error;
    }
  }

  static async getFollowing(contractorId: string): Promise<ContractorFollow[]> {
    try {
      const { data: follows, error } = await supabase
        .from('contractor_follows')
        .select('*')
        .eq('follower_id', contractorId);

      if (error) throw error;

      return (
        follows?.map((follow: any) => ({
          id: follow.id,
          followerId: follow.follower_id,
          followingId: follow.following_id,
          createdAt: follow.created_at,
        })) || []
      );
    } catch (error) {
      logger.error('Error fetching following:', error);
      throw error;
    }
  }

  // ===== ENDORSEMENTS =====

  static async endorseSkill(
    contractorId: string,
    endorserId: string,
    skillName: string,
    note?: string
  ): Promise<ContractorEndorsement> {
    try {
      const { data, error } = await supabase
        .from('contractor_expertise_endorsements')
        .insert({
          contractor_id: contractorId,
          endorser_id: endorserId,
          skill_name: skillName,
          endorsement_note: note,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        contractorId: data.contractor_id,
        endorserId: data.endorser_id,
        skillName: data.skill_name,
        endorsementNote: data.endorsement_note,
        createdAt: data.created_at,
      } as any as ContractorEndorsement;
    } catch (error) {
      logger.error('Error creating endorsement:', error);
      throw error;
    }
  }

  static async getContractorEndorsements(
    contractorId: string
  ): Promise<ContractorEndorsement[]> {
    try {
      const { data: endorsements, error } = await supabase
        .from('contractor_expertise_endorsements')
        .select(
          `
          *,
          endorser:endorser_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `
        )
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        endorsements?.map(
          (endorsement: any) =>
            ({
              id: endorsement.id,
              contractorId: endorsement.contractor_id,
              endorserId: endorsement.endorser_id,
              skillName: endorsement.skill_name,
              endorsementNote: endorsement.endorsement_note,
              createdAt: endorsement.created_at,
              endorser: endorsement.endorser
                ? {
                    id: endorsement.endorser.id,
                    firstName: endorsement.endorser.first_name,
                    lastName: endorsement.endorser.last_name,
                    profileImageUrl: endorsement.endorser.profile_image_url,
                    email: '',
                    role: 'contractor' as const,
                    createdAt: '',
                  }
                : undefined,
            }) as any
        ) || []
      );
    } catch (error) {
      logger.error('Error fetching endorsements:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  private static mapToContractorPost(
    data: any,
    isLikedByUser: boolean
  ): ContractorPost {
    return {
      id: data.id,
      contractorId: data.contractor_id,
      type: data.post_type,
      content: data.content,
      photos: data.images || [],
      likes: data.likes_count || 0,
      comments: data.comments_count || 0,
      shares: data.shares_count || 0,
      hashtags: data.hashtags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Extended fields for compatibility
      title: data.title,
      jobId: data.job_id,
      skillsUsed: data.skills_used,
      materialsUsed: data.materials_used,
      projectDuration: data.project_duration,
      projectCost: data.project_cost,
      helpCategory: data.help_category,
      locationNeeded: data.location_needed,
      urgencyLevel: data.urgency_level,
      budgetRange: data.budget_range,
      itemName: data.item_name,
      itemCondition: data.item_condition,
      rentalPrice: data.rental_price,
      availableFrom: data.available_from,
      availableUntil: data.available_until,
      viewsCount: data.views_count || 0,
      isActive: data.is_active,
      isFlagged: data.is_flagged,
      flaggedReason: data.flagged_reason,
      latitude: data.latitude,
      longitude: data.longitude,
      locationRadius: data.location_radius,
      isLikedByUser,
      contractor: data.contractor
        ? {
            id: data.contractor.id,
            firstName: data.contractor.first_name,
            lastName: data.contractor.last_name,
            profileImageUrl: data.contractor.profile_image_url,
            rating: data.contractor.rating,
            totalJobsCompleted: data.contractor.total_jobs_completed,
            email: '',
            role: 'contractor' as const,
            createdAt: '',
          }
        : undefined,
    } as any as ContractorPost;
  }

  private static mapToContractorPostComment(data: any): ContractorPostComment {
    return {
      id: data.id,
      postId: data.post_id,
      contractorId: data.contractor_id,
      commentText: data.comment_text,
      parentCommentId: data.parent_comment_id,
      isSolution: data.is_solution,
      solutionVerifiedBy: data.solution_verified_by,
      likesCount: data.likes_count || 0,
      isFlagged: data.is_flagged,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      contractor: data.contractor
        ? {
            id: data.contractor.id,
            firstName: data.contractor.first_name,
            lastName: data.contractor.last_name,
            profileImageUrl: data.contractor.profile_image_url,
            rating: data.contractor.rating,
            email: '',
            role: 'contractor' as const,
            createdAt: '',
          }
        : undefined,
    } as any as ContractorPostComment;
  }
}
