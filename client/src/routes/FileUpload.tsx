import React, { useState } from 'react'
import VideoUploader, { FileConfig } from '../components/other components/VideoUploader'
import useFileUpload from "../components/other components/UseFileUpload"
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
export interface UploadResponse {
    uploadId: string;
    key: string;
}

export interface CompleteUploadResponse {
    location: string;
}

const FileUpload = () => {
    const { handleUpload, abortUpload, uploadProgress, setUploadProgress,
        uploadStatus, errors, setErrors, fileProps, setUploadStatus } = useFileUpload();

    const allowedTypes: FileConfig[] = [
        {
            type: 'image',
            maxSize: 50,
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif']
        },
        {
            type: 'video',
            maxSize: 2000, // Increased to 2GB
            allowedExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
        },
    ];

    const handleOpenFile = (fileName: string) => {
        const url = fileProps[fileName]?.url;
        if (url) {
            window.open(url, '_blank');
        }
    }

    return (
        <div className='bg-black/80 min-h-screen'>
            <VideoUploader
                uploadProgress={uploadProgress}
                uploadStatus={uploadStatus}
                setUploadStatus={setUploadStatus}
                onAbort={abortUpload}
                errors={errors}
                setErrors={setErrors}
                onUpload={handleUpload}
                maxFiles={10}
                setUploadProgress={setUploadProgress}
                allowedTypes={allowedTypes}
                handleOpenFile={handleOpenFile}
                title="Upload Files"
                description="Upload your image or video files here"
            />
        </div>
    )
}

export default React.memo(FileUpload)

