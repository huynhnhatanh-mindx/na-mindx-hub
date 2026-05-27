import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { Storage } from 'megajs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    const className = req.body.className ? req.body.className.trim() : 'N-A';
    const fullName = req.body.fullName ? req.body.fullName.trim() : 'N-A';
    const stage = req.body.stage ? req.body.stage.trim() : 'N-A';
    const session = req.body.session ? req.body.session.trim() : 'N-A';

    // Calculate submission attempt number once per request
    if (!(req as any).submissionAttemptNumber) {
      const submissionsFile = path.join(uploadDir, 'submissions.json');
      let count = 0;
      if (fs.existsSync(submissionsFile)) {
        try {
          const data = fs.readFileSync(submissionsFile, 'utf8');
          const submissions = JSON.parse(data);
          // Count submissions matching Name, Class, Stage, Session
          count = submissions.filter((s: any) => 
            s.fullName?.trim().toLowerCase() === fullName.toLowerCase() &&
            s.className?.trim().toLowerCase() === className.toLowerCase() &&
            s.stage?.trim().toLowerCase() === stage.toLowerCase() &&
            s.session?.trim().toLowerCase() === session.toLowerCase()
          ).length;
        } catch (err) {
          console.error('Error reading submissions file:', err);
        }
      }
      (req as any).submissionAttemptNumber = count + 1;
    }

    const attemptNumber = (req as any).submissionAttemptNumber;

    const abbrevStage = getStageAbbreviation(stage);
    const abbrevSession = getSessionAbbreviation(session);

    // Build filename components
    const finalFullName = sanitizeForFilename(fullName);
    const finalClassName = sanitizeForFilename(className);
    const finalStage = sanitizeForFilename(abbrevStage);
    const finalSession = sanitizeForFilename(abbrevSession);
    const finalBasename = sanitizeForFilename(basename);

    // Format: Họ tên - Lớp - Giai đoạn (Viết tắt) - Buổi (Viết tắt) - Lần nộp
    // Example: Nguyen Van Nam - HCM4 - CP2 - B9 - Lan 1.zip
    const baseOutputName = `${finalFullName} - ${finalClassName} - ${finalStage} - ${finalSession} - Lan ${attemptNumber}`;
    
    let outputFilename = `${baseOutputName}${ext}`;
    let fileCounter = 1;
    while (fs.existsSync(path.join(uploadDir, outputFilename))) {
      outputFilename = `${baseOutputName} (${fileCounter})${ext}`;
      fileCounter++;
    }

    cb(null, outputFilename);
  }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
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

    const fileDetails = [];

    // Lặp qua từng file để xử lý tải lên
    for (const file of files) {
      const localPath = file.path;
      const targetFileName = file.filename;

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
          const megaUrl = await megaFile.link();
          
          console.log(`[MEGA]: Tải lên thành công! Link MEGA: ${megaUrl}`);

          fileDetails.push({
            originalName: file.originalname,
            filename: targetFileName,
            size: file.size,
            path: megaUrl
          });

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
          const driveUrl = await uploadToGoogleDrive(localPath, targetFileName, file.mimetype);
          console.log(`[Google Drive]: Tải lên thành công! Link Drive: ${driveUrl}`);

          fileDetails.push({
            originalName: file.originalname,
            filename: targetFileName,
            size: file.size,
            path: driveUrl // Lưu link Google Drive vào registry
          });

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
    }

    // Log the submission metadata to submissions.json
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

    const newSubmission = {
      id: Date.now().toString() + '-' + Math.round(Math.random() * 1e9),
      teacher: req.body.teacher || 'N/A',
      className: req.body.className || 'N/A',
      fullName: req.body.fullName || 'N/A',
      stage: req.body.stage || 'N/A',
      session: req.body.session || 'N/A',
      attemptNumber: (req as any).submissionAttemptNumber || 1,
      files: fileDetails,
      createdAt: new Date().toISOString()
    };

    submissions.push(newSubmission);
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf8');

    let successMessage = 'Đã lưu bài cục bộ thành công!';
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
