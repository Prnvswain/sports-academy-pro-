import multer from 'multer';
import path from 'path';

// Use memory storage to keep files in buffer for ImageKit upload
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow CSV files for imports
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    }
    // Allow image files for payment proofs
    else if (
      file.mimetype.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)
    ) {
      cb(null, true);
    }
    // Allow PDF files for payment proofs
    else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, image, and PDF files are allowed'), false);
    }
  },
});

export { upload };
