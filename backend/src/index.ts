import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { Storage } from 'megajs';
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- CẤU HÌNH CƠ SỞ DỮ LIỆU MONGODB ---
const submissionSchema = new mongoose.Schema({
  teacher: { type: String, required: true },
  className: { type: String, required: true },
  fullName: { type: String, required: true },
  stage: { type: String, required: true },
  session: { type: String, required: true },
  attemptNumber: { type: Number, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const SubmissionModel = mongoose.model('Submission', submissionSchema);

let useMongoDB = false;

if (process.env.MONGODB_URI) {
  console.log('[Database]: Đang kết nối tới cơ sở dữ liệu MongoDB Atlas...');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      useMongoDB = true;
      console.log('[Database]: Kết nối cơ sở dữ liệu MongoDB thành công!');
    })
    .catch((err: any) => {
      console.error('[Database Error]: Kết nối MongoDB thất bại! Chi tiết:', err.message);
      console.warn('[Database]: Hệ thống chuyển sang lưu trữ cục bộ (local JSON file fallback).');
    });
} else {
  console.warn('[Database Warning]: Không tìm thấy MONGODB_URI trong file .env.');
  console.warn('[Database]: Hệ thống sẽ lưu trữ cục bộ (local JSON file fallback).');
}

// --- CẤU HÌNH LƯU TRỮ ---
let storageProvider = process.env.STORAGE_PROVIDER || 'local';

// Setup Google Drive
let drive: any = null;
const KEY_FILE_NAME = 'google-drive-key.json';
const KEY_FILE_PATH = path.join(__dirname, '..', KEY_FILE_NAME);
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Setup MEGA
let megaStorage: any = null;
let megaFolder: any = null;
let megaInitPromise: Promise<any> | null = null;

// Tự động phát hiện Storage Provider nếu chưa được chỉ định cụ thể
if (!process.env.STORAGE_PROVIDER) {
  if (process.env.MEGA_EMAIL && process.env.MEGA_EMAIL !== 'YOUR_MEGA_EMAIL_HERE' && process.env.MEGA_PASSWORD && process.env.MEGA_PASSWORD !== 'YOUR_MEGA_PASSWORD_HERE') {
    storageProvider = 'mega';
  } else if (fs.existsSync(KEY_FILE_PATH)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
      if (keyData.client_email && keyData.private_key) {
        storageProvider = 'google-drive';
      }
    } catch (e) {}
  }
}

console.log(`[Storage Provider]: Chế độ lưu trữ hiện tại là "${storageProvider.toUpperCase()}".`);

// Khởi tạo Google Drive
if (storageProvider === 'google-drive') {
  if (fs.existsSync(KEY_FILE_PATH)) {
    try {
      const keyData = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
      if (keyData.client_email && keyData.private_key) {
        const auth = new google.auth.JWT({
          keyFile: KEY_FILE_PATH,
          scopes: SCOPES
        });
        drive = google.drive({ version: 'v3', auth });
        console.log(`[Google Drive]: Xác thực thành công từ tệp tin cấu hình ${KEY_FILE_NAME}.`);
      } else {
        console.warn(`[Google Drive Warning]: Tệp tin "${KEY_FILE_NAME}" trống hoặc chưa điền thông tin cấu hình thật.`);
        console.warn(`[Google Drive]: Hệ thống tự động chuyển sang lưu trữ cục bộ.`);
        storageProvider = 'local';
      }
    } catch (err: any) {
      console.error(`[Google Drive Error]: Lỗi đọc tệp tin key. Chi tiết: ${err.message}`);
      console.warn(`[Google Drive]: Hệ thống tự động chuyển sang lưu trữ cục bộ.`);
      storageProvider = 'local';
    }
  } else {
    console.warn(`[Google Drive Warning]: Không tìm thấy tệp tin cấu hình "${KEY_FILE_NAME}".`);
    console.warn(`[Google Drive]: Hệ thống tự động chuyển sang lưu trữ cục bộ.`);
    storageProvider = 'local';
  }
}

