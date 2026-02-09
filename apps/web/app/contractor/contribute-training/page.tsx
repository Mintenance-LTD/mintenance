/**
 * Contractor Training Data Contribution Portal
 * Allows contractors to contribute images and earn rewards
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gift,
  Trophy,
  Camera,
  PoundSterling,
  Star,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

// Maintenance categories
const MAINTENANCE_CATEGORIES = [
  { id: 'pipe_leak', label: 'Pipe Leak', category: 'plumbing' },
  { id: 'faucet_drip', label: 'Dripping Faucet', category: 'plumbing' },
  { id: 'toilet_issue', label: 'Toilet Problem', category: 'plumbing' },
  { id: 'water_heater', label: 'Water Heater', category: 'plumbing' },
  { id: 'drain_blocked', label: 'Blocked Drain', category: 'plumbing' },
  { id: 'outlet_damage', label: 'Damaged Outlet', category: 'electrical' },
  { id: 'light_fixture', label: 'Light Fixture', category: 'electrical' },
  { id: 'circuit_breaker', label: 'Circuit Breaker', category: 'electrical' },
  { id: 'wall_crack', label: 'Wall Crack', category: 'structural' },
  { id: 'ceiling_stain', label: 'Ceiling Stain', category: 'structural' },
  { id: 'window_broken', label: 'Broken Window', category: 'structural' },
  { id: 'door_issue', label: 'Door Problem', category: 'structural' },
  { id: 'ac_not_cooling', label: 'AC Not Cooling', category: 'hvac' },
  { id: 'heating_issue', label: 'Heating Problem', category: 'hvac' },
  { id: 'vent_blocked', label: 'Blocked Vent', category: 'hvac' }
];

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  category: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

interface ContributorStats {
  totalContributions: number;
  verifiedContributions: number;
  creditsEarned: number;
  level: 'bronze' | 'silver' | 'gold' | 'expert';
  nextLevelProgress: number;
  nextLevelRequirement: string;
}

export default function ContributeTrainingPage() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [contributorStats, setContributorStats] = useState<ContributorStats>({
    totalContributions: 42,
    verifiedContributions: 38,
    creditsEarned: 190,
    level: 'silver',
    nextLevelProgress: 42,
    nextLevelRequirement: '200 verified contributions for Gold'
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      category: selectedCategory || '',
      status: 'pending' as const
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  }, [selectedCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Handle image upload
  const handleUpload = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    const pendingImages = uploadedImages.filter(img => img.status === 'pending');
    if (pendingImages.length === 0) {
      toast('All images have already been processed', { icon: 'ℹ️' });
      return;
    }

    setIsUploading(true);

    for (const image of pendingImages) {
      if (!image.category) {
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'error', message: 'Please select a category' }
              : img
          )
        );
        continue;
      }

      // Update status to processing
      setUploadedImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, status: 'processing' } : img
        )
      );

      try {
        // Create form data
        const formData = new FormData();
        formData.append('image', image.file);
        formData.append('category', image.category);

        // Upload image
        const response = await fetch('/api/contractor/training-contribution', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();

        // Update status to success
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'success', message: 'Uploaded successfully' }
              : img
          )
        );

        // Update stats
        setContributorStats(prev => ({
          ...prev,
          totalContributions: prev.totalContributions + 1,
          creditsEarned: prev.creditsEarned + 5
        }));

        toast.success(`Image uploaded successfully! Earned 5 credits`);

      } catch (error) {
        logger.error('Upload error:', error, { service: 'app' });
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'error', message: 'Upload failed' }
              : img
          )
        );
        toast.error('Failed to upload image');
      }
    }

    setIsUploading(false);
  };

  // Calculate level progress
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'bronze':
        return <Badge className="bg-orange-600">Bronze</Badge>;
      case 'silver':
        return <Badge className="bg-gray-400">Silver</Badge>;
      case 'gold':
        return <Badge className="bg-yellow-500">Gold</Badge>;
      case 'expert':
        return <Badge className="bg-purple-600">Expert</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Train Our AI</h1>
        <p className="text-muted-foreground">
          Contribute maintenance images and earn rewards while improving our AI accuracy
        </p>
      </div>

      {/* Rewards Banner */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Gift className="h-4 w-4" />
        <AlertTitle>Earn Rewards!</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <PoundSterling className="h-4 w-4" />
              <span>£5 credit per 10 verified images</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>3 months premium free with 100+ contributions</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Expert badge and priority support at 500+ contributions</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Contributor Stats */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Contribution Stats</CardTitle>
            {getLevelIcon(contributorStats.level)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Contributions</p>
              <p className="text-2xl font-bold">{contributorStats.totalContributions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold">{contributorStats.verifiedContributions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credits Earned</p>
              <p className="text-2xl font-bold">£{contributorStats.creditsEarned}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Level</p>
              <div className="mt-2">
                <Progress value={contributorStats.nextLevelProgress} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {contributorStats.nextLevelRequirement}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Images</TabsTrigger>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          <TabsTrigger value="history">My Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Issue Category</CardTitle>
              <CardDescription>
                Choose the type of maintenance issue shown in your images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['plumbing', 'electrical', 'structural', 'hvac'].map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium capitalize">{category}</h4>
                    {MAINTENANCE_CATEGORIES
                      .filter(cat => cat.category === category)
                      .map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={cat.id}
                            checked={selectedCategory === cat.id}
                            onCheckedChange={(checked) =>
                              setSelectedCategory(checked ? cat.id : '')
                            }
                          />
                          <Label htmlFor={cat.id} className="text-sm">
                            {cat.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload Images</CardTitle>
              <CardDescription>
                Upload clear photos of the selected maintenance issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Drop the images here...</p>
                ) : (
                  <>
                    <p className="text-lg mb-2">Drag & drop images here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to select files (max 10 images, 10MB each)
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">Uploaded Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map(image => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.preview}
                          alt="Upload preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2">
                          {image.status === 'pending' && (
                            <Badge variant="warning">Pending</Badge>
                          )}
                          {image.status === 'processing' && (
                            <Badge variant="info">Processing</Badge>
                          )}
                          {image.status === 'success' && (
                            <Badge variant="success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {image.status === 'error' && (
                            <Badge variant="error">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                        {image.category && (
                          <Badge className="absolute bottom-2 left-2 text-xs">
                            {MAINTENANCE_CATEGORIES.find(c => c.id === image.category)?.label}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {uploadedImages.length > 0 && (
                <div className="mt-6 flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setUploadedImages([])}
                    disabled={isUploading}
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedCategory}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Photo Guidelines</CardTitle>
              <CardDescription>
                Follow these guidelines for best results and faster approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Good Photo Practices
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Take photos from 2-3 feet away for context</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Ensure good, even lighting without harsh shadows</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Include the entire problem area in frame</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Take multiple angles if helpful</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  What to Avoid
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>Blurry or out-of-focus images</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>Images with personal information visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>Extreme close-ups without context</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>Images unrelated to maintenance issues</span>
                  </li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Privacy Notice</AlertTitle>
                <AlertDescription>
                  All uploaded images become part of our training dataset.
                  Ensure no personal or sensitive information is visible.
                  Images are anonymized and used solely for AI improvement.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribution History</CardTitle>
              <CardDescription>
                Track your uploads and verification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Your contribution history will appear here</p>
                <p className="text-sm mt-2">Keep uploading to see your progress!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}