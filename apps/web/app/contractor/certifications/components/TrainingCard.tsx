'use client';

import { BookOpen, Calendar, Download, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Training {
  id: string;
  courseName: string;
  provider: string;
  completionDate: string;
  hours: number;
  certificateUrl?: string;
  category: string;
  skills: string[];
}

interface TrainingCardProps {
  train: Training;
  onDelete: (id: string, name: string) => void;
}

export function TrainingCard({ train, onDelete }: TrainingCardProps) {
  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">{train.courseName}</h3>
              <p className="text-sm text-gray-600 mb-3">{train.provider}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Completed {new Date(train.completionDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">{train.hours} hours</span>
                </div>
              </div>
              {train.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {train.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {train.certificateUrl && (
            <button onClick={() => toast.success('Downloading certificate...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Download className="w-4 h-4" />Certificate
            </button>
          )}
          <button onClick={() => toast.success('Edit functionality coming soon')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Edit className="w-4 h-4" />Edit
          </button>
          <button onClick={() => onDelete(train.id, train.courseName)} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
            <Trash2 className="w-4 h-4" />Delete
          </button>
        </div>
      </div>
    </div>
  );
}
