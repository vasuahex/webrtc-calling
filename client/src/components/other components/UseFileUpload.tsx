import { useState } from 'react';
import { UploadResponse, CompleteUploadResponse } from '../../routes/FileUpload';
import apiClient from '../../reuse/apiClient';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for better performance

const useFileUpload = () => {
    const [fileProps, setFileProps] = useState<{ [key: string]: { uploadId: string | null; url: string | null; fileKey: string | null } }>({});
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'idle' | 'uploading' | 'processing' | 'completed' | 'error' }>({});
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [lastUploadedChunk, setLastUploadedChunk] = useState<{ [key: string]: number }>({});

    const handleUpload = async (file: File) => {
        try {
            let uploadId = fileProps[file.name]?.uploadId;
            let key = fileProps[file.name]?.fileKey as string;
            let parts: { PartNumber: number; ETag: string }[] = [];
            let startChunk = lastUploadedChunk[file.name] || 0;
            setUploadStatus(prev => ({ ...prev, [file.name]: 'processing' }));

            if (!uploadId) {
                // Initiate new upload if there's no existing upload ID
                const { data: initiateResponse }: { data: UploadResponse } = await apiClient.post('/stream/initiate', {
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                });
                console.log('Initiate response:', initiateResponse);
                uploadId = initiateResponse.uploadId;
                key = initiateResponse.key;
                setFileProps(prev => ({ ...prev, [file.name]: { uploadId, url: null, fileKey: key } }));
            } else {
                // If resuming, fetch the list of already uploaded parts
                const { data: uploadedParts } = await apiClient.get(`/stream/parts/upload/${uploadId}?key=${key}`);
                parts = uploadedParts.parts || [];
                startChunk = Math.max(...parts.map(part => part.PartNumber), 0);
            }

            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
            console.log(`Uploading uploadId: ${uploadId}, key: ${key}`);

            for (let chunkNumber = startChunk; chunkNumber < totalChunks; chunkNumber++) {
                // Skip if this part has already been uploaded
                if (parts.some(part => part.PartNumber === chunkNumber + 1)) {
                    continue;
                }

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
                try {
                    const { data: chunkResponse }: { data: { PartNumber: number; ETag: string } } = await apiClient.post(`/stream/chunk/upload/${uploadId}`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        onUploadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const chunkProgress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                                const overallProgress = Math.round(((chunkNumber + chunkProgress / 100) / totalChunks) * 100);
                                setUploadProgress((prev) => ({ ...prev, [file.name]: overallProgress }));
                            }
                        },
                    });
                    parts.push({ PartNumber: chunkResponse.PartNumber, ETag: chunkResponse.ETag });
                    setLastUploadedChunk(prev => ({ ...prev, [file.name]: chunkNumber + 1 }));
                } catch (error: any) {
                    console.error(`Error uploading chunk ${chunkNumber + 1}:`, error);
                    setErrors(prev => ({ ...prev, [file.name]: `Failed to upload chunk ${chunkNumber + 1}: ${error.message}` }));
                    setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
                    return; // Exit the function, allowing for retry later
                }
            }

            // Complete upload           
            try {
                const { data: completeResponse }: { data: CompleteUploadResponse } = await apiClient.post(`/stream/complete/upload/${uploadId}`, { key, parts });
                setFileProps(prev => ({ ...prev, [file.name]: { uploadId, fileKey: key, url: completeResponse.location } }));
                setUploadStatus(prev => ({ ...prev, [file.name]: 'completed' }));
                setLastUploadedChunk(prev => ({ ...prev, [file.name]: 0 })); // Reset last uploaded chunk
            } catch (error: any) {
                console.error('Error completing upload:', error);
                setErrors(prev => ({ ...prev, [file.name]: `Failed to complete upload: ${error.message}` }));
                setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            setErrors(prev => ({ ...prev, [file.name]: `Upload failed: ${error.message}` }));
            setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        }
    };

    const abortUpload = async (fileName: string) => {
        try {
            const uploadId = fileProps[fileName]?.uploadId;
            const fileKey = fileProps[fileName]?.fileKey;

            if (uploadId && fileKey) {
                await apiClient.post(`/stream/abort/upload/${uploadId}`, { key: fileKey });
            }
            setLastUploadedChunk(prev => ({ ...prev, [fileName]: 0 }));
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
        } catch (error: any) {
            console.error('Abort failed:', error);
            setErrors(prev => ({ ...prev, [fileName]: `Failed to abort upload: ${error.message}` }));
            setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
        }
    };

    return {
        handleUpload, abortUpload, setUploadProgress,
        uploadProgress, uploadStatus, errors, setErrors,
        fileProps, setUploadStatus
    };
};

export default useFileUpload;

