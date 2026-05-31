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
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

// Helper to create nodemailer transporter based on env configs (supports Gmail & Custom SMTP like Bizfly)
function createMailTransporter() {
  const smtpUser = process.env.FEEDBACK_EMAIL;
  const smtpPass = process.env.FEEDBACK_EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  if (host) {
    const resolvedPort = port || 587;
    // Port 465 = SSL/TLS (secure: true), Port 587 = STARTTLS (secure: false)
    const isSecure = resolvedPort === 465;

    return nodemailer.createTransport({
      host,
      port: resolvedPort,
      secure: isSecure,
      auth: { user: smtpUser, pass: smtpPass },
      requireTLS: resolvedPort === 587,
      connectionTimeout: 10000, // 10 giây — timeout kết nối
      socketTimeout: 15000,     // 15 giây — timeout gửi dữ liệu
      greetingTimeout: 10000,   // 10 giây — timeout sau khi kết nối
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: smtpUser, pass: smtpPass }
  });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- CẤU HÌNH CƠ SỞ DỮ LIỆU MONGODB ---
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});
const TeacherModel = mongoose.model('Teacher', teacherSchema);

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  teacherName: { type: String, required: true }
});
const ClassModel = mongoose.model('Class', classSchema);

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  className: { type: String, required: true },
  studentCode: { type: String, required: true, unique: true }
});
studentSchema.index({ name: 1, className: 1 }, { unique: true });
const StudentModel = mongoose.model('Student', studentSchema);

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

// Hashing helper using native node crypto
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // SHA256 hashed
  role: { type: String, required: true, enum: ['admin', 'teacher'], default: 'admin' },
  displayName: { type: String, required: true },
  email: { type: String, default: '' }, // Email nhận thông báo
  createdAt: { type: Date, default: Date.now }
});
const UserModel = mongoose.model('User', userSchema);

function normalizeUsername(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]/g, '') // Remove spaces and special chars
    .toLowerCase()
    .trim();
}

async function createTeacherWithAccount(
  name: string,
  username?: string,
  password?: string,
  displayName?: string
) {
  if (!useMongoDB) return;
  const nameClean = name.trim();
  if (nameClean === 'Chưa phân công' || nameClean === '') return;

  // 1. Ensure teacher record exists
  let teacher = await TeacherModel.findOne({ name: nameClean });
  if (!teacher) {
    teacher = new TeacherModel({ name: nameClean });
    await teacher.save();
  }

  // 2. Ensure user account exists
  let userExisting = await UserModel.findOne({ displayName: nameClean });
  if (!userExisting && username) {
    userExisting = await UserModel.findOne({ username: username.trim().toLowerCase() });
  }

  if (!userExisting) {
    let finalUsername = username && username.trim() !== '' ? username.trim().toLowerCase() : normalizeUsername(nameClean);
    let counter = 1;
    const usernameBase = finalUsername;
    while (await UserModel.findOne({ username: finalUsername })) {
      finalUsername = `${usernameBase}${counter}`;
      counter++;
    }

    const newUser = new UserModel({
      username: finalUsername,
      password: password && password.trim() !== '' ? hashPassword(password) : hashPassword('123456'),
      role: 'teacher',
      displayName: displayName && displayName.trim() !== '' ? displayName.trim() : nameClean
    });
    await newUser.save();
    console.log(`[Database]: Tự động tạo tài khoản ${finalUsername} cho giáo viên ${nameClean}`);
  }
}

async function ensureUserForTeacher(teacherName: string) {
  await createTeacherWithAccount(teacherName);
}

let useMongoDB = false;

if (process.env.MONGODB_URI) {
  console.log('[Database]: Đang kết nối tới cơ sở dữ liệu MongoDB Atlas...');
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      useMongoDB = true;
      console.log('[Database]: Kết nối cơ sở dữ liệu MongoDB thành công!');

      // Auto-migrate: ensure all existing teachers have user accounts
      try {
        const teachers = await TeacherModel.find({});
        for (const teacher of teachers) {
          await ensureUserForTeacher(teacher.name);
        }
        console.log('[Database]: Đã đồng bộ tài khoản cho các giáo viên hiện có.');
      } catch (err: any) {
        console.error('[Migration Error]: Lỗi đồng bộ tài khoản giáo viên lúc khởi động:', err.message);
      }
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
    } catch (e) { }
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

