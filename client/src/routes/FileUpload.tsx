import React, { useState } from 'react'
import axios from 'axios';
import VideoUploader, { FileConfig, UploadStatus } from '../components/other components/VideoUploader'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
export interface UploadResponse {
    uploadId: string;
    key: string;
}

export interface ChunkResponse {
    ETag: string;
    PartNumber: number;
}

export interface CompleteUploadResponse {
    location: string;
}

export interface UploadProgressResponse {
    uploadId: string;
    fileName: string;
    completedChunks: number;
    totalChunks: number;
    status: 'in-progress' | 'completed' | 'failed';
}

export interface ChunkMetadata {
    chunkNumber: number;
    totalChunks: number;
    fileSize: number;
    originalFileName: string;
    mimeType: string;
}


const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});



// apiClient.interceptors.request.use(
//     (config) => {
//       const token = localStorage.getItem('token');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       return config;
//     },
//     (error) => {
//       return Promise.reject(error);
//     }
//   );


interface FileUploadProps {
    uploadId: string | null; // Upload ID for tracking, can be null
    url: string | null;
}
const FileUpload = () => {
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: UploadStatus }>({});
    const [fileProps, setFileProps] = useState<{ [key: string]: FileUploadProps }>({});

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
            setFileProps(prev => ({ ...prev, [file.name]: { uploadId, url: null } }));

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
            setFileProps(prev => ({ ...prev, [file.name]: { uploadId, url: completeResponse.location } }));
        } catch (error: any) {
            console.error('Upload failed:', error);
            if (error.response?.status === 400) {
                const uploadId = error.response.data?.uploadId;
                if (uploadId) {
                    await abortUpload(uploadId);
                }
            }
        }
    };

    const abortUpload = async (fileName: string) => {
        try {
            const uploadId = fileProps[fileName]?.uploadId;
            if (uploadId) {
                await apiClient.post(`/abort/${uploadId}`);
            }
        } catch (error) {
            console.error('Abort failed:', error);
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
            <VideoUploader uploadProgress={uploadProgress} setUploadProgress={setUploadProgress}
                setUploadStatus={setUploadStatus} uploadStatus={uploadStatus} onAbort={abortUpload}
                onUpload={handleUpload} maxFiles={10} allowedTypes={allowedTypes} handleOpenFile={handleOpenFile} />
        </div>
    )
}

export default React.memo(FileUpload)

