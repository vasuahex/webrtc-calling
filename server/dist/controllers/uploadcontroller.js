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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const uploadservice_1 = require("../services/uploadservice");
class UploadController {
    initiateUpload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { fileName, mimeType } = req.body;
                if (!fileName || !mimeType) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                const { uploadId, key } = yield uploadservice_1.uploadService.initiateMultipartUpload(fileName, mimeType);
                res.json({ uploadId, key });
            }
            catch (error) {
                console.error('Error initiating upload:', error);
                res.status(500).json({ error: 'Failed to initiate upload' });
            }
        });
    }
    uploadChunk(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { uploadId } = req.params;
            try {
                const { key, metadata: metadataRaw } = req.body;
                const chunkBuffer = (_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer;
                if (!uploadId || !key || !metadataRaw || !chunkBuffer) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                const metadata = JSON.parse(metadataRaw);
                const { ETag, PartNumber, progress } = yield uploadservice_1.uploadService.uploadChunk(uploadId, key, chunkBuffer, metadata);
                res.json({ ETag, PartNumber, progress });
            }
            catch (error) {
                console.error('Error uploading chunk:', error);
                res.status(500).json({ error: 'Failed to upload chunk', uploadId });
            }
        });
    }
    completeUpload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { uploadId } = req.params;
                const { key, parts } = req.body;
                if (!uploadId || !key || !parts) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                const location = yield uploadservice_1.uploadService.completeMultipartUpload(uploadId, key, parts);
                res.json({ location });
            }
            catch (error) {
                console.error('Error completing upload:', error);
                res.status(500).json({ error: 'Failed to complete upload' });
            }
        });
    }
    abortUpload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { uploadId } = req.params;
                const { key } = req.body;
                if (!uploadId || !key) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                yield uploadservice_1.uploadService.abortMultipartUpload(uploadId, key);
                res.json({ message: 'Upload aborted successfully' });
            }
            catch (error) {
                console.error('Error aborting upload:', error);
                res.status(500).json({ error: 'Failed to abort upload' });
            }
        });
    }
}
exports.UploadController = UploadController;
