import React, { useState } from 'react'
import VideoUploader, { FileConfig, UploadStatus } from '../components/other components/VideoUploader'
import apiClient from '../reuse/apiClient';

export const CHUNK_SIZE = 1 * 1024 * 1024; // 5 MB
export interface UploadResponse {
    uploadId: string;
    key: string;
}

// export interface ChunkResponse {
//     ETag: string;
//     PartNumber: number;
// }

export interface CompleteUploadResponse {
    location: string;
}

// export interface UploadProgressResponse {
//     uploadId: string;
//     fileName: string;
//     completedChunks: number;
//     totalChunks: number;
//     status: 'in-progress' | 'completed' | 'failed';
// }

// export interface ChunkMetadata {
//     chunkNumber: number;
//     totalChunks: number;
//     fileSize: number;
//     originalFileName: string;
//     mimeType: string;
// }


interface FileUploadProps {
    uploadId: string | null; // Upload ID for tracking, can be null
    url: string | null;
    fileKey: string
}
const FileUpload = () => {
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: UploadStatus }>({});
    const [fileProps, setFileProps] = useState<{ [key: string]: FileUploadProps }>({});
    const [errors, setErrors] = useState<{ [fileName: string]: string }>({});

    const allowedTypes: FileConfig[] = [
        {
            type: 'image',
            maxSize: 50,
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif']
        },
        {
            type: 'video',
            maxSize: 500,
            allowedExtensions: ['.mp4', '.avi', '.mov']
        },
    ];
    const handleUpload = async (file: File) => {
        // Make API call to S3 upload endpoint
        try {
            const { data: initiateResponse }: { data: UploadResponse } = await apiClient.post('/initiate', {
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
            });
            const uploadId = initiateResponse.uploadId;
            const key = initiateResponse.key;
            setFileProps(prev => ({ ...prev, [file.name]: { uploadId, url: null, fileKey: key } }));

            const parts: { PartNumber: number; ETag: string }[] = [];
            // Step 2: Split file into chunks and upload each chunk
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
                const start = chunkNumber * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('key', key);
                formData.append('metadata',
                    JSON.stringify({
                        chunkNumber: chunkNumber + 1,
                        totalChunks,
                        fileSize: file.size,
                        originalFileName: file.name,
                        mimeType: file.type,
                    })
                );

                const { data: chunkResponse }: { data: { PartNumber: number; ETag: string } } = await apiClient.post(`/chunk/${uploadId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        // totalChunks
                        if (progressEvent.total) {
                            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                            setUploadProgress((prev) => ({ ...prev, [file.name]: Math.round(((chunkNumber + progress / 100) / totalChunks) * 100), }));
                        }
                    },
                });
                parts.push({ PartNumber: chunkResponse.PartNumber, ETag: chunkResponse.ETag });
            }
            setUploadStatus(prev => ({ ...prev, [file.name]: 'processing' }));

            // Step 3: Complete upload           
            const { data: completeResponse }: { data: CompleteUploadResponse } = await apiClient.post(`/complete/${uploadId}`, { key, parts });
            setFileProps(prev => ({ ...prev, [file.name]: { uploadId, fileKey: key, url: completeResponse.location } }));
            setUploadStatus(prev => ({ ...prev, [file.name]: 'completed' }));
        } catch (error: any) {
            console.log(error);

            if (error.response?.status === 400) {
                const uploadId = error.response.data?.uploadId;
                if (uploadId) {
                    await abortUpload(uploadId);
                }
            }
            setErrors(prev => ({ ...prev, [file.name]: 'Upload failed. Please try again.' }));
            setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));

        }
    };

    const abortUpload = async (fileName: string) => {
        try {
            const uploadId = fileProps[fileName]?.uploadId;
            const fileKey = fileProps[fileName]?.fileKey;

            if (uploadId) {
                await apiClient.post(`/abort/${uploadId}`, { key: fileKey });
            }
        } catch (error) {
            console.error('Abort failed:', error);
            setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));

        }
    }
    const handleOpenFile = (fileName: string) => {
        const url = fileProps[fileName]?.url;
        if (url) {
            window.open(url, '_blank');
        }

    }

    return (
        <div className='bg-black/80 min-h-screen'>
            <VideoUploader uploadProgress={uploadProgress} setUploadProgress={setUploadProgress} setErrors={setErrors}
                setUploadStatus={setUploadStatus} uploadStatus={uploadStatus} onAbort={abortUpload} errors={errors}
                onUpload={handleUpload} maxFiles={10} allowedTypes={allowedTypes} handleOpenFile={handleOpenFile} />
        </div>
    )
}

export default React.memo(FileUpload)