// Hàm hỗ trợ tải tệp tin lên Google Drive nhận stream để hỗ trợ đo tiến trình
async function uploadToGoogleDrive(bodyStream: any, driveFileName: string, mimeType: string): Promise<string> {
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
    body: bodyStream
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

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// Middleware - CORS bảo mật
const allowedOrigins = [
  process.env.FRONTEND_URL,  // Deployed React frontend
  'http://localhost:5173' // Local React frontend
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

// API lấy danh sách Giáo viên
app.get('/api/teachers', async (req: Request, res: Response) => {
  try {
    if (useMongoDB) {
      const teachers = await TeacherModel.find({});
      res.json(teachers.map(t => t.name));
    } else {
      // Fallback khi chạy offline
      res.json(['Huỳnh Nhật Anh', 'Nguyễn Văn A', 'Trần Thị B']);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API lấy danh sách Lớp học (có bộ lọc theo Giáo viên)
app.get('/api/classes', async (req: Request, res: Response) => {
  try {
    const { teacherName } = req.query;
    const teacherNameStr = typeof teacherName === 'string' ? teacherName : undefined;
    if (useMongoDB) {
      const query = teacherNameStr ? { teacherName: teacherNameStr } : {};
      const classes = await ClassModel.find(query);
      res.json(classes.map(c => c.name));
    } else {
      // Fallback khi chạy offline
      const fallbackMap: Record<string, string[]> = {
        'Huỳnh Nhật Anh': ['HCM4', 'HCM1'],
        'Nguyễn Văn A': ['HCM2'],
        'Trần Thị B': ['HCM3']
      };
      if (teacherNameStr) {
        res.json(fallbackMap[teacherNameStr] || []);
      } else {
        res.json(['HCM4', 'HCM1', 'HCM2', 'HCM3']);
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API lấy danh sách Học viên (có bộ lọc theo Lớp học)
app.get('/api/students', async (req: Request, res: Response) => {
  try {
    const { className } = req.query;
    const classNameStr = typeof className === 'string' ? className : undefined;
    if (useMongoDB) {
      const query = classNameStr ? { className: classNameStr } : {};
      const students = await StudentModel.find(query);
      res.json(students.map(s => s.name));
    } else {
      // Fallback khi chạy offline
      const fallbackMap: Record<string, string[]> = {
        'HCM4': ['Nguyễn Văn Nam', 'Trần Thị Mai'],
        'HCM1': ['Lê Hoàng Long', 'Phạm Minh Đức'],
        'HCM2': ['Hoàng Văn C', 'Trần Thị D'],
        'HCM3': ['Phan Văn E', 'Đỗ Thị F']
      };
      if (classNameStr) {
        res.json(fallbackMap[classNameStr] || []);
      } else {
        res.json(['Nguyễn Văn Nam', 'Trần Thị Mai', 'Lê Hoàng Long', 'Phạm Minh Đức', 'Hoàng Văn C', 'Trần Thị D', 'Phan Văn E', 'Đỗ Thị F']);
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MIDDLEWARE VÀ ENDPOINTS QUẢN TRỊ ---

// Khóa bí mật dùng để ký số Token chống giả mạo
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Hàm tạo Token bảo mật kèm chữ ký HMAC
function generateSecureToken(username: string, role: string): string {
  const payload = `${username.trim()}:${role.trim()}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${signature}`).toString('base64');
}

// Hàm xác minh Token và trả về thông tin payload nếu hợp lệ
function verifySecureToken(token: string): { username: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const index = decoded.lastIndexOf('|');
    if (index === -1) return null;

    const payload = decoded.substring(0, index);
    const signature = decoded.substring(index + 1);

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) {
      return null;
    }

    const parts = payload.split(':');
    if (parts.length < 2) return null;
    return { username: parts[0], role: parts[1] };
  } catch (e) {
    return null;
  }
}

// Middleware xác thực quyền Admin
const adminAuth = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này.' });
    }
    const token = authHeader.split(' ')[1];
    const verified = verifySecureToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
    }
    const { username, role } = verified;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    (req as any).user = { username, role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Mã xác thực không hợp lệ.' });
  }
};

// Middleware xác thực quyền Admin hoặc Giáo viên
const adminOrTeacherAuth = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này.' });
    }
    const token = authHeader.split(' ')[1];
    const verified = verifySecureToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
    }
    const { username, role } = verified;
    if (role !== 'admin' && role !== 'teacher') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    // Lưu thông tin người dùng vào request để sử dụng trong các API
    (req as any).user = { username, role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Mã xác thực không hợp lệ.' });
  }
};

// API Đăng nhập
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
    }

    const hashedPassword = hashPassword(password);

    // Fallback hỗ trợ login offline khi MongoDB bị ngắt kết nối
    if (!useMongoDB) {
      const configAdminPasscode = process.env.ADMIN_PASSCODE || 'admin123';
      if (username.trim() === 'admin' && password === configAdminPasscode) {
        const token = generateSecureToken('admin', 'admin');
        return res.json({
          message: 'Đăng nhập thành công (Chế độ offline).',
          token,
          user: {
            username: 'admin',
            role: 'admin',
            displayName: 'Quản trị viên (Offline)'
          }
        });
      }
    }

    const user = await UserModel.findOne({ username: username.trim(), password: hashedPassword });
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const token = generateSecureToken(user.username, user.role);

    res.json({
      message: 'Đăng nhập thành công.',
      token,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống: ' + err.message });
  }
});

// API Cập nhật Thông tin Cá nhân
app.put('/api/auth/profile', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { username } = (req as any).user;
    const displayName = sanitize(req.body.displayName);
    const password = sanitize(req.body.password);
    const email = sanitize(req.body.email);

    if (!useMongoDB) {
      return res.status(400).json({ error: 'Tính năng cập nhật hồ sơ không khả dụng ở chế độ offline.' });
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin tài khoản.' });
    }

    const oldDisplayName = user.displayName;
    const oldRole = user.role;

    if (displayName && displayName.trim() !== '') {
      user.displayName = displayName.trim();
    }
    if (password && password.trim() !== '') {
      user.password = hashPassword(password);
    }
    if (typeof email === 'string') {
      user.email = email.trim().toLowerCase();
    }

    await user.save();

    // Đồng bộ nếu là Giáo viên
    if (oldRole === 'teacher' && displayName && displayName.trim() !== oldDisplayName) {
      const newName = displayName.trim();
      const teacher = await TeacherModel.findOne({ name: oldDisplayName.trim() });
      if (teacher) {
        teacher.name = newName;
        await teacher.save();
      } else {
        const newTeacher = new TeacherModel({ name: newName });
        await newTeacher.save();
      }
      // Cập nhật các lớp học do giáo viên phụ trách
      await ClassModel.updateMany({ teacherName: oldDisplayName.trim() }, { teacherName: newName });
    }

    res.json({
      message: 'Cập nhật thông tin cá nhân thành công.',
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        email: user.email
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật hồ sơ: ' + err.message });
  }
});

// API CRUD TÀI KHOẢN (Users)
app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find({}, { password: 0 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài khoản: ' + err.message });
  }
});

app.post('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    const role = sanitize(req.body.role);
    const displayName = sanitize(req.body.displayName);
    const email = sanitize(req.body.email) || '';
    if (!username || !password || !role || !displayName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin tài khoản.' });
    }
    const existing = await UserModel.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại trên hệ thống.' });
    }
    const newUser = new UserModel({
      username: username.trim().toLowerCase(),
      password: hashPassword(password),
      role,
      displayName,
      email: email.trim().toLowerCase()
    });
    await newUser.save();

    // Auto-create teacher if role is teacher
    if (role === 'teacher') {
      const teacherExisting = await TeacherModel.findOne({ name: displayName.trim() });
      if (!teacherExisting) {
        const newTeacher = new TeacherModel({ name: displayName.trim() });
        await newTeacher.save();
      }
    }

    res.json({ message: 'Tạo tài khoản thành công.', user: { username: newUser.username, role: newUser.role, displayName: newUser.displayName, email: newUser.email } });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo tài khoản: ' + err.message });
  }
});

app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const password = sanitize(req.body.password);
    const role = sanitize(req.body.role);
    const displayName = sanitize(req.body.displayName);
    const email = sanitize(req.body.email);
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    if (user.username === 'admin' && role && role !== 'admin') {
      return res.status(400).json({ error: 'Không thể hạ quyền của tài khoản admin tối cao.' });
    }

    const oldDisplayName = user.displayName;
    const oldRole = user.role;

    if (password && password.trim() !== '') {
      user.password = hashPassword(password);
    }
    if (role) user.role = role;
    if (displayName) user.displayName = displayName;
    if (typeof email === 'string') user.email = email.trim().toLowerCase();
    await user.save();

    // Sync to Teacher collection
    if (oldRole === 'teacher' && user.role !== 'teacher') {
      await TeacherModel.deleteOne({ name: oldDisplayName.trim() });
      await ClassModel.updateMany({ teacherName: oldDisplayName.trim() }, { teacherName: 'Chưa phân công' });
    } else if (user.role === 'teacher') {
      if (oldRole === 'teacher' && oldDisplayName !== user.displayName) {
        const teacher = await TeacherModel.findOne({ name: oldDisplayName.trim() });
        if (teacher) {
          teacher.name = user.displayName.trim();
          await teacher.save();
        } else {
          const newTeacher = new TeacherModel({ name: user.displayName.trim() });
          await newTeacher.save();
        }
        await ClassModel.updateMany({ teacherName: oldDisplayName.trim() }, { teacherName: user.displayName.trim() });
      } else {
        const teacherExisting = await TeacherModel.findOne({ name: user.displayName.trim() });
        if (!teacherExisting) {
          const newTeacher = new TeacherModel({ name: user.displayName.trim() });
          await newTeacher.save();
        }
      }
    }

    res.json({ message: 'Cập nhật tài khoản thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật tài khoản: ' + err.message });
  }
});

