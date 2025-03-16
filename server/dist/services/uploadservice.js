"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadService = exports.S3_BUCKET_NAME = exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
exports.s3Client = new client_s3_1.S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_TOKEN_ID,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});
exports.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
function calculateChunkChecksum(chunkBuffer) {
    const hash = crypto_1.default.createHash('sha256');
    hash.update(chunkBuffer);
    return hash.digest('hex');
}
function calculateFileChecksum(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const hash = crypto_1.default.createHash('sha256');
        const fileStream = fs_1.default.createReadStream(filePath);
        return new Promise((resolve, reject) => {
            fileStream.on('data', (chunk) => hash.update(chunk));
            fileStream.on('end', () => resolve(hash.digest('hex')));
            fileStream.on('error', (err) => reject(err));
        });
    });
}
class UploadService {
    initiateMultipartUpload(fileName, mimeType) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `videos/${Date.now()}-${fileName}`;
            const command = new client_s3_1.CreateMultipartUploadCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: key,
                ContentType: mimeType,
            });
            const { UploadId } = yield exports.s3Client.send(command);
            if (!UploadId)
                throw new Error('Failed to initiate multipart upload');
            return { uploadId: UploadId, key };
        });
    }
    getUploadedParts(uploadId, key) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const command = new client_s3_1.ListPartsCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
            });
            const response = yield exports.s3Client.send(command);
            const parts = ((_a = response.Parts) === null || _a === void 0 ? void 0 : _a.map(part => ({
                PartNumber: part.PartNumber,
                ETag: part.ETag,
            }))) || [];
            return parts;
        });
    }
    uploadChunk(uploadId, key, chunkBuffer, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const checksum = calculateChunkChecksum(chunkBuffer);
            const command = new client_s3_1.UploadPartCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: key,
                PartNumber: metadata.chunkNumber,
                UploadId: uploadId,
                Body: chunkBuffer,
            });
            const response = yield exports.s3Client.send(command);
            if (!response.ETag)
                throw new Error('Failed to upload chunk');
            return {
                ETag: response.ETag,
                PartNumber: metadata.chunkNumber,
                Checksum: checksum
            };
        });
    }
    completeMultipartUpload(uploadId, key, parts) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.CompleteMultipartUploadCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) }
            });
            const response = yield exports.s3Client.send(command);
            return response.Location || '';
        });
    }
    getFileUrlFromS3(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: key,
            });
            const url = yield (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn: 3600 });
            return url;
        });
    }
    ;
    deleteFileFromS3(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
            });
            yield exports.s3Client.send(command);
        });
    }
    ;
    abortMultipartUpload(uploadId, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.AbortMultipartUploadCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: key,
                UploadId: uploadId
            });
            yield exports.s3Client.send(command);
        });
    }
    getStreamVideo(key, range) {
        return __awaiter(this, void 0, void 0, function* () {
            const headCommand = new client_s3_1.GetObjectCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: `videos/${key}`,
                Range: 'bytes=0-0'
            });
            const metadata = yield exports.s3Client.send(headCommand);
            const contentLength = Number(metadata.ContentLength);
            const CHUNK_SIZE = 1 * 1024 * 1024;
            const start = Number(range.replace(/\D/g, ''));
            const end = Math.min(start + CHUNK_SIZE, contentLength - 1);
            const command = new client_s3_1.GetObjectCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: `videos/${key}`,
                Range: `bytes=${start}-${end}`
            });
            const { Body } = yield exports.s3Client.send(command);
            if (!Body) {
                throw new Error('No body returned from S3');
            }
            const headers = {
                'Content-Range': `bytes ${start}-${end}/${contentLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': metadata.ContentType,
            };
        });
    }
    readableToReadableStream(nodeReadable) {
        return new ReadableStream({
            start(controller) {
                nodeReadable.on("data", (chunk) => controller.enqueue(chunk));
                nodeReadable.on("end", () => controller.close());
                nodeReadable.on("error", (err) => controller.error(err));
            },
        });
    }
    getObjectChunk(key, range) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileKey = `videos/${key}`;
            const command = new client_s3_1.GetObjectCommand({
                Bucket: exports.S3_BUCKET_NAME,
                Key: fileKey,
                Range: range
            });
            const response = yield exports.s3Client.send(command);
            const nodeReadable = response.Body;
            const browserReadableStream = nodeReadable
                ? this.readableToReadableStream(nodeReadable)
                : undefined;
            return {
                Body: browserReadableStream,
                ContentType: response.ContentType,
                ContentRange: response.ContentRange,
            };
        });
    }
}
exports.uploadService = new UploadService();
