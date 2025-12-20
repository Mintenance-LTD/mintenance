/**
 * Social Features Tables
 * 
 * This module contains all database types related to social features,
 * contractor posts, reviews, and community interactions.
 */

export type SocialTables = {
  contractor_posts: {
    Row: {
      id: string
      contractor_id: string
      type: 'project_showcase' | 'tip' | 'before_after' | 'milestone'
      content: string
      photos: string[] | null
      likes_count: number | null
      comments_count: number | null
      shares_count: number | null
      hashtags: string[] | null
      created_at: string
      updated_at: string
      is_featured: boolean | null
      visibility: 'public' | 'followers' | 'private'
    }
    Insert: {
      id?: string
      contractor_id: string
      type: 'project_showcase' | 'tip' | 'before_after' | 'milestone'
      content: string
      photos?: string[] | null
      likes_count?: number | null
      comments_count?: number | null
      shares_count?: number | null
      hashtags?: string[] | null
      created_at?: string
      updated_at?: string
      is_featured?: boolean | null
      visibility?: 'public' | 'followers' | 'private'
    }
    Update: {
      id?: string
      contractor_id?: string
      type?: 'project_showcase' | 'tip' | 'before_after' | 'milestone'
      content?: string
      photos?: string[] | null
      likes_count?: number | null
      comments_count?: number | null
      shares_count?: number | null
      hashtags?: string[] | null
      created_at?: string
      updated_at?: string
      is_featured?: boolean | null
      visibility?: 'public' | 'followers' | 'private'
    }
    Relationships: [
      {
        foreignKeyName: "contractor_posts_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_post_likes: {
    Row: {
      id: string
      post_id: string
      user_id: string
      created_at: string
    }
    Insert: {
      id?: string
      post_id: string
      user_id: string
      created_at?: string
    }
    Update: {
      id?: string
      post_id?: string
      user_id?: string
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "contractor_post_likes_post_id_fkey"
        columns: ["post_id"]
        isOneToOne: false
        referencedRelation: "contractor_posts"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_post_likes_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_post_comments: {
    Row: {
      id: string
      post_id: string
      user_id: string
      content: string
      created_at: string
      updated_at: string
      parent_comment_id: string | null
    }
    Insert: {
      id?: string
      post_id: string
      user_id: string
      content: string
      created_at?: string
      updated_at?: string
      parent_comment_id?: string | null
    }
    Update: {
      id?: string
      post_id?: string
      user_id?: string
      content?: string
      created_at?: string
      updated_at?: string
      parent_comment_id?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "contractor_post_comments_post_id_fkey"
        columns: ["post_id"]
        isOneToOne: false
        referencedRelation: "contractor_posts"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_post_comments_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_post_comments_parent_comment_id_fkey"
        columns: ["parent_comment_id"]
        isOneToOne: false
        referencedRelation: "contractor_post_comments"
        referencedColumns: ["id"]
      },
    ]
  }
  contractor_follows: {
    Row: {
      id: string
      follower_id: string
      following_id: string
      created_at: string
    }
    Insert: {
      id?: string
      follower_id: string
      following_id: string
      created_at?: string
    }
    Update: {
      id?: string
      follower_id?: string
      following_id?: string
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "contractor_follows_follower_id_fkey"
        columns: ["follower_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "contractor_follows_following_id_fkey"
        columns: ["following_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  reviews: {
    Row: {
      id: string
      job_id: string
      reviewer_id: string
      reviewed_id: string
      rating: number
      comment: string | null
      created_at: string
      updated_at: string
      is_verified: boolean | null
      helpful_count: number | null
    }
    Insert: {
      id?: string
      job_id: string
      reviewer_id: string
      reviewed_id: string
      rating: number
      comment?: string | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
      helpful_count?: number | null
    }
    Update: {
      id?: string
      job_id?: string
      reviewer_id?: string
      reviewed_id?: string
      rating?: number
      comment?: string | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
      helpful_count?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "reviews_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "reviews_reviewer_id_fkey"
        columns: ["reviewer_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "reviews_reviewed_id_fkey"
        columns: ["reviewed_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  homeowner_testimonials: {
    Row: {
      id: string
      homeowner_id: string
      contractor_id: string
      job_id: string | null
      testimonial_text: string
      rating: number
      is_featured: boolean | null
      created_at: string
      updated_at: string
      approved_at: string | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      contractor_id: string
      job_id?: string | null
      testimonial_text: string
      rating: number
      is_featured?: boolean | null
      created_at?: string
      updated_at?: string
      approved_at?: string | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      contractor_id?: string
      job_id?: string | null
      testimonial_text?: string
      rating?: number
      is_featured?: boolean | null
      created_at?: string
      updated_at?: string
      approved_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "homeowner_testimonials_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "homeowner_testimonials_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "homeowner_testimonials_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  community_recommendations: {
    Row: {
      id: string
      recommender_id: string
      recommended_id: string
      recommendation_type: 'contractor' | 'service' | 'area'
      recommendation_text: string
      rating: number | null
      created_at: string
      updated_at: string
      is_verified: boolean | null
    }
    Insert: {
      id?: string
      recommender_id: string
      recommended_id: string
      recommendation_type: 'contractor' | 'service' | 'area'
      recommendation_text: string
      rating?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
    }
    Update: {
      id?: string
      recommender_id?: string
      recommended_id?: string
      recommendation_type?: 'contractor' | 'service' | 'area'
      recommendation_text?: string
      rating?: number | null
      created_at?: string
      updated_at?: string
      is_verified?: boolean | null
    }
    Relationships: [
      {
        foreignKeyName: "community_recommendations_recommender_id_fkey"
        columns: ["recommender_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "community_recommendations_recommended_id_fkey"
        columns: ["recommended_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  success_stories: {
    Row: {
      id: string
      homeowner_id: string
      contractor_id: string
      job_id: string
      story_title: string
      story_content: string
      before_photos: string[] | null
      after_photos: string[] | null
      is_featured: boolean | null
      created_at: string
      updated_at: string
      published_at: string | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      contractor_id: string
      job_id: string
      story_title: string
      story_content: string
      before_photos?: string[] | null
      after_photos?: string[] | null
      is_featured?: boolean | null
      created_at?: string
      updated_at?: string
      published_at?: string | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      contractor_id?: string
      job_id?: string
      story_title?: string
      story_content?: string
      before_photos?: string[] | null
      after_photos?: string[] | null
      is_featured?: boolean | null
      created_at?: string
      updated_at?: string
      published_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "success_stories_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "success_stories_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "success_stories_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
}