// Khởi tạo MEGA
if (storageProvider === 'mega') {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;
  const folderName = process.env.MEGA_FOLDER_NAME || 'NA MindX Hub';

  if (email && email !== 'YOUR_MEGA_EMAIL_HERE' && password && password !== 'YOUR_MEGA_PASSWORD_HERE') {
    console.log(`[MEGA]: Đang kết nối tới tài khoản ${email}...`);
    megaInitPromise = new Storage({ email, password }).ready
      .then(async (storage) => {
        megaStorage = storage;
        
        const children = storage.root.children || [];
        let folder = children.find(
          (child: any) => child.name === folderName && child.directory
        );
        
        if (!folder) {
          console.log(`[MEGA]: Thư mục "${folderName}" chưa tồn tại. Đang tạo thư mục mới...`);
          folder = await storage.root.mkdir(folderName);
        }
        
        megaFolder = folder;
        console.log(`[MEGA]: Kết nối thành công! Đã chuẩn bị sẵn sàng thư mục "${folderName}".`);
      })
      .catch((err: any) => {
        console.error(`[MEGA Error]: Đăng nhập thất bại. Chi tiết: ${err.message}`);
        console.warn(`[MEGA]: Hệ thống tự động chuyển sang lưu trữ cục bộ.`);
        storageProvider = 'local';
      });
  } else {
    console.warn(`[MEGA Warning]: Chưa cấu hình email/mật khẩu trong file .env hoặc đang sử dụng giá trị mặc định.`);
    console.warn(`[MEGA]: Hệ thống tự động chuyển sang lưu trữ cục bộ.`);
    storageProvider = 'local';
  }
}

// Hàm hỗ trợ tải tệp tin lên Google Drive
async function uploadToGoogleDrive(localFilePath: string, driveFileName: string, mimeType: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!drive) {
    throw new Error('Google Drive client chưa được khởi tạo thành công.');
  }

  const fileMetadata = {
    name: driveFileName,
    parents: folderId && folderId !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE' ? [folderId] : []
  };

  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(localFilePath)
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink'
  });

  if (!response.data.id) {
    throw new Error('Không lấy được ID file từ Google Drive API.');
  }

  return response.data.webViewLink || '';
}

// Utility function to convert Vietnamese unicode characters and sanitize for filenames
function sanitizeForFilename(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid Windows filename characters
    .trim();
}

// Stage abbreviation helper
function getStageAbbreviation(stage: string): string {
  const clean = stage.trim().toLowerCase();
  if (clean.includes('checkpoint 1')) return 'CP1';
  if (clean.includes('checkpoint 2')) return 'CP2';
  if (clean.includes('san pham cuoi khoa')) return 'SPCK';
  return stage;
}

// Session abbreviation helper
function getSessionAbbreviation(session: string): string {
  const clean = session.trim().toLowerCase();
  const match = clean.match(/(\d+)/);
  if (match) {
    return `B${match[1]}`;
  }
  return session;
}

// Multer Storage Configuration
// Lưu tệp tạm thời với tên duy nhất để tránh xung đột
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Middleware - CORS bảo mật
const allowedOrigins = [
  'http://localhost:5173', // Local React frontend
  process.env.FRONTEND_URL  // Deployed React frontend
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Ở môi trường dev, cho phép mọi client kết nối
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Chính sách CORS ngăn chặn truy cập từ nguồn này.'));
    }
  },
  credentials: true
}));

app.use(express.json());

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Backend API is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// Hello API for Frontend connection test
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from NAK Project Backend! connection established successfully.'
  });
});

