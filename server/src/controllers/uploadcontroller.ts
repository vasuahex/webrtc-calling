import { Request, Response } from 'express';
import { uploadService, ChunkMetadata } from '../services/uploadservice';
import jwt from "jsonwebtoken";
import { Readable } from 'stream';
import XlsxPopulate from 'xlsx-populate';

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
            const { ETag, PartNumber } = await uploadService.uploadChunk(uploadId, key, chunkBuffer, metadata);
            res.json({ ETag, PartNumber });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to upload chunk', uploadId, message: error.message });
        }
    }
    async getPartsByKey(req: Request, res: Response) {
        const { uploadId } = req.params;
        const { key } = req.query;

        if (!key) {
            return res.status(400).json({ error: 'Missing key parameter' });
        }

        try {
            const parts = await uploadService.getUploadedParts(uploadId, key as string)
            res.json({ parts });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to list parts', uploadId, message: error.message });
        }
    }

    async completeUpload(req: Request, res: Response) {
        try {
            const { uploadId } = req.params;
            const { key, parts } = req.body;

            if (!uploadId || !key || !parts) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }
            await uploadService.completeMultipartUpload(uploadId, key, parts);
            const fileURL = await uploadService.getFileUrlFromS3(key);
            res.json({ location: fileURL });
        } catch (error) {
            res.status(500).json({ error: 'Failed to complete upload' });
        }
    }

    async abortUpload(req: Request, res: Response) {
        try {
            const { uploadId } = req.params;
            const { key } = req.body;
            console.log("sdfdsfdsfd", uploadId, key);

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
    downloadExcel(req: Request, res: Response, next: Function) {
        try {
            const password = req.params.password
            async function createPasswordProtectedExcel(password: string) {
                try {
                    console.log('Creating a new workbook...');
                    const workbook = await XlsxPopulate.fromBlankAsync();

                    console.log('Adding data to the workbook...');
                    const sheet = workbook.sheet(0);
                    sheet.cell("A1").value("Hello");
                    sheet.cell("B1").value("World");
                    sheet.cell("A2").value(123);
                    sheet.cell("B2").value(456);

                    console.log('Setting password protection...');
                    await workbook.toFileAsync("./protected-file.xlsx", { password: password });

                    console.log('Excel file created successfully!');
                    console.log('File saved as: protected-file.xlsx');
                    console.log('Password:', password);
                } catch (error) {
                    console.error('Error creating Excel file:', error);
                }
            }

            // Create a password-protected Excel file
            // const password = "mySecretPassword123";
            createPasswordProtectedExcel(password);
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
}

export default new UploadController();

