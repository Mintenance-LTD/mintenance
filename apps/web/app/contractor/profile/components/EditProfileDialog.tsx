'use client';

import React, { useState, FormEvent } from 'react';
import { theme } from '@/lib/theme';
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, AlertCircle, Trash2, ChevronDown, Loader2, Briefcase, Home, Building, Grid3x3, FileText, Pencil, Lightbulb, Activity, Clipboard, LucideIcon } from 'lucide-react';

// Helper function to get Lucide icon component from skill icon name
function getSkillIconComponent(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    briefcase: Briefcase,
    home: Home,
    building: Building,
    collection: Grid3x3,
    document: FileText,
    edit: Pencil,
    lightBulb: Lightbulb,
    activity: Activity,
    clipboard: Clipboard,
    trash: Trash2,
  };
  return iconMap[iconName] || Briefcase; // Default to Briefcase if not found
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: any;
  skills: Array<{ skill_name: string }>;
  onSave: (data: any) => Promise<void>;
}

export function EditProfileDialog({ open, onOpenChange, contractor, skills, onSave }: EditProfileDialogProps) {
  const [formData, setFormData] = useState({
    firstName: contractor?.first_name || '',
    lastName: contractor?.last_name || '',
    bio: contractor?.bio || '',
    city: contractor?.city || '',
    country: contractor?.country || 'UK',
    phone: contractor?.phone || '',
    companyName: contractor?.company_name || '',
    licenseNumber: contractor?.license_number || '',
    isAvailable: contractor?.is_available ?? true,
    latitude: contractor?.latitude || undefined,
    longitude: contractor?.longitude || undefined,
    address: contractor?.address || undefined,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(contractor?.profile_image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    skills?.map(s => s.skill_name) || []
  );
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'business' | 'skills'>('basic');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }

      setProfileImage(file);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const availableSkills = [
    'General Contracting',
    'Kitchen Remodeling',
    'Bathroom Renovation',
    'Plumbing',
    'Electrical Work',
    'Carpentry',
    'Tiling',
    'Painting',
    'Flooring',
    'Roofing',
    'HVAC',
    'Landscaping',
    'Masonry',
    'Drywall',
    'Window Installation',
    'Door Installation',
    'Deck Building',
    'Fence Installation',
    'Concrete Work',
    'Insulation',
    'Siding',
    'Gutters',
    'General Maintenance',
    'Home Inspection',
    'Demolition',
  ].sort();

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length >= 15) {
        setError('Maximum 15 skills allowed');
        return;
      }
      setSelectedSkills([...selectedSkills, skill]);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        profileImage,
        skills: selectedSkills.map(skillName => ({
          skill_name: skillName,
          skill_icon: getSkillIcon(skillName),
        })),
      };

      await onSave(updateData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !loading) {
      setError(null);
      setShowSkillDropdown(false);
    }
    onOpenChange(open);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-6 border-b">
            <DialogTitle className="text-2xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="location">Location & Contact</TabsTrigger>
              <TabsTrigger value="business">Business Info</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-6 overflow-y-auto flex-1">
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="basic" className="mt-0">
                  <div className="space-y-6">
                    {/* Profile Photo Upload */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                      <div
                        className="w-36 h-36 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer border-4 border-gray-200 relative transition-transform hover:scale-105 hover:shadow-md"
                        style={{
                          backgroundImage: imagePreview ? `url(${imagePreview})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          color: theme.colors.textSecondary,
                        }}
                        onClick={() => document.getElementById('profile-image-input')?.click()}
                      >
                        {!imagePreview && (
                          <>
                            {formData.firstName?.[0] || 'U'}{formData.lastName?.[0] || ''}
                          </>
                        )}
                        {imagePreview && (
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>

                      <input
                        id="profile-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => document.getElementById('profile-image-input')?.click()}
                      >
                        {imagePreview ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                          className="mt-2"
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <Label htmlFor="bio">Bio / Description</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={5}
                        maxLength={500}
                        placeholder="Tell homeowners about your experience, specialties, and what makes you unique..."
                        className="mt-2"
                      />
                      <div className="text-xs text-gray-500 mt-2 text-right">
                        {formData.bio.length}/500 characters
                      </div>
                    </div>

                    {/* Availability Toggle */}
                    <div className="flex items-center justify-between p-5 bg-gray-50 rounded-lg border">
                      <div>
                        <Label htmlFor="isAvailable" className="text-base font-semibold block mb-1">
                          Available for New Projects
                        </Label>
                        <p className="text-sm text-gray-600 m-0">
                          Show your profile to homeowners looking for contractors
                        </p>
                      </div>
                      
                      <Switch
                        id="isAvailable"
                        checked={formData.isAvailable}
                        onCheckedChange={(checked: boolean) => setFormData({ ...formData, isAvailable: checked })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="mt-0">
                  <div className="space-y-6">
                    {/* Location Fields */}
                    <div className="grid grid-cols-[2fr_1fr] gap-4">
                      <div>
                        <Label htmlFor="city">City / Address</Label>
                        <PlacesAutocomplete
                          value={formData.city}
                          onChange={(value) => setFormData({ ...formData, city: value })}
                          onPlaceSelect={(place) => {
                            setFormData({
                              ...formData,
                              city: place.city,
                              country: place.country,
                              address: place.address,
                              latitude: place.latitude,
                              longitude: place.longitude,
                            });
                          }}
                          placeholder="London or enter your address"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value: string) => setFormData({ ...formData, country: value })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+44 7700 900000"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="business" className="mt-0">
                  <div className="space-y-6">
                    {/* Company Name */}
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="ABC Plumbing Ltd"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Your company name helps build trust with homeowners
                      </p>
                    </div>

                    {/* License Number */}
                    <div>
                      <Label htmlFor="licenseNumber">License Registration Number</Label>
                      <Input
                        id="licenseNumber"
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                        placeholder="LIC-12345-UK"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Your license number will be verified by our admin team. Once verified, you'll receive a verification badge.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <Label>Skills & Professions ({selectedSkills.length}/15)</Label>
                      <p className="text-sm text-gray-600 mt-2 mb-4">
                        Select skills that match your expertise. Jobs requiring these skills will appear in your "Jobs Near You" feed.
                      </p>
                      
                      {/* Selected Skills Chips */}
                      {selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedSkills.map((skill) => (
                            <div
                              key={skill}
                              className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border"
                              style={{
                                backgroundColor: `${theme.colors.primary}15`,
                                color: theme.colors.primary,
                                borderColor: `${theme.colors.primary}30`,
                              }}
                            >
                              {React.createElement(getSkillIconComponent(getSkillIcon(skill)), { 
                                className: "h-4 w-4", 
                                style: { color: theme.colors.primary } 
                              })}
                              <span>{skill}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSkill(skill)}
                                className="h-5 w-5 p-0 ml-1"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skill Selection Dropdown */}
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                          disabled={selectedSkills.length >= 15}
                          className="w-full justify-between"
                        >
                          <span>{selectedSkills.length >= 15 ? 'Maximum skills reached' : 'Add Skill'}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>

                        {showSkillDropdown && (
                          <>
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-50 p-2">
                              {availableSkills
                                .filter(skill => !selectedSkills.includes(skill))
                                .map((skill) => (
                                  <Button
                                    key={skill}
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                      handleToggleSkill(skill);
                                      setShowSkillDropdown(false);
                                    }}
                                    className="w-full justify-start"
                                  >
                                    {React.createElement(getSkillIconComponent(getSkillIcon(skill)), { 
                                      className: "h-4 w-4", 
                                      style: { color: theme.colors.textSecondary } 
                                    })}
                                    <span className="ml-2">{skill}</span>
                                  </Button>
                                ))}
                              {availableSkills.filter(skill => !selectedSkills.includes(skill)).length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  All available skills selected
                                </div>
                              )}
                            </div>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowSkillDropdown(false)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Delete Account Section */}
                <div className="px-6 py-6 border-t border-b">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-semibold m-0">Danger Zone</h3>
                    <p className="text-sm text-gray-600 m-0">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={loading}
                      className="w-fit"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userId={contractor?.id}
        />
      )}
    </>
  );
}