app.delete('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Không thể xóa tài khoản admin hệ thống.' });
    }

    const userRole = user.role;
    const userDisplayName = user.displayName;

    await UserModel.findByIdAndDelete(req.params.id);

    // Sync deletion to Teachers
    if (userRole === 'teacher') {
      await TeacherModel.deleteOne({ name: userDisplayName.trim() });
      await ClassModel.updateMany({ teacherName: userDisplayName.trim() }, { teacherName: 'Chưa phân công' });
    }

    res.json({ message: 'Xóa tài khoản thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa tài khoản: ' + err.message });
  }
});

// API CRUD LỚP HỌC (Classes)
app.get('/api/admin/classes', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    let query = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      query = { teacherName };
    }
    const classes = await ClassModel.find(query);
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách lớp học: ' + err.message });
  }
});

app.post('/api/admin/classes', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const teacherName = sanitize(req.body.teacherName);
    const newTeacherUsername = sanitize(req.body.newTeacherUsername);
    const newTeacherPassword = sanitize(req.body.newTeacherPassword);
    if (!name || !teacherName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên lớp và tên giáo viên.' });
    }
    const existing = await ClassModel.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Tên lớp học đã tồn tại.' });
    }

    await createTeacherWithAccount(teacherName.trim(), newTeacherUsername, newTeacherPassword);

    const newClass = new ClassModel({
      name: name.trim(),
      teacherName: teacherName.trim()
    });
    await newClass.save();
    res.json({ message: 'Tạo lớp học thành công.', data: newClass });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo lớp học: ' + err.message });
  }
});