// File Upload Endpoint
app.post('/api/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files selected for upload.' });
    }

    // Áp dụng mongo-sanitize để tránh NoSQL Injection
    const teacher = sanitize(req.body.teacher || 'N/A').trim();
    const className = sanitize(req.body.className || 'N/A').trim();
    const fullName = sanitize(req.body.fullName || 'N/A').trim();
    const stage = sanitize(req.body.stage || 'N/A').trim();
    const session = sanitize(req.body.session || 'N/A').trim();

    const fileDetails: any[] = [];

    // Tính toán số lần nộp bài (attemptNumber)
    let attemptNumber = 1;
    if (useMongoDB) {
      const count = await SubmissionModel.countDocuments({
        fullName,
        className,
        stage,
        session
      });
      attemptNumber = count + 1;
    } else {
      const submissionsFile = path.join(uploadDir, 'submissions.json');
      if (fs.existsSync(submissionsFile)) {
        try {
          const data = fs.readFileSync(submissionsFile, 'utf8');
          const submissions = JSON.parse(data);
          const count = submissions.filter((s: any) => 
            s.fullName?.trim().toLowerCase() === fullName.toLowerCase() &&
            s.className?.trim().toLowerCase() === className.toLowerCase() &&
            s.stage?.trim().toLowerCase() === stage.toLowerCase() &&
            s.session?.trim().toLowerCase() === session.toLowerCase()
          ).length;
          attemptNumber = count + 1;
        } catch (err) {
          console.error('Error reading submissions file:', err);
        }
      }
    }

    const abbrevStage = getStageAbbreviation(stage);
    const abbrevSession = getSessionAbbreviation(session);

    // Lặp qua từng file để xử lý tải lên
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const localPath = file.path;
      const ext = path.extname(file.originalname);

      // Định dạng tên tệp tin chuẩn hóa trên MEGA/Drive
      const suffix = files.length > 1 ? `_${i + 1}` : '';
      const baseOutputName = `${sanitizeForFilename(fullName)} - ${sanitizeForFilename(className)} - ${sanitizeForFilename(abbrevStage)} - ${sanitizeForFilename(abbrevSession)} - Lan ${attemptNumber}${suffix}`;
      const targetFileName = `${baseOutputName}${ext}`;

      let fileUrl = '';

      if (storageProvider === 'mega') {
        try {
          if (megaInitPromise) {
            await megaInitPromise;
          }
          if (!megaFolder) {
            throw new Error('MEGA client is not initialized or folder is missing.');
          }

          console.log(`[MEGA]: Đang tải lên tệp tin: ${targetFileName}...`);
          const uploadStream = megaFolder.upload({
            name: targetFileName,
            size: file.size
          });

          fs.createReadStream(localPath).pipe(uploadStream);
          const megaFile = await uploadStream.complete;
          fileUrl = await megaFile.link();
          
          console.log(`[MEGA]: Tải lên thành công! Link MEGA: ${fileUrl}`);

          // Xóa file tạm thời trên ổ đĩa local sau khi đã upload lên MEGA thành công
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (err: any) {
          console.error(`[MEGA Error]: Tải lên MEGA thất bại. Lỗi:`, err.message);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          throw err;
        }
      } else if (storageProvider === 'google-drive' && drive) {
        try {
          console.log(`[Google Drive]: Đang tải lên tệp tin: ${targetFileName}...`);
          fileUrl = await uploadToGoogleDrive(localPath, targetFileName, file.mimetype);
          console.log(`[Google Drive]: Tải lên thành công! Link Drive: ${fileUrl}`);

          // Xóa file tạm thời trên ổ đĩa local sau khi đã upload lên Drive thành công
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (err: any) {
          console.error(`[Google Drive Error]: Tải lên Drive thất bại. Lỗi:`, err.message);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
          throw err;
        }
      } else {
        // Lưu trữ cục bộ bị vô hiệu hóa
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        throw new Error(`Chế độ lưu trữ cục bộ (local storage) đã bị vô hiệu hóa trên môi trường cloud. Hiện tại đang cấu hình lưu trữ là: ${storageProvider.toUpperCase()}`);
      }

      fileDetails.push({
        fileName: targetFileName,
        fileUrl: fileUrl
      });
    }

    // Ghi nhận lịch sử nộp bài vào Cơ sở dữ liệu (MongoDB hoặc JSON file)
    if (useMongoDB) {
      for (const detail of fileDetails) {
        const submissionDoc = new SubmissionModel({
          teacher,
          className,
          fullName,
          stage,
          session,
          attemptNumber,
          fileName: detail.fileName,
          fileUrl: detail.fileUrl
        });
        await submissionDoc.save();
      }
    } else {
      const submissionsFile = path.join(uploadDir, 'submissions.json');
      let submissions: any[] = [];
      
      if (fs.existsSync(submissionsFile)) {
        try {
          const data = fs.readFileSync(submissionsFile, 'utf8');
          submissions = JSON.parse(data);
        } catch (err) {
          console.error('Error reading submissions file:', err);
        }
      }

      for (const detail of fileDetails) {
        const newSubmission = {
          id: Date.now().toString() + '-' + Math.round(Math.random() * 1e9),
          teacher,
          className,
          fullName,
          stage,
          session,
          attemptNumber,
          fileName: detail.fileName,
          fileUrl: detail.fileUrl,
          createdAt: new Date().toISOString()
        };
        submissions.push(newSubmission);
      }
      fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf8');
    }

    let successMessage = 'Đã lưu bài nộp thành công!';
    if (storageProvider === 'mega') {
      successMessage = 'Đã tải bài lên MEGA thành công!';
    } else if (storageProvider === 'google-drive') {
      successMessage = 'Đã tải bài lên Google Drive thành công!';
    }

    res.json({
      message: successMessage,
      files: fileDetails
    });

  } catch (error: any) {
    console.error('Error handling upload:', error);
    res.status(500).json({ error: error.message || 'Internal server error during upload.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[server]: Backend is running at http://localhost:${PORT}`);
});
