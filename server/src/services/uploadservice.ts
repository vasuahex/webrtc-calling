import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    DeleteObjectCommand,
    ListPartsCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto"
import fs from "fs"

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
    checksum: string
}

export interface UploadProgress {
    uploadId: string;
    fileName: string;
    completedChunks: number;
    totalChunks: number;
    status: 'in-progress' | 'completed' | 'failed';
}

function calculateChunkChecksum(chunkBuffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(chunkBuffer);
    return hash.digest('hex');
}

// Function to calculate the checksum of the entire file
async function calculateFileChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
        fileStream.on('data', (chunk) => hash.update(chunk));
        fileStream.on('end', () => resolve(hash.digest('hex')));
        fileStream.on('error', (err) => reject(err));
    });
}


class UploadService {

    async initiateMultipartUpload(fileName: string, mimeType: string): Promise<{ uploadId: string; key: string }> {
        const key = `videos/${Date.now()}-${fileName}`;
        const command = new CreateMultipartUploadCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            ContentType: mimeType,
        });

        const { UploadId } = await s3Client.send(command);
        if (!UploadId) throw new Error('Failed to initiate multipart upload');
        return { uploadId: UploadId, key };
    }
    async getUploadedParts(uploadId: string, key: string) {
        const command = new ListPartsCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
        });
        const response = await s3Client.send(command);

        const parts = response.Parts?.map(part => ({
            PartNumber: part.PartNumber,
            ETag: part.ETag,
        })) || [];
        return parts
    }

    async uploadChunk(uploadId: string, key: string, chunkBuffer: Buffer, metadata: ChunkMetadata)
        : Promise<{ ETag: string; PartNumber: number, Checksum: string }> {
        const checksum = calculateChunkChecksum(chunkBuffer);

        const command = new UploadPartCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            PartNumber: metadata.chunkNumber,
            UploadId: uploadId,
            Body: chunkBuffer,
        });

        const response = await s3Client.send(command);
        if (!response.ETag) throw new Error('Failed to upload chunk');



        return {
            ETag: response.ETag,
            PartNumber: metadata.chunkNumber,
            Checksum: checksum
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