app.put('/api/admin/classes/:id', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const teacherName = sanitize(req.body.teacherName);
    const newTeacherUsername = sanitize(req.body.newTeacherUsername);
    const newTeacherPassword = sanitize(req.body.newTeacherPassword);
    const cls = await ClassModel.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
    }

    if (name && name.trim() !== cls.name) {
      const existing = await ClassModel.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ error: 'Tên lớp học mới đã tồn tại.' });
      }
      cls.name = name.trim();
    }
    if (teacherName) {
      cls.teacherName = teacherName.trim();
      await createTeacherWithAccount(teacherName.trim(), newTeacherUsername, newTeacherPassword);
    }
    await cls.save();
    res.json({ message: 'Cập nhật lớp học thành công.', data: cls });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật lớp học: ' + err.message });
  }
});

app.delete('/api/admin/classes/:id', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const cls = await ClassModel.findByIdAndDelete(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
    }
    res.json({ message: 'Xóa lớp học thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa lớp học: ' + err.message });
  }
});

// API CRUD GIÁO VIÊN (Teachers)
app.get('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
  try {
    const teachers = await TeacherModel.find({});
    res.json(teachers);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách giáo viên: ' + err.message });
  }
});

app.post('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên giáo viên.' });
    }
    const existing = await TeacherModel.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Tên giáo viên đã tồn tại.' });
    }

    if (username && username.trim() !== '') {
      const existingUser = await UserModel.findOne({ username: username.trim().toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Tên đăng nhập tài khoản giáo viên đã tồn tại.' });
      }
    }

    await createTeacherWithAccount(name.trim(), username, password);
    const savedTeacher = await TeacherModel.findOne({ name: name.trim() });

    res.json({ message: 'Tạo giáo viên thành công.', data: savedTeacher });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo giáo viên: ' + err.message });
  }
});

app.put('/api/admin/teachers/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const password = sanitize(req.body.password);
    const teacher = await TeacherModel.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Không tìm thấy giáo viên.' });
    }

    const oldName = teacher.name;
    if (name && name.trim() !== oldName) {
      const existing = await TeacherModel.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ error: 'Tên giáo viên đã tồn tại.' });
      }

      teacher.name = name.trim();
      await teacher.save();

      // Sync display name of user account
      if (useMongoDB) {
        const user = await UserModel.findOne({ displayName: oldName, role: 'teacher' });
        if (user) {
          user.displayName = name.trim();
          if (password && password.trim() !== '') {
            user.password = hashPassword(password);
          }
          await user.save();
        }
      }

      // Also update classes that use this teacher name
      await ClassModel.updateMany({ teacherName: oldName }, { teacherName: name.trim() });
    } else if (password && password.trim() !== '') {
      // Name did not change, but password was updated
      if (useMongoDB) {
        const user = await UserModel.findOne({ displayName: oldName, role: 'teacher' });
        if (user) {
          user.password = hashPassword(password);
          await user.save();
        }
      }
    }
    res.json({ message: 'Cập nhật giáo viên thành công.', data: teacher });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật giáo viên: ' + err.message });
  }
});

app.delete('/api/admin/teachers/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const teacher = await TeacherModel.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Không tìm thấy giáo viên.' });
    }

    const teacherName = teacher.name;
    await TeacherModel.findByIdAndDelete(req.params.id);

    // Optionally delete the corresponding user account
    if (useMongoDB) {
      await UserModel.deleteOne({ displayName: teacherName, role: 'teacher' });
    }

    // Update classes assigned to this teacher to 'Chưa phân công'
    await ClassModel.updateMany({ teacherName }, { teacherName: 'Chưa phân công' });

    res.json({ message: 'Xóa giáo viên thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa giáo viên: ' + err.message });
  }
});

// API CRUD HỌC VIÊN (Students)
app.get('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    let query = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      query = { className: { $in: classNames } };
    }
    const students = await StudentModel.find(query);
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});

app.post('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const className = sanitize(req.body.className);
    const studentCode = sanitize(req.body.studentCode);
    if (!name || !className || !studentCode) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên học viên, lớp học và mã tra cứu.' });
    }
    const codeExisting = await StudentModel.findOne({ studentCode: studentCode.trim() });
    if (codeExisting) {
      return res.status(400).json({ error: 'Mã tra cứu học viên đã tồn tại.' });
    }

    // Auto-create class if not exists
    if (useMongoDB) {
      const classExisting = await ClassModel.findOne({ name: className.trim() });
      if (!classExisting) {
        const newClass = new ClassModel({
          name: className.trim(),
          teacherName: 'Chưa phân công'
        });
        await newClass.save();
      }
    }

    const newStudent = new StudentModel({
      name: name.trim(),
      className: className.trim(),
      studentCode: studentCode.trim()
    });
    await newStudent.save();
    res.json({ message: 'Tạo học viên thành công.', data: newStudent });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo học viên: ' + err.message });
  }
});

