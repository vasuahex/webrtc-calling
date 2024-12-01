import { Request, Response } from 'express';
import { uploadService, ChunkMetadata } from '../services/uploadservice';

export class UploadController {
    async initiateUpload(req: Request, res: Response) {
        try {
            const { fileName, mimeType } = req.body;

            if (!fileName || !mimeType) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            const { uploadId, key } = await uploadService.initiateMultipartUpload(fileName, mimeType);
            res.json({ uploadId, key });
        } catch (error) {
            console.error('Error initiating upload:', error);
            res.status(500).json({ error: 'Failed to initiate upload' });
        }
    }

    async uploadChunk(req: Request, res: Response) {
        const { uploadId } = req.params;
        try {
            const { key, metadata: metadataRaw } = req.body;
            const chunkBuffer = req.file?.buffer;

            if (!uploadId || !key || !metadataRaw || !chunkBuffer) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }
            const metadata: ChunkMetadata = JSON.parse(metadataRaw);
            const { ETag, PartNumber, progress } = await uploadService.uploadChunk(uploadId, key, chunkBuffer, metadata);
            res.json({ ETag, PartNumber, progress });
        } catch (error) {
            res.status(500).json({ error: 'Failed to upload chunk', uploadId });
        }
    }

    async completeUpload(req: Request, res: Response) {
        try {
            const { uploadId } = req.params;
            const { key, parts } = req.body;

            if (!uploadId || !key || !parts) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            const location = await uploadService.completeMultipartUpload(uploadId, key, parts);
            res.json({ location });
        } catch (error) {
            res.status(500).json({ error: 'Failed to complete upload' });
        }
    }

    async abortUpload(req: Request, res: Response) {
        try {
            const { uploadId } = req.params;
            const { key } = req.body;

            if (!uploadId || !key) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            await uploadService.abortMultipartUpload(uploadId, key);
            res.json({ message: 'Upload aborted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to abort upload' });
        }
    }
}