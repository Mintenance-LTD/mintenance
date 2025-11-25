'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Card, CardContent } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Image as ImageIcon, Send } from 'lucide-react';

interface CreatePostProps {
    currentUserId: string;
    onPostCreated: () => void;
}

export function CreatePost({ currentUserId, onPostCreated }: CreatePostProps) {
    const [content, setContent] = useState('');
    const [postType, setPostType] = useState<'project_showcase' | 'question' | 'tip' | 'news'>('project_showcase');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('contractor_posts')
                .insert({
                    contractor_id: currentUserId,
                    content: content,
                    post_type: postType,
                    is_active: true,
                    likes_count: 0,
                    comments_count: 0,
                    shares_count: 0,
                    views_count: 0,
                    images: [] // TODO: Add image upload support
                });

            if (error) throw error;

            setContent('');
            setPostType('project_showcase');
            onPostCreated();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card style={{ marginBottom: theme.spacing[6] }}>
            <CardContent className="p-4">
                <div style={{ marginBottom: theme.spacing[3] }}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Share a project update, ask a question, or give a tip..."
                        rows={3}
                        style={{
                            width: '100%',
                            padding: theme.spacing[3],
                            borderRadius: theme.borderRadius.md,
                            border: `1px solid ${theme.colors.border}`,
                            resize: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                        <select
                            value={postType}
                            onChange={(e) => setPostType(e.target.value as any)}
                            style={{
                                padding: theme.spacing[2],
                                borderRadius: theme.borderRadius.md,
                                border: `1px solid ${theme.colors.border}`,
                                backgroundColor: theme.colors.background
                            }}
                        >
                            <option value="project_showcase">Project Showcase</option>
                            <option value="question">Question</option>
                            <option value="tip">Pro Tip</option>
                            <option value="news">News</option>
                        </select>

                        <Button variant="ghost" size="sm" disabled>
                            <ImageIcon size={18} />
                        </Button>
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                    >
                        <Send size={16} style={{ marginRight: theme.spacing[2] }} />
                        {isSubmitting ? 'Posting...' : 'Post'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
