'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge.unified';
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal } from 'lucide-react';
import { User } from '@mintenance/types';

export interface ContractorPost {
    id: string;
    contractorId: string;
    type: 'project_showcase' | 'question' | 'tip' | 'news';
    content: string;
    photos: string[];
    likes: number;
    comments: number;
    createdAt: string;
    contractor?: {
        first_name: string;
        last_name: string;
        profile_image_url?: string;
    };
    isLikedByUser?: boolean;
}

interface ContractorFeedProps {
    currentUserId: string;
}

export function ContractorFeed({ currentUserId }: ContractorFeedProps) {
    const [posts, setPosts] = useState<ContractorPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('contractor_posts')
                .select(`
          *,
          contractor:contractor_id (
            first_name, last_name, profile_image_url
          )
        `)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data) {
                // Check likes for current user
                const { data: userLikes } = await supabase
                    .from('contractor_post_likes')
                    .select('post_id')
                    .eq('contractor_id', currentUserId);

                const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);

                const mappedPosts: ContractorPost[] = data.map((p: any) => ({
                    id: p.id,
                    contractorId: p.contractor_id,
                    type: p.post_type,
                    content: p.content,
                    photos: p.images || [],
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0,
                    createdAt: p.created_at,
                    contractor: p.contractor,
                    isLikedByUser: likedPostIds.has(p.id)
                }));

                setPosts(mappedPosts);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId: string, isLiked: boolean) => {
        // Optimistic update
        setPosts(posts.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    likes: isLiked ? p.likes - 1 : p.likes + 1,
                    isLikedByUser: !isLiked
                };
            }
            return p;
        }));

        try {
            if (isLiked) {
                await supabase
                    .from('contractor_post_likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('contractor_id', currentUserId);
            } else {
                await supabase
                    .from('contractor_post_likes')
                    .insert({
                        post_id: postId,
                        contractor_id: currentUserId
                    });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error would go here
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: theme.spacing[8] }}>Loading feed...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {posts.map(post => (
                <PostCard key={post.id} post={post} onLike={() => handleLike(post.id, post.isLikedByUser || false)} />
            ))}
            {posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
                    No posts yet. Be the first to share!
                </div>
            )}
        </div>
    );
}

function PostCard({ post, onLike }: { post: ContractorPost, onLike: () => void }) {
    const contractorName = post.contractor
        ? `${post.contractor.first_name} ${post.contractor.last_name}`
        : 'Unknown Contractor';

    return (
        <Card>
            <CardHeader className="pb-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: theme.spacing[3] }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: theme.colors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                        }}>
                            {contractorName.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{contractorName}</div>
                            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                                {new Date(post.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <Badge variant="neutral">{post.type.replace('_', ' ')}</Badge>
                </div>
            </CardHeader>

            <CardContent>
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: theme.spacing[4] }}>{post.content}</p>

                {post.photos.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: post.photos.length > 1 ? '1fr 1fr' : '1fr',
                        gap: theme.spacing[2],
                        marginBottom: theme.spacing[4]
                    }}>
                        {post.photos.map((photo, index) => (
                            <img
                                key={index}
                                src={photo}
                                alt={`Post attachment ${index + 1}`}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    borderRadius: theme.borderRadius.md
                                }}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            <CardFooter className="border-t pt-3 border-gray-200">
                <div style={{ display: 'flex', gap: theme.spacing[4], width: '100%' }}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLike}
                        style={{ color: post.isLikedByUser ? theme.colors.primary : 'inherit' }}
                    >
                        <ThumbsUp size={16} style={{ marginRight: theme.spacing[2] }} />
                        {post.likes} Likes
                    </Button>
                    <Button variant="ghost" size="sm">
                        <MessageSquare size={16} style={{ marginRight: theme.spacing[2] }} />
                        {post.comments} Comments
                    </Button>
                    <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }}>
                        <Share2 size={16} />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
