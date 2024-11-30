import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/uploadcontroller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadController = new UploadController();

router.post('/initiate', uploadController.initiateUpload);
router.post('/chunk/:uploadId', upload.single('chunk'), uploadController.uploadChunk);
router.post('/complete/:uploadId', uploadController.completeUpload);
router.post('/abort/:uploadId', uploadController.abortUpload);

export default router;