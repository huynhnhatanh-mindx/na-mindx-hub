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

const upload = multer({ storage });

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

// Middleware xác thực quyền Admin
const adminAuth = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 2) {
      return res.status(401).json({ error: 'Mã phiên đăng nhập không hợp lệ.' });
    }
    const [username, role] = parts;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Mã xác thực không hợp lệ.' });
  }
};

// API Đăng nhập
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
    }

    const hashedPassword = hashPassword(password);

    // Fallback hỗ trợ login offline khi MongoDB bị ngắt kết nối
    if (!useMongoDB) {
      const configAdminPasscode = process.env.ADMIN_PASSCODE || 'admin123';
      if (username.trim() === 'admin' && password === configAdminPasscode) {
        const token = Buffer.from('admin:admin:offline').toString('base64');
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

    const tokenPayload = `${user.username}:${user.role}:${Date.now()}`;
    const token = Buffer.from(tokenPayload).toString('base64');

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
    const { username, password, role, displayName } = req.body;
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
      displayName
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

    res.json({ message: 'Tạo tài khoản thành công.', user: { username: newUser.username, role: newUser.role, displayName: newUser.displayName } });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo tài khoản: ' + err.message });
  }
});

app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { password, role, displayName } = req.body;
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
    await user.save();

    // Sync to Teacher collection
    if (oldRole === 'teacher' && user.role !== 'teacher') {
      // Role changed from teacher, delete from teachers
      await TeacherModel.deleteOne({ name: oldDisplayName.trim() });
      await ClassModel.updateMany({ teacherName: oldDisplayName.trim() }, { teacherName: 'Chưa phân công' });
    } else if (user.role === 'teacher') {
      if (oldRole === 'teacher' && oldDisplayName !== user.displayName) {
        // Name changed
        const teacher = await TeacherModel.findOne({ name: oldDisplayName.trim() });
        if (teacher) {
          teacher.name = user.displayName.trim();
          await teacher.save();
        } else {
          const newTeacher = new TeacherModel({ name: user.displayName.trim() });
          await newTeacher.save();
        }
        // Also update classes that use this teacher name
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
app.get('/api/admin/classes', adminAuth, async (req: Request, res: Response) => {
  try {
    const classes = await ClassModel.find({});
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách lớp học: ' + err.message });
  }
});

app.post('/api/admin/classes', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, teacherName, newTeacherUsername, newTeacherPassword } = req.body;
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

app.put('/api/admin/classes/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, teacherName, newTeacherUsername, newTeacherPassword } = req.body;
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

app.delete('/api/admin/classes/:id', adminAuth, async (req: Request, res: Response) => {
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
    const { name, username, password } = req.body;
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
    const { name, password } = req.body;
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
app.get('/api/admin/students', adminAuth, async (req: Request, res: Response) => {
  try {
    const students = await StudentModel.find({});
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});

app.post('/api/admin/students', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, className, studentCode } = req.body;
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

app.put('/api/admin/students/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, className, studentCode } = req.body;
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

app.delete('/api/admin/students/:id', adminAuth, async (req: Request, res: Response) => {
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
app.get('/api/admin/submissions', adminAuth, async (req: Request, res: Response) => {
  try {
    const submissions = await SubmissionModel.find({}).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách bài nộp: ' + err.message });
  }
});

app.delete('/api/admin/submissions/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const submission = await SubmissionModel.findByIdAndDelete(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Không tìm thấy bài nộp.' });
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
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length >= 2) {
          const [username, role] = parts;
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
      } catch (e) { }
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
app.post('/api/upload', upload.array('files', 10), async (req: Request, res: Response) => {
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

// Start Server
app.listen(PORT, () => {
  console.log(`[server]: Backend is running at http://localhost:${PORT}`);
});
