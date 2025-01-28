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
const uploadservice_1 = require("../services/uploadservice");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const stream_1 = require("stream");
const xlsx_populate_1 = __importDefault(require("xlsx-populate"));
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
                res.status(500).json({ error: 'Failed to upload chunk', uploadId, message: error.message });
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
                yield uploadservice_1.uploadService.completeMultipartUpload(uploadId, key, parts);
                const fileURL = yield uploadservice_1.uploadService.getFileUrlFromS3(key);
                res.json({ location: fileURL });
            }
            catch (error) {
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
                res.status(500).json({ error: 'Failed to abort upload' });
            }
        });
    }
    streamVideo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const { Body, ContentType, ContentRange } = yield uploadservice_1.uploadService.getObjectChunk(key, range);
                if (!Body) {
                    return res.status(404).json({ error: 'File not found' });
                }
                range = range.replace(/bytes=/, '');
                const [start, end] = range.split('-').map((val) => (val ? parseInt(val, 10) : undefined));
                if (start === undefined || end === undefined) {
                    return res.status(400).json({ error: 'Range must specify at least a start or end value' });
                }
                const total = (ContentRange === null || ContentRange === void 0 ? void 0 : ContentRange.split('/')[1]) || 0;
                const chunkSize = end - start + 1;
                const headers = {
                    'Content-Range': `bytes ${start}-${end}/${total}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': ContentType || 'application/octet-stream',
                };
                console.log(headers);
                res.writeHead(206, headers);
                if (Body instanceof stream_1.Readable) {
                    console.log(`inside`);
                    Body.pipe(res);
                }
                else if (Body instanceof ReadableStream) {
                    const reader = Body.getReader();
                    const writable = res;
                    const pump = () => __awaiter(this, void 0, void 0, function* () {
                        while (true) {
                            const { done, value } = yield reader.read();
                            if (done)
                                break;
                            writable.write(value);
                        }
                        writable.end();
                    });
                    pump().catch((err) => {
                        console.error('Error streaming video:', err);
                        res.status(500).end();
                    });
                }
                else {
                    throw new Error('Unsupported stream type.');
                }
            }
            catch (error) {
                console.error('Error streaming video:', error);
                res.status(500).json({ error: 'Failed to stream video' });
            }
        });
    }
    generateStreamToken(req, res) {
        try {
            const { key } = req.params;
            if (!key) {
                return res.status(400).json({ error: 'Video key is required' });
            }
            const token = jsonwebtoken_1.default.sign({ key }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
            res.json({ token });
        }
        catch (error) {
            console.error('Error generating stream token:', error);
            res.status(500).json({ error: 'Failed to generate stream token' });
        }
    }
    validateStreamToken(req, res, next) {
        var _a;
        try {
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            if (decoded.key !== req.params.key) {
                return res.status(403).json({ error: 'Invalid token for this video' });
            }
            next();
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
    downloadExcel(req, res, next) {
        try {
            const password = req.params.password;
            function createPasswordProtectedExcel(password) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        console.log('Creating a new workbook...');
                        const workbook = yield xlsx_populate_1.default.fromBlankAsync();
                        console.log('Adding data to the workbook...');
                        const sheet = workbook.sheet(0);
                        sheet.cell("A1").value("Hello");
                        sheet.cell("B1").value("World");
                        sheet.cell("A2").value(123);
                        sheet.cell("B2").value(456);
                        console.log('Setting password protection...');
                        yield workbook.toFileAsync("./protected-file.xlsx", { password: password });
                        console.log('Excel file created successfully!');
                        console.log('File saved as: protected-file.xlsx');
                        console.log('Password:', password);
                    }
                    catch (error) {
                        console.error('Error creating Excel file:', error);
                    }
                });
            }
            createPasswordProtectedExcel(password);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
}
exports.default = new UploadController();