app.put('/api/admin/students/:id', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const className = sanitize(req.body.className);
    const studentCode = sanitize(req.body.studentCode);
    const student = await StudentModel.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học viên.' });
    }
    if (studentCode && studentCode.trim() !== student.studentCode) {
      const codeExisting = await StudentModel.findOne({ studentCode: studentCode.trim() });
      if (codeExisting) {
        return res.status(400).json({ error: 'Mã tra cứu học viên mới đã tồn tại.' });
      }
      student.studentCode = studentCode.trim();
    }
    if (name) student.name = name.trim();
    if (className) {
      student.className = className.trim();

      // Auto-create class if not exists
      if (useMongoDB) {
        const classExisting = await ClassModel.findOne({ name: className.trim() });
        if (!classExisting) {
          const newClass = new ClassModel({
            name: className.trim(),
            teacherName: 'Chưa phân công'
          });
          await newClass.save();
        }
      }
    }
    await student.save();
    res.json({ message: 'Cập nhật học viên thành công.', data: student });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật học viên: ' + err.message });
  }
});

app.delete('/api/admin/students/:id', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const student = await StudentModel.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học viên.' });
    }
    res.json({ message: 'Xóa học viên thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa học viên: ' + err.message });
  }
});

// API CRUD BÀI NỘP (Submissions)
app.get('/api/admin/submissions', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    let query = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      query = { className: { $in: classNames } };
    }
    const submissions = await SubmissionModel.find(query).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách bài nộp: ' + err.message });
  }
});

app.delete('/api/admin/submissions/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    let submission: any = null;
    if (useMongoDB) {
      submission = await SubmissionModel.findByIdAndDelete(req.params.id);
    } else {
      const submissionsFile = path.join(uploadDir, 'submissions.json');
      if (fs.existsSync(submissionsFile)) {
        const data = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
        const index = data.findIndex((s: any) => s.id === req.params.id || s._id === req.params.id);
        if (index !== -1) {
          [submission] = data.splice(index, 1);
          fs.writeFileSync(submissionsFile, JSON.stringify(data, null, 2));
        }
      }
    }

    if (!submission) {
      return res.status(404).json({ error: 'Không tìm thấy bài nộp.' });
    }

    // Delete corresponding file from MEGA
    if (storageProvider === 'mega') {
      try {
        if (megaInitPromise) {
          await megaInitPromise;
        }
        let fileToDelete = null;
        if (megaFolder && megaFolder.children) {
          fileToDelete = megaFolder.children.find((f: any) => f.name === submission.fileName);
        }
        if (!fileToDelete && megaStorage && megaStorage.files) {
          fileToDelete = Object.values(megaStorage.files).find((f: any) => f.name === submission.fileName);
        }
        if (fileToDelete) {
          await (fileToDelete as any).delete(true);
          console.log(`[MEGA]: Đã xóa tệp tin "${submission.fileName}" trên MEGA storage.`);
        } else {
          console.warn(`[MEGA Warning]: Không tìm thấy tệp tin "${submission.fileName}" trên MEGA để xóa.`);
        }
      } catch (megaErr: any) {
        console.error(`[MEGA Error]: Không thể xóa tệp tin trên MEGA: ${megaErr.message}`);
      }
    }

    res.json({ message: 'Xóa bài nộp thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa bài nộp: ' + err.message });
  }
});

// SECURED API to view submissions - requires studentCode, a valid adminKey, or an authenticated user token
app.get('/api/submissions', async (req: Request, res: Response) => {
  try {
    const { studentCode, adminKey } = req.query;
    const configAdminPasscode = process.env.ADMIN_PASSCODE || 'admin123';
    const isAdmin = adminKey && typeof adminKey === 'string' && adminKey.trim() === configAdminPasscode.trim();

    // Check if the user is authenticated via Bearer token
    const authHeader = req.headers.authorization;
    let isUserAuthenticated = false;
    let authUserRole = '';
    let authUserDisplayName = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const verified = verifySecureToken(token);
      if (verified) {
        const { username, role } = verified;
        if (role === 'admin' || role === 'teacher') {
          isUserAuthenticated = true;
          authUserRole = role;

          // Resolve display name for the user
          if (useMongoDB) {
            const userDb = await UserModel.findOne({ username });
            if (userDb) {
              authUserDisplayName = userDb.displayName;
            }
          } else {
            authUserDisplayName = username;
          }
        }
      }
    }

    const hasStudentCode = studentCode && typeof studentCode === 'string' && studentCode.trim() !== '';

    if (!isAdmin && !hasStudentCode && !isUserAuthenticated) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp Mã tra cứu học viên hoặc Đăng nhập để tra cứu lịch sử nộp bài.'
      });
    }

    // Static fallback student lookup map
    const STUDENT_CODES_FALLBACK: Record<string, { name: string; className: string }> = {
      'HV001': { name: 'Nguyễn Văn Nam', className: 'HCM4' },
      'HV002': { name: 'Trần Thị Mai', className: 'HCM4' },
      'HV003': { name: 'Lê Hoàng Long', className: 'HCM1' },
      'HV004': { name: 'Phạm Minh Đức', className: 'HCM1' },
      'HV005': { name: 'Hoàng Văn C', className: 'HCM2' },
      'HV006': { name: 'Trần Thị D', className: 'HCM2' },
      'HV007': { name: 'Phan Văn E', className: 'HCM3' },
      'HV008': { name: 'Đỗ Thị F', className: 'HCM3' }
    };

    if (useMongoDB) {
      let query = {};
      if (!isAdmin && !isUserAuthenticated && studentCode) {
        // Resolve studentCode to name and className
        const trimmedCode = (studentCode as string).trim();
        const student = await StudentModel.findOne({
          studentCode: { $regex: new RegExp(`^${trimmedCode}$`, 'i') }
        });

        if (!student) {
          return res.status(404).json({ error: 'Mã tra cứu học viên không tồn tại trong hệ thống.' });
        }

        query = {
          className: student.className,
          fullName: student.name
        };
      } else if (isUserAuthenticated && authUserRole === 'teacher') {
        // Filter by classes taught by this teacher
        const teacherClasses = await ClassModel.find({ teacherName: authUserDisplayName });
        const classNames = teacherClasses.map(c => c.name);
        query = { className: { $in: classNames } };
      }

      const submissions = await SubmissionModel.find(query).sort({ createdAt: -1 });
      res.json({ source: 'mongodb', count: submissions.length, data: submissions });
    } else {
      const submissionsFile = path.join(uploadDir, 'submissions.json');
      let data = [];
      if (fs.existsSync(submissionsFile)) {
        data = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
      }

      let filteredData = data;
      if (!isAdmin && !isUserAuthenticated && studentCode) {
        const trimmedCode = (studentCode as string).trim().toUpperCase();
        const fallbackStudent = STUDENT_CODES_FALLBACK[trimmedCode] || Object.entries(STUDENT_CODES_FALLBACK).find(([k]) => k.toUpperCase() === trimmedCode)?.[1];

        if (!fallbackStudent) {
          return res.status(404).json({ error: 'Mã tra cứu học viên không tồn tại trong hệ thống offline.' });
        }

        filteredData = data.filter((s: any) =>
          s.className?.trim().toLowerCase() === fallbackStudent.className.toLowerCase() &&
          s.fullName?.trim().toLowerCase() === fallbackStudent.name.toLowerCase()
        );
      } else if (isUserAuthenticated && authUserRole === 'teacher') {
        filteredData = data.filter((s: any) =>
          s.teacher?.trim().toLowerCase() === authUserDisplayName.trim().toLowerCase()
        );
      }

      // Sort local by date descending
      filteredData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ source: 'local', count: filteredData.length, data: filteredData });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File Upload Endpoint
