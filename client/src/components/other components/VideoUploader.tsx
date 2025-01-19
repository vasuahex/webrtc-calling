
import React, { useState, useCallback } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Download,
    X,
    FileText,
    FileImage,
    FileVideo,
    FileBox,
    FileArchive,
    FileAudio,
    File
} from 'lucide-react';

// Types
export type FileType = 'excel' | 'pdf' | 'image' | 'video' | 'audio' | 'archive' | 'text' | 'any';
export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error' | 'processing';

export interface FileConfig {
    type: FileType;
    maxSize: number; // in MB
    allowedExtensions: string[];
}


interface Template {
    fileName: string;
    fileSize: number;
    fileType: FileType;
    description?: string;
    downloadUrl?: string;
}

interface AdvancedUploaderProps {
    onUpload?: (file: File) => void;
    onAbort?: (fileName: string) => void;
    handleOpenFile: (fileName: string) => void;
    allowedTypes?: FileConfig[];
    templates?: Template[];
    maxFiles?: number;
    showTemplates?: boolean;
    title?: string;
    description?: string;
    uploadProgress?: { [key: string]: number }; // Tracks progress for each file
    setUploadProgress?: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>; // Setter for uploadProgress
    uploadStatus?: { [key: string]: UploadStatus }; // Tracks status for each file
    setUploadStatus?: React.Dispatch<React.SetStateAction<{ [key: string]: UploadStatus }>>;
    setErrors?: React.Dispatch<React.SetStateAction<{ [fileName: string]: string; }>>
    errors?: { [fileName: string]: string }
}

const DEFAULT_FILE_CONFIGS: FileConfig[] = []

