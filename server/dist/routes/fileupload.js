"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uploadcontroller_1 = __importDefault(require("../controllers/uploadcontroller"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/initiate', uploadcontroller_1.default.initiateUpload);
router.post('/chunk/:uploadId', upload.single('chunk'), uploadcontroller_1.default.uploadChunk);
router.post('/complete/:uploadId', uploadcontroller_1.default.completeUpload);
router.post('/abort/:uploadId', uploadcontroller_1.default.abortUpload);
router.get('/parts/:uploadId', uploadcontroller_1.default.getPartsByKey);
router.get('/token/:key', uploadcontroller_1.default.generateStreamToken);
router.get('/play/:key', uploadcontroller_1.default.streamVideo);
router.get('/downloadfile/:password', uploadcontroller_1.default.downloadExcel);
exports.default = router;
