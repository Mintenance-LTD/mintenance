'use client';
import { useState } from 'react';
import { Plus, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
interface RequirementsManagerProps {
  requirements: string[];
  onRequirementsChange: (requirements: string[]) => void;
  maxRequirements?: number;
}
const fadeIn = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};
export function RequirementsManager({
  requirements,
  onRequirementsChange,
  maxRequirements = 10,
}: RequirementsManagerProps) {
  const [newRequirement, setNewRequirement] = useState('');
  const handleAddRequirement = () => {
    if (!newRequirement.trim()) {
      toast.error('Please enter a requirement');
      return;
    }
    if (requirements.length >= maxRequirements) {
      toast.error(`Maximum ${maxRequirements} requirements allowed`);
      return;
    }
    if (requirements.includes(newRequirement.trim())) {
      toast.error('This requirement already exists');
      return;
    }
    onRequirementsChange([...requirements, newRequirement.trim()]);
    setNewRequirement('');
    toast.success('Requirement added');
  };
  const handleRemoveRequirement = (index: number) => {
    const newRequirements = requirements.filter((_, i) => i !== index);
    onRequirementsChange(newRequirements);
    toast.success('Requirement removed');
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRequirement();
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <FileText className="inline-block h-4 w-4 mr-2" />
          Special Requirements
        </label>
        <span className="text-sm text-gray-500">
          {requirements.length}/{maxRequirements} requirements
        </span>
      </div>
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <MotionDiv
            key={index}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-gray-50
                     rounded-lg group hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-700 flex-1">{req}</span>
            <button
              type="button"
              onClick={() => handleRemoveRequirement(index)}
              className="ml-3 p-1 text-red-600 opacity-0 group-hover:opacity-100
                       transition-opacity hover:bg-red-50 rounded"
              aria-label={`Remove requirement: ${req}`}
            >
              <X className="h-4 w-4" />
            </button>
          </MotionDiv>
        ))}
      </div>
      {requirements.length < maxRequirements && (
        <div className="flex space-x-2">
          <input
            type="text"
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a special requirement..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     placeholder-gray-400 text-sm"
            maxLength={200}
          />
          <button
            type="button"
            onClick={handleAddRequirement}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg
                     hover:bg-indigo-700 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 transition-colors
                     flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>
      )}
      {requirements.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No special requirements added. Add requirements to help contractors
          understand specific needs for this job.
        </p>
      )}
      {newRequirement.length > 150 && (
        <p className="text-xs text-amber-600">
          {200 - newRequirement.length} characters remaining
        </p>
      )}
    </div>
  );
}