const uploadArray = upload.array('files', 10);
app.post('/api/upload', (req: Request, res: Response, next: any) => {
  uploadArray(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Tệp tin vượt quá kích thước giới hạn cho phép (tối đa 200MB).' });
      }
      return res.status(400).json({ error: err.message || 'Lỗi xảy ra trong quá trình tải tệp tin.' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một tệp tin để tải lên.' });
    }

    // Thiết lập HTTP Header cho luồng Server-Sent Events (SSE) để duy trì kết nối chống Timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendProgress = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Áp dụng mongo-sanitize để tránh NoSQL Injection
    const teacher = sanitize(req.body.teacher || 'N/A').trim();
    const className = sanitize(req.body.className || 'N/A').trim();
    const fullName = sanitize(req.body.fullName || 'N/A').trim();
    const stage = sanitize(req.body.stage || 'N/A').trim();
    const session = sanitize(req.body.session || 'N/A').trim();

    const fileDetails: any[] = [];
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    let totalBytesUploaded = 0;

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

      // Giải mã ký tự gốc Latin-1 từ Multer thành UTF-8 để khắc phục lỗi font tiếng Việt
      const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

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
            throw new Error('Ứng dụng kết nối MEGA chưa được khởi tạo hoặc không tìm thấy thư mục lưu trữ.');
          }

          console.log(`[MEGA]: Đang tải lên tệp tin: ${targetFileName}...`);
          const uploadStream = megaFolder.upload({
            name: targetFileName,
            size: file.size
          });

          const readStream = fs.createReadStream(localPath);
          readStream.on('data', (chunk) => {
            totalBytesUploaded += chunk.length;
            const percent = Math.min(99, Math.round((totalBytesUploaded / totalSize) * 100));
            sendProgress({ status: 'uploading', progress: percent });
          });

          readStream.pipe(uploadStream);
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

          const readStream = fs.createReadStream(localPath);
          readStream.on('data', (chunk) => {
            totalBytesUploaded += chunk.length;
            const percent = Math.min(99, Math.round((totalBytesUploaded / totalSize) * 100));
            sendProgress({ status: 'uploading', progress: percent });
          });

          fileUrl = await uploadToGoogleDrive(readStream, targetFileName, file.mimetype);
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
        originalName: decodedOriginalName,
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

    // Gửi email thông báo cho giáo viên (bất đồng bộ - fire and forget)
    if (useMongoDB) {
      (async () => {
        try {
          // 1. Tìm lớp để lấy teacherName
          const classDoc = await ClassModel.findOne({ name: className });
          const targetTeacherName = classDoc ? classDoc.teacherName : teacher;

          if (targetTeacherName && targetTeacherName !== 'Chưa phân công' && targetTeacherName !== 'N/A') {
            // 2. Tìm giáo viên theo displayName
            const teacherUser = await UserModel.findOne({ displayName: targetTeacherName });
            if (teacherUser && teacherUser.email && teacherUser.email.trim() !== '') {
              // 3. Cấu hình gửi mail qua SMTP
              const transporter = createMailTransporter();
              if (transporter) {
                const smtpUser = process.env.FEEDBACK_EMAIL;
                const fileLinksHtml = fileDetails.map(f => `<li><a href="${f.fileUrl}" style="color: #6366f1; text-decoration: underline; font-weight: 500;">${f.fileName}</a></li>`).join('');

                await transporter.sendMail({
                  from: `"NA MindX Hub" <${smtpUser}>`,
                  to: teacherUser.email,
                  subject: `[NA MindX Hub] Học viên ${fullName} vừa nộp bài mới — Lớp ${className}`,
                  html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; color: #f1f5f9;">
                      <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px 28px;">
                        <h2 style="margin: 0; font-size: 20px; color: #fff;">Thông báo nộp bài mới</h2>
                        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Học viên vừa nộp bài thành công trên NA MindX Hub</p>
                      </div>
                      <div style="padding: 28px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; width: 120px; vertical-align: top;">Họ tên học viên:</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #f1f5f9;">${fullName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Lớp học:</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #f1f5f9;">${className}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Giai đoạn:</td>
                            <td style="padding: 8px 0; color: #f1f5f9;">${stage}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Buổi học:</td>
                            <td style="padding: 8px 0; color: #f1f5f9;">${session}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Lần nộp:</td>
                            <td style="padding: 8px 0; color: #f1f5f9;">Lần ${attemptNumber}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Thời gian nộp:</td>
                            <td style="padding: 8px 0; color: #f1f5f9;">${new Date().toLocaleString('vi-VN')}</td>
                          </tr>
                        </table>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07);">
                          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #f1f5f9;">Danh sách tệp tin:</p>
                          <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
                            ${fileLinksHtml}
                          </ul>
                        </div>
                        
                        <!-- Chữ ký mặc định -->
                        <div style="border-top: 1px dashed rgba(255,255,255,0.15); margin-top: 28px; padding-top: 20px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #f1f5f9; text-align: left;">
                          <div style="margin-bottom: 4px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">HUỲNH NHẬT ANH</div>
                          <div style="margin-bottom: 8px; color: #cbd5e1; font-weight: 500;">Mentor HCM4 - Team Teaching - MindX School</div>
                          <div style="margin-bottom: 16px; color: #94a3b8; font-size: 12px;">
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">T</span> +84 778909082
                            <span style="color: #94a3b8; margin: 0 8px;">|</span>
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">E</span> <a href="mailto:huynhnhatanh@mindx.net.vn" style="color: #38bdf8; text-decoration: underline;">huynhnhatanh@mindx.net.vn</a>
                          </div>
                          
                          <div style="background-color: #ffffff; padding: 6px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">
                            <img src="data:image/png;base64,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" alt="MindX Technology School" style="height: 22px; display: block; border: 0;" />
                          </div>
                          
                          <div style="font-weight: bold; color: #ffffff; font-size: 13px; margin-bottom: 4px;">Trường học Công nghệ MindX</div>
                          <div style="font-style: italic; color: #94a3b8; font-size: 12px; margin-bottom: 8px;">Be extraordinary</div>
                          
                          <div style="color: #64748b; font-size: 11px; line-height: 1.4;">
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">HO</span> Hanoi: 5th fl., 71 Nguyen Chi Thanh st, Dong Da<br>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;HCMC: 9th fl., International Plaza Building, 343 Pham Ngu Lao, Dist. 1
                          </div>
                          <div style="margin-top: 8px; color: #64748b; font-size: 11px;">
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">T</span> +84 287717789
                            <span style="color: #64748b; margin: 0 6px;">|</span>
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">E</span> <a href="mailto:contact@mindx.edu.vn" style="color: #64748b; text-decoration: none;">contact@mindx.edu.vn</a>
                            <span style="color: #64748b; margin: 0 6px;">|</span>
                            <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">W</span> <a href="https://mindx.edu.vn" style="color: #6366f1; text-decoration: none;" target="_blank">mindx.edu.vn</a>
                          </div>
                        </div>
                      </div>
                      <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 12px; color: #475569; text-align: center;">
                        Email này được gửi tự động từ hệ thống NA MindX Hub.
                      </div>
                    </div>
                  `
                });
                console.log(`[Notification Email]: Sent submission notification for ${fullName} to teacher ${targetTeacherName} (${teacherUser.email}).`);
              }
            }
          }
        } catch (mailErr: any) {
          console.error('[Notification Email Error]: Failed to send notification email.', mailErr.message);
        }
      })();
    }

    let successMessage = 'Đã lưu bài nộp thành công!';
    if (storageProvider === 'mega') {
      successMessage = 'Đã tải bài lên MEGA thành công!';
    } else if (storageProvider === 'google-drive') {
      successMessage = 'Đã tải bài lên Google Drive thành công!';
    }

    sendProgress({
      status: 'success',
      message: successMessage,
      files: fileDetails
    });
    res.end();

  } catch (error: any) {
    console.error('Error handling upload:', error);
    // Cleanup các file tạm còn sót lại nếu có lỗi
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file: Express.Multer.File) => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) { }
        }
      });
    }

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ status: 'error', error: error.message || 'Internal server error during upload.' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'Internal server error during upload.' });
    }
  }
});

// --- GỬI GÓP Ý QUA EMAIL ---
app.post('/api/feedback', async (req: Request, res: Response) => {
  try {
    const type = sanitize(req.body.type) || 'other';
    const message = sanitize(req.body.message);
    const senderName = (sanitize(req.body.name || '') || '').trim() || 'Ẩn danh';

    console.log('[Feedback Debug]: Received feedback request:', { type, message, senderName, rawName: req.body.name });

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Nội dung góp ý không được để trống.' });
    }

    const adminEmail = process.env.FEEDBACK_EMAIL;
    const smtpUser = process.env.FEEDBACK_EMAIL;

    const transporter = createMailTransporter();
    if (!transporter) {
      console.warn('[Feedback]: Email hoặc mật khẩu chưa được cấu hình.');
      return res.status(503).json({ error: 'Chức năng gửi góp ý chưa được cấu hình.' });
    }

    const typeLabel: Record<string, string> = {
      bug: '🐛 Báo lỗi',
      idea: '💡 Đề xuất cải tiến',
      other: '💬 Ý kiến khác',
    };
    const typeStr = typeLabel[type] || '💬 Góp ý';

    // Nhãn loại không có icon cho Tiêu đề Mail tránh spam filter
    const typeLabelNoIcon: Record<string, string> = {
      bug: 'Báo lỗi',
      idea: 'Đề xuất cải tiến',
      other: 'Ý kiến khác',
    };
    const typeStrNoIcon = typeLabelNoIcon[type] || 'Góp ý';

    // Phản hồi ngay lập tức cho người dùng, gửi mail bất đồng bộ (fire-and-forget)
    // Tránh treo trang khi SMTP chậm hoặc timeout trên production
    res.json({ message: 'Góp ý đã được ghi nhận. Cảm ơn bạn!' });

    // Gửi mail bất đồng bộ sau khi đã phản hồi
    transporter.sendMail({
      from: `"NA MindX Hub \u2014 Góp ý" <${smtpUser}>`,
      to: adminEmail,
      subject: `[Góp ý] ${typeStrNoIcon} — ${senderName} — NA MindX Hub`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; color: #f1f5f9;">
          <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px 28px;">
            <h2 style="margin: 0; font-size: 20px; color: #fff;">NA MindX Hub — Góp ý mới</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Bản gửi lúc ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <div style="padding: 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; width: 120px; vertical-align: top;">Người gửi:</td>
                <td style="padding: 10px 0; font-weight: 600; color: #f1f5f9;">${senderName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #94a3b8; width: 120px; vertical-align: top;">Loại:</td>
                <td style="padding: 10px 0; font-weight: 600; color: #f1f5f9;">${typeStr}</td>
              </tr>
            </table>
            <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #6366f1; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-top: 4px; font-size: 15px; line-height: 1.7; white-space: pre-wrap; color: #e2e8f0;">${message.trim()}</div>
            
            <!-- Chữ ký mặc định -->
            <div style="border-top: 1px dashed rgba(255,255,255,0.15); margin-top: 28px; padding-top: 20px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #f1f5f9; text-align: left;">
              <div style="margin-bottom: 4px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">HUỲNH NHẬT ANH</div>
              <div style="margin-bottom: 8px; color: #cbd5e1; font-weight: 500;">Mentor HCM4 - Team Teaching - MindX School</div>
              <div style="margin-bottom: 16px; color: #94a3b8; font-size: 12px;">
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">T</span> +84 778909082
                <span style="color: #94a3b8; margin: 0 8px;">|</span>
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">E</span> <a href="mailto:huynhnhatanh@mindx.net.vn" style="color: #38bdf8; text-decoration: underline;">huynhnhatanh@mindx.net.vn</a>
              </div>
              
              <div style="font-weight: bold; color: #ffffff; font-size: 13px; margin-bottom: 4px;">Trường học Công nghệ MindX</div>
              <div style="font-style: italic; color: #94a3b8; font-size: 12px; margin-bottom: 8px;">Be extraordinary</div>
              
              <div style="color: #64748b; font-size: 11px; line-height: 1.4;">
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">HO</span> Hanoi: 5th fl., 71 Nguyen Chi Thanh st, Dong Da<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;HCMC: 9th fl., International Plaza Building, 343 Pham Ngu Lao, Dist. 1
              </div>
              <div style="margin-top: 8px; color: #64748b; font-size: 11px;">
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">T</span> +84 287717789
                <span style="color: #64748b; margin: 0 6px;">|</span>
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">E</span> <a href="mailto:contact@mindx.edu.vn" style="color: #64748b; text-decoration: none;">contact@mindx.edu.vn</a>
                <span style="color: #64748b; margin: 0 6px;">|</span>
                <span style="color: #e31f26; font-weight: bold; margin-right: 4px;">W</span> <a href="https://mindx.edu.vn" style="color: #6366f1; text-decoration: none;" target="_blank">mindx.edu.vn</a>
              </div>
            </div>
          </div>
          <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 12px; color: #475569; text-align: center;">
            Email này được gửi tự động từ hệ thống NA MindX Hub. Không cần phản hồi lại email này.
          </div>
        </div>
      `,
    }).then(() => {
      console.log(`[Feedback]: Đã gửi góp ý loại "${type}" tới ${adminEmail}.`);
    }).catch((err: any) => {
      console.error('[Feedback Error]: Gửi mail thất bại.', err.message);
    });

  } catch (err: any) {
    console.error('[Feedback Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gửi góp ý thất bại. Vui lòng thử lại sau.' });
    }
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[server]: Backend is running at http://localhost:${PORT}`);
});
