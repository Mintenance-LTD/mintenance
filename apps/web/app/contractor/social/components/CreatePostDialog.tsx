'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCSRF, fetchWithCSRF } from '@/lib/hooks/useCSRF';
import { X, AlertCircle } from 'lucide-react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export function CreatePostDialog({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<string>('work_showcase');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { csrfToken, loading: csrfLoading, error: csrfError } = useCSRF();
  
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

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTitle('');
      setContent('');
      setPostType('work_showcase');
      setImages([]);
      setImageUrl('');
      setError(null);
      setSkillsUsed([]);
      setMaterialsUsed([]);
      setProjectDuration('');
      setProjectCost('');
      setHelpCategory('');
      setUrgencyLevel('medium');
      setBudgetRange('');
      setItemName('');
      setItemCondition('');
      setRentalPrice('');
      setSkillInput('');
      setMaterialInput('');
    }
  }, [open]);

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

    if (!csrfToken || csrfLoading || csrfError) {
      setError('Security token not ready yet. Please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
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

      const response = await fetchWithCSRF('/api/contractor/posts', {
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
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const getContentPlaceholder = () => {
    switch (postType) {
      case 'work_showcase':
        return 'Share your project details, challenges, and results...';
      case 'help_request':
        return 'Describe what help you need...';
      case 'tip_share':
        return 'Share your tips and best practices...';
      case 'equipment_share':
        return 'Describe the equipment you want to share...';
      default:
        return 'Describe your referral request...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share your work, ask for help, or connect with other contractors
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Just finished a luxury bathroom renovation!"
              maxLength={255}
              required
            />
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label htmlFor="postType">
              Post Type *
            </Label>
            <Select value={postType} onValueChange={(value: string) => setPostType(value)}>
              <SelectTrigger id="postType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work_showcase">Work Showcase</SelectItem>
                <SelectItem value="help_request">Help Request</SelectItem>
                <SelectItem value="tip_share">Tip Share</SelectItem>
                <SelectItem value="equipment_share">Equipment Share</SelectItem>
                <SelectItem value="referral_request">Referral Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content *
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={getContentPlaceholder()}
              rows={6}
              required
            />
          </div>

          {/* Work Showcase Fields */}
          {postType === 'work_showcase' && (
            <>
              <div className="space-y-2">
                <Label>Skills Used</Label>
                {skillsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skillsUsed.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add a skill"
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSkill} disabled={!skillInput.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Materials Used</Label>
                {materialsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {materialsUsed.map((material, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        <span>{material}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(material)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMaterial())}
                    placeholder="Add a material"
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddMaterial} disabled={!materialInput.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectDuration">
                    Project Duration (hours)
                  </Label>
                  <Input
                    id="projectDuration"
                    type="number"
                    value={projectDuration}
                    onChange={(e) => setProjectDuration(e.target.value)}
                    placeholder="e.g., 40"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectCost">
                    Project Cost (£)
                  </Label>
                  <Input
                    id="projectCost"
                    type="number"
                    value={projectCost}
                    onChange={(e) => setProjectCost(e.target.value)}
                    placeholder="e.g., 5000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          {/* Help Request Fields */}
          {postType === 'help_request' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="helpCategory">
                  Help Category
                </Label>
                <Select value={helpCategory} onValueChange={(value: string) => setHelpCategory(value)}>
                  <SelectTrigger id="helpCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgencyLevel">
                    Urgency Level
                  </Label>
                  <Select value={urgencyLevel} onValueChange={(value: string) => setUrgencyLevel(value)}>
                    <SelectTrigger id="urgencyLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">
                    Budget Range (£)
                  </Label>
                  <Input
                    id="budgetRange"
                    type="number"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    placeholder="e.g., 500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          {/* Equipment Share Fields */}
          {postType === 'equipment_share' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="itemName">
                  Item Name *
                </Label>
                <Input
                  id="itemName"
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Professional Tile Saw"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCondition">
                    Condition
                  </Label>
                  <Select value={itemCondition} onValueChange={(value: string) => setItemCondition(value)}>
                    <SelectTrigger id="itemCondition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentalPrice">
                    Rental Price (£/day)
                  </Label>
                  <Input
                    id="rentalPrice"
                    type="number"
                    value={rentalPrice}
                    onChange={(e) => setRentalPrice(e.target.value)}
                    placeholder="e.g., 50"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          {/* Images */}
          <div className="space-y-2">
            <Label>
              Images ({images.length}/5)
            </Label>
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {images.map((url, index) => (
                  <div
                    key={index}
                    className="relative pb-[100%] rounded-md overflow-hidden bg-gray-100"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-black/70 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/90"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 5 && (
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL"
                  className="flex-1"
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

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

