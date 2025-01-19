import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT as string,
    credentials: {
        accessKeyId: process.env.S3_TOKEN_ID as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
        // accountId: process.env.S3_ACCOUNT_ID as string
    }
});

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export interface ChunkMetadata {
    chunkNumber: number;
    totalChunks: number;
    fileSize: number;
    originalFileName: string;
    mimeType: string;
}

export interface UploadProgress {
    uploadId: string;
    fileName: string;
    completedChunks: number;
    totalChunks: number;
    status: 'in-progress' | 'completed' | 'failed';
}

class UploadService {
    private uploadProgress: Map<string, UploadProgress> = new Map();

    async initiateMultipartUpload(fileName: string, mimeType: string): Promise<{ uploadId: string; key: string }> {
        const key = `videos/${Date.now()}-${fileName}`;
        const command = new CreateMultipartUploadCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            ContentType: mimeType,
        });

        const { UploadId } = await s3Client.send(command);
        if (!UploadId) throw new Error('Failed to initiate multipart upload');

        this.uploadProgress.set(UploadId, {
            uploadId: UploadId,
            fileName,
            completedChunks: 0,
            totalChunks: 0,
            status: 'in-progress'
        });

        return { uploadId: UploadId, key };
    }

    async uploadChunk(uploadId: string, key: string, chunkBuffer: Buffer, metadata: ChunkMetadata)
        : Promise<{ ETag: string; PartNumber: number; progress: UploadProgress }> {
        const command = new UploadPartCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            PartNumber: metadata.chunkNumber,
            UploadId: uploadId,
            Body: chunkBuffer
        });

        const response = await s3Client.send(command);
        if (!response.ETag) throw new Error('Failed to upload chunk');

        const progress = this.uploadProgress.get(uploadId);
        if (progress) {
            progress.completedChunks += 1;
            progress.totalChunks = metadata.totalChunks;
            this.uploadProgress.set(uploadId, progress);
        }

        return {
            ETag: response.ETag,
            PartNumber: metadata.chunkNumber,
            progress: progress!
        };
    }

    async completeMultipartUpload(uploadId: string, key: string, parts: { ETag: string; PartNumber: number }[])
        : Promise<string> {
        const command = new CompleteMultipartUploadCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) }
        });

        const response = await s3Client.send(command);
        const progress = this.uploadProgress.get(uploadId);
        if (progress) {
            progress.status = 'completed';
            this.uploadProgress.set(uploadId, progress);
        }

        return response.Location || '';
    }
    async getFileUrlFromS3(key: string) {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
        return url;
    };
    async deleteFileFromS3(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: key,
        });
        await s3Client.send(command);
    };
    async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
        const command = new AbortMultipartUploadCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            UploadId: uploadId
        });

        await s3Client.send(command);
        const progress = this.uploadProgress.get(uploadId);
        if (progress) {
            progress.status = 'failed';
            this.uploadProgress.set(uploadId, progress);
        }
    }

    async getStreamVideo(key: string, range: string) {
        const headCommand = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: `videos/${key}`,
            Range: 'bytes=0-0'
        });

        const metadata = await s3Client.send(headCommand);
        const contentLength = Number(metadata.ContentLength);
        const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks
        const start = Number(range.replace(/\D/g, ''));
        const end = Math.min(start + CHUNK_SIZE, contentLength - 1);

        // Create command for range request
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: `videos/${key}`,
            Range: `bytes=${start}-${end}`
        });

        // Stream the chunk
        const { Body } = await s3Client.send(command);
        if (!Body) {
            throw new Error('No body returned from S3');
        }

        const headers = {
            'Content-Range': `bytes ${start}-${end}/${contentLength}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': metadata.ContentType,
        };

    }
    readableToReadableStream(nodeReadable: Readable): ReadableStream {
        return new ReadableStream({
            start(controller) {
                nodeReadable.on("data", (chunk) => controller.enqueue(chunk));
                nodeReadable.on("end", () => controller.close());
                nodeReadable.on("error", (err) => controller.error(err));
            },
        });
    }


    async getObjectChunk(key: string, range: string): Promise<{ Body?: ReadableStream | undefined; ContentType?: string | undefined, ContentRange: string | undefined }> {
        const fileKey = `videos/${key}`;
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileKey,
            Range: range
        });
        const response: GetObjectCommandOutput = await s3Client.send(command);

        const nodeReadable = response.Body as Readable;
        const browserReadableStream = nodeReadable
            ? this.readableToReadableStream(nodeReadable)
            : undefined;

        return {
            Body: browserReadableStream,
            ContentType: response.ContentType,
            ContentRange: response.ContentRange,
        };
    }

}

export const uploadService = new UploadService();
