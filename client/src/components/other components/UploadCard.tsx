

import React from 'react';
import { 
  Download, 
  FileSpreadsheet,
  FileText,
  FileImage,
  FileVideo,
  FileBox,
  FileArchive,
  FileAudio,
  File
} from 'lucide-react';

interface TemplateCardProps {
  fileName: string;
  fileSize: string | number;
  fileType?: 'excel' | 'pdf' | 'image' | 'video' | 'audio' | 'archive' | 'text';
  description?: string;
  onDownload?: () => void;
  downloadLabel?: string;
  buttonVariant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  customIcon?: React.ReactNode;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  fileName,
  fileSize,
  fileType = 'text',
  description,
  onDownload,
  downloadLabel = 'Download',
  buttonVariant = 'primary',
  disabled = false,
  customIcon
}) => {
  // Function to format file size if number is provided
  const formatFileSize = (size: string | number): string => {
    if (typeof size === 'string') return size;
    
    if (size < 1024) return size + ' bytes';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else if (size < 1073741824) return (size / 1048576).toFixed(1) + ' MB';
    return (size / 1073741824).toFixed(1) + ' GB';
  };

  // Function to get appropriate icon based on file type
  const getFileIcon = () => {
    if (customIcon) return customIcon;

    const props = { className: "w-6 h-6 text-gray-500" };
    
    const icons = {
      'excel': <FileSpreadsheet {...props} />,
      'pdf': <FileBox {...props} />,
      'image': <FileImage {...props} />,
      'video': <FileVideo {...props} />,
      'archive': <FileArchive {...props} />,
      'audio': <FileAudio {...props} />,
      'text': <FileText {...props} />
    };

    return icons[fileType] || <File {...props} />;
  };

  // Button variant styles
  const buttonStyles = {
    primary: 'text-blue-600 hover:text-blue-700',
    secondary: 'text-gray-600 hover:text-gray-700',
    danger: 'text-red-600 hover:text-red-700'
  };

  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="flex items-center space-x-3">
        {getFileIcon()}
        <div>
          <p className="text-sm font-medium text-gray-700">{fileName}</p>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
        </div>
      </div>
      <button 
        onClick={onDownload}
        disabled={disabled}
        className={`flex items-center space-x-1 px-3 py-1 text-sm ${buttonStyles[buttonVariant]} 
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <Download className="w-4 h-4" />
        <span>{downloadLabel}</span>
      </button>
    </div>
  );
};

export default TemplateCard;

