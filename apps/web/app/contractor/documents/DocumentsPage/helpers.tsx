import { FileText, Image as ImageIcon, FolderOpen, File } from 'lucide-react';

export const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-600" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return <ImageIcon className="w-8 h-8 text-blue-600" />;
    case 'docx':
    case 'doc':
      return <FileText className="w-8 h-8 text-blue-700" />;
    case 'zip':
      return <FolderOpen className="w-8 h-8 text-yellow-600" />;
    default:
      return <File className="w-8 h-8 text-gray-600" />;
  }
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
