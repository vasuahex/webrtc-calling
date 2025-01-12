import { Request, Response } from 'express';
import { uploadService, ChunkMetadata } from '../services/uploadservice';
import jwt from "jsonwebtoken";
import { Readable } from 'stream';

class UploadController {
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
    async streamVideo(req: Request, res: Response) {
        try {
            const { key } = req.params;
            let range = req.headers.range;
            console.log(range, key, req.headers);

            if (!range) {
                return res.status(400).json({ error: 'Range header is required' });
            }
            if (!range || !/^bytes=\d*-\d*$/.test(range)) {
                return res.status(400).json({ error: 'Range header must be in the format "bytes=start-end"' });
            }


            // Fetch chunk data
            const { Body, ContentType, ContentRange } = await uploadService.getObjectChunk(key, range);

            if (!Body) {
                return res.status(404).json({ error: 'File not found' });
            }

            range = range.replace(/bytes=/, '');
            const [start, end] = range.split('-').map((val) => (val ? parseInt(val, 10) : undefined));
            if (start === undefined || end === undefined) {
                return res.status(400).json({ error: 'Range must specify at least a start or end value' });
            }
            const total = ContentRange?.split('/')[1] || 0;
            const chunkSize = end - start + 1;

            // const chunkEnd = end ?? contentLength - 1;

            const headers = {
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': ContentType || 'application/octet-stream',
            };
            console.log(headers);

            res.writeHead(206, headers);

            if (Body instanceof Readable) {
                console.log(`inside`);

                // Stream using Node.js Readable stream
                Body.pipe(res);
            } else if (Body instanceof ReadableStream) {
                // Stream using Web Stream API
                const reader = Body.getReader();
                const writable = res;

                const pump = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        writable.write(value);
                    }
                    writable.end();
                };

                pump().catch((err) => {
                    console.error('Error streaming video:', err);
                    res.status(500).end();
                });
            } else {
                throw new Error('Unsupported stream type.');
            }
        } catch (error) {
            console.error('Error streaming video:', error);
            res.status(500).json({ error: 'Failed to stream video' });
        }
    }

    generateStreamToken(req: Request, res: Response) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).json({ error: 'Video key is required' });
            }

            // Generate a short-lived token (e.g., 1 hour)
            const token = jwt.sign({ key }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });

            res.json({ token });
        } catch (error) {
            console.error('Error generating stream token:', error);
            res.status(500).json({ error: 'Failed to generate stream token' });
        }
    }

    validateStreamToken(req: Request, res: Response, next: Function) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { key: string };

            if (decoded.key !== req.params.key) {
                return res.status(403).json({ error: 'Invalid token for this video' });
            }

            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
}

export default new UploadController();