const AdvancedUploader: React.FC<AdvancedUploaderProps> = ({
    onUpload,
    onAbort,
    handleOpenFile,
    allowedTypes = DEFAULT_FILE_CONFIGS,
    templates = [],
    maxFiles = 1,
    showTemplates = true,
    title = "Upload Files",
    description,
    uploadProgress = {},
    setUploadProgress = () => { },
    uploadStatus = {},
    setUploadStatus = () => { },
    errors = {},
    setErrors = () => { }
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);


    const getFileType = (file: File): FileType => {
        const ext = file.name.toLowerCase().split('.').pop() || '';
        if (['.csv', '.xlsx', '.xls'].includes(`.${ext}`)) return 'excel';
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(`.${ext}`)) return 'image';
        if (['.mp4', '.avi', '.mov'].includes(`.${ext}`)) return 'video';
        if (['.mp3', '.wav'].includes(`.${ext}`)) return 'audio';
        if (['.zip', '.rar'].includes(`.${ext}`)) return 'archive';
        if (['.pdf'].includes(`.${ext}`)) return 'pdf';
        if (['.txt', '.doc', '.docx'].includes(`.${ext}`)) return 'text';
        return 'any';
    };

    const validateFile = (file: File): boolean => {
        const fileType = getFileType(file);
        const config = allowedTypes.find(type => type.type === fileType || type.type === 'any');

        if (!config) {
            setErrors(prev => ({ ...prev, [file.name]: 'File type not allowed' }));
            return false;
        }

        if (file.size > config.maxSize * 1024 * 1024) {
            setErrors(prev => ({ ...prev, [file.name]: `File size must be less than ${config.maxSize}MB` }));
            return false;
        }


        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!config.allowedExtensions.includes(ext) && config.allowedExtensions[0] !== '*') {
            setErrors(prev => ({ ...prev, [file.name]: `Allowed extensions: ${config.allowedExtensions.join(', ')}` }));
            return false;
        }

        return true;
    };

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const files = 'dataTransfer' in e
            ? Array.from(e.dataTransfer?.files || [])
            : Array.from(e.target?.files || []);

        const validFiles = files.filter(validateFile);

        if (validFiles.length + selectedFiles.length > maxFiles) {
            setErrors(prev => ({ ...prev, 'maxfiles': `Maximum ${maxFiles} files are allowed` }));
            return;
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
        validFiles.forEach(file => {
            setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
            setUploadStatus(prev => ({ ...prev, [file.name]: 'idle' }));
        });
    }, [maxFiles, selectedFiles.length]);

    const handleUpload = async (file: File) => {
        try {
            setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));

            if (onUpload) {
                await onUpload(file);
            }
        } catch (err) {
            console.log(err);

            setErrors(prev => ({ ...prev, [file.name]: 'Upload failed. Please try again.' }));
            setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        }
    };

    const handleRemoveFile = async (fileName: string) => {
        if (onAbort) {
            await onAbort(fileName);
        }
        setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
        setUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
        });
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fileName];
            return newErrors;
        });
    };

    const getFileIcon = (fileType: FileType) => {
        const props = { className: "w-6 h-6" };
        const icons = {
            'excel': <FileSpreadsheet {...props} />,
            'pdf': <FileBox {...props} />,
            'image': <FileImage {...props} />,
            'video': <FileVideo {...props} />,
            'archive': <FileArchive {...props} />,
            'audio': <FileAudio {...props} />,
            'text': <FileText {...props} />,
            'any': <File {...props} />
        };
        return icons[fileType] || icons.any;
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                {description && <p className="text-sm text-gray-500">{description}</p>}
                <p className="text-sm text-gray-500">
                    Allowed types: {allowedTypes.map(t => t.type).join(', ')}
                </p>
            </div>

            {/* Drop Zone */}
            <div
                className={`relative md:cursor-pointer bg-stone-100 border-2 border-dashed rounded-lg p-8 text-center
          ${Object.keys(errors).length > 0 ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}
          transition-colors duration-200`}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('fileInput')?.click()}
            >
                <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    multiple={maxFiles > 1}
                    onChange={onDrop}
                    accept={allowedTypes.flatMap(t => t.allowedExtensions).join(',')}
                />

                <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <div className="text-lg font-medium text-gray-600">
                        Drag and drop your files or click to browse
                    </div>
                    <p className="text-sm text-gray-500">
                        Maximum {maxFiles} file{maxFiles > 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                    {selectedFiles.map((file) => (
                        <div key={file.name} className="bg-gray-100 hover:bg-cyan-50 transition-all rounded-lg p-4 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                    <span>
                                        {getFileIcon(getFileType(file))}
                                    </span>
                                    <div>
                                        <p className="text-sm line-clamp-1 font-medium text-gray-700">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                {uploadStatus[file.name] !== 'completed' && (
                                    <button
                                        onClick={() => handleRemoveFile(file.name)}
                                        className="text-gray-500 p-2 hover:text-white hover:bg-black"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}

                            </div>

                            <div className="relative pt-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`text-xs font-semibold ${uploadStatus[file.name] === 'completed'
                                            ? 'text-green-600'
                                            : uploadStatus[file.name] === 'error'
                                                ? 'text-red-600'
                                                : uploadStatus[file.name] === 'processing'
                                                    ? 'text-orange-600'
                                                    : 'text-blue-600'
                                            }`}
                                    >
                                        {uploadStatus[file.name] === 'processing' ? 'Processing...'
                                            : uploadStatus[file.name] === 'error' ? 'Failed'
                                                : uploadStatus[file.name] === 'completed' ? 'Completed' : `${uploadProgress[file.name]}%`}
                                    </span>
                                </div>
                                <div className="h-2 relative rounded-full overflow-hidden bg-gray-200">
                                    <div
                                        className={`h-full transition-all duration-300 rounded-full ${uploadStatus[file.name] === 'completed'
                                            ? 'bg-green-500'
                                            : uploadStatus[file.name] === 'error'
                                                ? 'bg-red-500'
                                                : uploadStatus[file.name] === 'processing'
                                                    ? 'bg-orange-500'
                                                    : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${uploadProgress[file.name]}%` }}
                                    />
                                </div>
                            </div>
                            {uploadStatus[file.name] === 'idle' && (
                                <button
                                    onClick={() => handleUpload(file)}
                                    className="mt-2 px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                                >
                                    Upload
                                </button>
                            )}
                            {uploadStatus[file.name] === 'error' && (
                                <button
                                    onClick={() => handleUpload(file)}
                                    className="mt-2 px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
                                >
                                    Retry
                                </button>
                            )}
                            {uploadStatus[file.name] === 'completed' && (
                                <button
                                    onClick={() => handleOpenFile(file.name)}
                                    className="mt-2 px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600">
                                    Open
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Templates Section */}
            {showTemplates && templates.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Templates</h3>
                    <div className="space-y-2">
                        {templates.map((template, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                    {getFileIcon(template.fileType)}
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{template.fileName}</p>
                                        {template.description && (
                                            <p className="text-xs text-gray-500">{template.description}</p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            {(template.fileSize / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(template.downloadUrl, '_blank')}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                                    disabled={!template.downloadUrl}
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="mt-4">
                {Object.entries(errors).map(([fileName, error]) => (
                    <div key={fileName} className="mt-4 p-3 rounded-md bg-red-50 text-red-500 font-Rubik text-sm">
                        {fileName}: {error}
                    </div>
                ))}
            </div>;
        </div>
    );
};

export default AdvancedUploader;