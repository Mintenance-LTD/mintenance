'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ onClose, onPostCreated }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<string>('work_showcase');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Additional fields based on post type
  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState<string[]>([]);
  const [projectDuration, setProjectDuration] = useState<string>('');
  const [projectCost, setProjectCost] = useState<string>('');
  const [helpCategory, setHelpCategory] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<string>('medium');
  const [budgetRange, setBudgetRange] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [itemCondition, setItemCondition] = useState<string>('');
  const [rentalPrice, setRentalPrice] = useState<string>('');
  
  const [skillInput, setSkillInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');

  const handleAddImage = () => {
    if (imageUrl.trim() && images.length < 5) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skillsUsed.includes(skillInput.trim())) {
      setSkillsUsed([...skillsUsed, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsUsed(skillsUsed.filter(s => s !== skill));
  };

  const handleAddMaterial = () => {
    if (materialInput.trim() && !materialsUsed.includes(materialInput.trim())) {
      setMaterialsUsed([...materialsUsed, materialInput.trim()]);
      setMaterialInput('');
    }
  };

  const handleRemoveMaterial = (material: string) => {
    setMaterialsUsed(materialsUsed.filter(m => m !== material));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (title.length > 255) {
      setError('Title must be 255 characters or less');
      return;
    }

    setLoading(true);

    try {
      const payload: {
        title: string;
        content: string;
        help_category?: string;
        images?: string[];
        post_type?: string;
        skills_used?: string[];
        materials_used?: string[];
        project_duration?: number;
        project_cost?: number;
        urgency_level?: string;
        budget_range?: number;
        item_name?: string;
        item_condition?: string;
        rental_price?: number;
      } = {
        title: title.trim(),
        content: content.trim(),
        images: images.filter(url => url.trim()),
        post_type: postType,
      };

      // Add fields based on post type
      if (postType === 'work_showcase') {
        if (skillsUsed.length > 0) payload.skills_used = skillsUsed;
        if (materialsUsed.length > 0) payload.materials_used = materialsUsed;
        if (projectDuration) payload.project_duration = parseInt(projectDuration);
        if (projectCost) payload.project_cost = parseFloat(projectCost);
      } else if (postType === 'help_request') {
        if (helpCategory) payload.help_category = helpCategory;
        if (urgencyLevel) payload.urgency_level = urgencyLevel;
        if (budgetRange) payload.budget_range = parseFloat(budgetRange);
      } else if (postType === 'equipment_share') {
        if (itemName) payload.item_name = itemName;
        if (itemCondition) payload.item_condition = itemCondition;
        if (rentalPrice) payload.rental_price = parseFloat(rentalPrice);
      }

      const response = await fetch('/api/contractor/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div
            style={{
              padding: theme.spacing[6],
              borderBottom: `1px solid ${theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                margin: 0,
              }}
            >
              Create Post
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: theme.spacing[1],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: theme.spacing[6], display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            {error && (
              <div
                style={{
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.error + '20',
                  color: theme.colors.error,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}
              >
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Just finished a luxury bathroom renovation!"
                maxLength={255}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                }}
              />
            </div>

            {/* Post Type */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}
              >
                Post Type *
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                }}
              >
                <option value="work_showcase">Work Showcase</option>
                <option value="help_request">Help Request</option>
                <option value="tip_share">Tip Share</option>
                <option value="equipment_share">Equipment Share</option>
                <option value="referral_request">Referral Request</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}
              >
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  postType === 'work_showcase' ? 'Share your project details, challenges, and results...' :
                  postType === 'help_request' ? 'Describe what help you need...' :
                  postType === 'tip_share' ? 'Share your tips and best practices...' :
                  postType === 'equipment_share' ? 'Describe the equipment you want to share...' :
                  'Describe your referral request...'
                }
                rows={6}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.base,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: theme.colors.text,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Work Showcase Fields */}
            {postType === 'work_showcase' && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    Skills Used
                  </label>
                  {skillsUsed.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                      {skillsUsed.map((skill, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing[1],
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            backgroundColor: theme.colors.primary + '20',
                            color: theme.colors.primary,
                            borderRadius: theme.borderRadius.full,
                            fontSize: theme.typography.fontSize.xs,
                          }}
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Icon name="x" size={12} color={theme.colors.primary} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      placeholder="Add a skill"
                      style={{
                        flex: 1,
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddSkill} disabled={!skillInput.trim()}>
                      Add
                    </Button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    Materials Used
                  </label>
                  {materialsUsed.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                      {materialsUsed.map((material, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing[1],
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            backgroundColor: theme.colors.primary + '20',
                            color: theme.colors.primary,
                            borderRadius: theme.borderRadius.full,
                            fontSize: theme.typography.fontSize.xs,
                          }}
                        >
                          <span>{material}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(material)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Icon name="x" size={12} color={theme.colors.primary} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                    <input
                      type="text"
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMaterial())}
                      placeholder="Add a material"
                      style={{
                        flex: 1,
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddMaterial} disabled={!materialInput.trim()}>
                      Add
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Project Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={projectDuration}
                      onChange={(e) => setProjectDuration(e.target.value)}
                      placeholder="e.g., 40"
                      min="0"
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Project Cost (£)
                    </label>
                    <input
                      type="number"
                      value={projectCost}
                      onChange={(e) => setProjectCost(e.target.value)}
                      placeholder="e.g., 5000"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Help Request Fields */}
            {postType === 'help_request' && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    Help Category
                  </label>
                  <select
                    value={helpCategory}
                    onChange={(e) => setHelpCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: theme.spacing[2],
                      fontSize: theme.typography.fontSize.sm,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                  >
                    <option value="">Select category</option>
                    <option value="technical">Technical</option>
                    <option value="material">Material</option>
                    <option value="equipment">Equipment</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Urgency Level
                    </label>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Budget Range (£)
                    </label>
                    <input
                      type="number"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      placeholder="e.g., 500"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Equipment Share Fields */}
            {postType === 'equipment_share' && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Professional Tile Saw"
                    style={{
                      width: '100%',
                      padding: theme.spacing[2],
                      fontSize: theme.typography.fontSize.sm,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Condition
                    </label>
                    <select
                      value={itemCondition}
                      onChange={(e) => setItemCondition(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    >
                      <option value="">Select condition</option>
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[2],
                      }}
                    >
                      Rental Price (£/day)
                    </label>
                    <input
                      type="number"
                      value={rentalPrice}
                      onChange={(e) => setRentalPrice(e.target.value)}
                      placeholder="e.g., 50"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: theme.spacing[2],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Images */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}
              >
                Images ({images.length}/5)
              </label>
              {images.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                  }}
                >
                  {images.map((url, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        paddingBottom: '100%',
                        borderRadius: theme.borderRadius.md,
                        overflow: 'hidden',
                        backgroundColor: theme.colors.backgroundSecondary,
                      }}
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        style={{
                          position: 'absolute',
                          top: theme.spacing[1],
                          right: theme.spacing[1],
                          background: 'rgba(0, 0, 0, 0.7)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <Icon name="x" size={12} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL"
                    style={{
                      flex: 1,
                      padding: theme.spacing[3],
                      fontSize: theme.typography.fontSize.base,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddImage}
                    disabled={!imageUrl.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: theme.spacing[6],
              borderTop: `1px solid ${theme.colors.border}`,
              display: 'flex',
              gap: theme.spacing[4],
              justifyContent: 'flex-end',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

