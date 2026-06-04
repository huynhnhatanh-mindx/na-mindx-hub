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

// Helper to create nodemailer transporter based on env configs (supports Gmail & Custom SMTP like Bizfly)
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
  teacherName: { type: String, required: true },
  startDate: { type: Date },
  startTime: { type: String, default: "08:00" },
  endTime: { type: String, default: "10:00" },
  checkpoint1StartDate: { type: Date },
  checkpoint1Deadline: { type: Date },
  checkpoint2StartDate: { type: Date },
  checkpoint2Deadline: { type: Date },
  finalProjectStartDate: { type: Date },
  finalProjectDeadline: { type: Date },
  allowLateUpload: { type: Boolean, default: false }
});
const ClassModel = mongoose.model('Class', classSchema);

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  className: { type: String, required: true },
  studentCode: { type: String, required: true, unique: true },
  maxUploadSize: { type: Number, default: 20 }, // Limit in MB
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
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
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
const UserModel = mongoose.model('User', userSchema);

// Audit Log Schema
// QUAN TRONG: Audit log la bat bien - khong tao API xoa hoac sua audit logs.
// Muc dich: Ghi nhan lich su thao tac de truy vet, khong ai (ke ca admin) co quyen xoa.
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },   // CREATE, UPDATE, DELETE, BULK_DELETE, UPLOAD, PROFILE_UPDATE...
  resource: { type: String, required: true }, // User, Class, Teacher, Student, Submission, Profile, Upload
  details: { type: String, required: true },  // Mo ta chi tiet thao tac
  user: { type: String, required: true },     // Username nguoi thuc hien
  role: { type: String, default: 'unknown' }, // Quyen han: admin, teacher, student, system
  createdAt: { type: Date, default: Date.now }
});
const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);

// Ham ghi nhat ky hoat dong - su dung o moi endpoint anh huong den database
async function logAudit(action: string, resource: string, details: string, user: string, role: string = 'unknown') {
  try {
    if (mongoose.connection.readyState === 1) {
      const log = new AuditLogModel({ action, resource, details, user, role });
      await log.save();
    }
  } catch (err) {
    console.error('Error saving audit log:', err);
  }
}

// Helper function to build paginated responses
async function buildPaginatedResponse(model: any, query: any, page: number, limit: number, sort: any = { _id: -1 }) {
  const skip = (page - 1) * limit;
  const data = await model.find(query).sort(sort).skip(skip).limit(limit);
  const totalItems = await model.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data,
    currentPage: page,
    totalPages,
    totalItems
  };
}

function normalizeUsername(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]/g, '') // Remove spaces and special chars
    .toLowerCase()
    .trim();
}

async function generateStudentCode(name: string): Promise<string> {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const parts = cleanName.split(' ');
  if (parts.length === 0 || !parts[0]) return 'hv';
  const firstName = parts[parts.length - 1];
  const otherParts = parts.slice(0, parts.length - 1);
  
  const cleanFirstName = normalizeUsername(firstName);
  const cleanOtherInitials = otherParts
    .map(word => normalizeUsername(word)[0] || '')
    .join('');
    
  const baseCode = cleanFirstName + cleanOtherInitials;
  
  let finalCode = baseCode || 'hv';
  let counter = 1;
  while (await StudentModel.findOne({ studentCode: finalCode })) {
    finalCode = `${baseCode}${counter}`;
    counter++;
  }
  return finalCode;
}

function parseVietnamDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  
  if (typeof dateInput === 'string') {
    const cleanInput = dateInput.trim();
    // Match yyyy-mm-dd or yyyy-mm-ddThh:mm without timezone info
    // We check for timezone offset only at the end of the string to avoid matching the dashes in yyyy-mm-dd
    if (!cleanInput.includes('Z') && !cleanInput.match(/([+-]\d{2}:\d{2}|[+-]\d{2})$/) && cleanInput.match(/^\d{4}-\d{2}-\d{2}/)) {
      if (cleanInput.includes('T')) {
        // e.g. "2026-06-03T19:30"
        const parts = cleanInput.split(':');
        const formatted = parts.length === 2 ? `${cleanInput}:00` : cleanInput;
        return new Date(`${formatted}+07:00`);
      } else {
        // e.g. "2026-06-03"
        return new Date(`${cleanInput}T00:00:00+07:00`);
      }
    }
  }
  return d;
}

function calculateVietnamDeadline(baseDate: Date, daysOffset: number, endTimeStr: string): Date {
  const targetDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(targetDate);
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  
  const [hStr, mStr] = (endTimeStr || "10:00").split(":");
  const hours = (hStr || "10").padStart(2, '0');
  const minutes = (mStr || "00").padStart(2, '0');
  
  const isoStr = `${year}-${month}-${day}T${hours}:${minutes}:00+07:00`;
  return new Date(isoStr);
}

function formatVietnamDateTime(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  const hour = parts.find(p => p.type === 'hour')?.value || '10';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  
  return `${hour}:${minute} ngày ${day}/${month}/${year}`;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createTeacherWithAccount(
  name: string,
  username?: string,
  password?: string,
  displayName?: string,
  performedBy?: string,
  performedByRole?: string
) {
  if (!useMongoDB) return;
  const nameClean = name.trim();
  if (nameClean === 'Chưa phân công' || nameClean === '') return;

  // 1. Ensure teacher record exists — log if newly created
  let teacher = await TeacherModel.findOne({ name: nameClean });
  if (!teacher) {
    teacher = new TeacherModel({ name: nameClean });
    await teacher.save();
    // Ghi log nếu có người thực hiện (không phải auto-migration lúc khởi động)
    if (performedBy) {
      await logAudit(
        'CREATE',
        'Teacher',
        `Tạo giáo viên mới: ${nameClean} (tạo kèm lúc thêm lớp học)`,
        performedBy,
        performedByRole || 'unknown'
      );
    }
  }

  // 2. Ensure user account exists — log if newly created
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
      password: password && password.trim() !== '' ? hashPassword(password) : hashPassword(`Mindx@${new Date().getFullYear()}`),
      role: 'teacher',
      displayName: displayName && displayName.trim() !== '' ? displayName.trim() : nameClean
    });
    await newUser.save();
    console.log(`[Database]: Tự động tạo tài khoản ${finalUsername} cho giáo viên ${nameClean}`);
    // Ghi log tạo tài khoản giáo viên nếu có người thực hiện
    if (performedBy) {
      await logAudit(
        'CREATE',
        'User',
        `Tự động tạo tài khoản: ${finalUsername} (teacher - ${nameClean}, tạo kèm lúc thêm lớp/giáo viên)`,
        performedBy,
        performedByRole || 'unknown'
      );
    }
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
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
      // 1. Lấy danh sách giáo viên ĐANG HOẠT ĐỘNG từ UserModel
      const activeTeachers = await UserModel.find({ role: 'teacher', status: 'active' });
      const activeTeacherNames = activeTeachers.map(t => t.displayName);

      // 2. Lấy danh sách giáo viên BỊ KHÓA từ UserModel
      const inactiveTeachers = await UserModel.find({ role: 'teacher', status: 'inactive' });
      const inactiveTeacherNames = inactiveTeachers.map(t => t.displayName);

      // 3. Lấy thêm các giáo viên trong TeacherModel (những người chưa có tài khoản User)
      // Loại trừ những người bị khóa và những người đã có trong danh sách active
      const otherTeachers = await TeacherModel.find({
        name: { $nin: [...activeTeacherNames, ...inactiveTeacherNames] }
      });
      const otherTeacherNames = otherTeachers.map(t => t.name);
      
      const allTeacherNames = [...activeTeacherNames, ...otherTeacherNames];
      res.json(allTeacherNames);
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
      if (req.query.full === 'true') {
        res.json(classes);
      } else {
        res.json(classes.map(c => c.name));
      }
    } else {
      // Fallback khi chạy offline
      const fallbackMap: Record<string, string[]> = {
        'Huỳnh Nhật Anh': ['HCM4', 'HCM1'],
        'Nguyễn Văn A': ['HCM2'],
        'Trần Thị B': ['HCM3']
      };
      if (req.query.full === 'true') {
        // Return dummy class structures
        const list = teacherNameStr ? (fallbackMap[teacherNameStr] || []) : ['HCM4', 'HCM1', 'HCM2', 'HCM3'];
        res.json(list.map(name => ({
          _id: name,
          name,
          teacherName: teacherNameStr || 'Huỳnh Nhật Anh',
          allowLateUpload: false
        })));
      } else {
        if (teacherNameStr) {
          res.json(fallbackMap[teacherNameStr] || []);
        } else {
          res.json(['HCM4', 'HCM1', 'HCM2', 'HCM3']);
        }
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
      res.json(students.map(s => ({
        name: s.name,
        maxUploadSize: (s as any).maxUploadSize !== undefined ? (s as any).maxUploadSize : 20
      })));
    } else {
      // Fallback khi chạy offline
      const fallbackMap: Record<string, string[]> = {
        'HCM4': ['Nguyễn Văn Nam', 'Trần Thị Mai'],
        'HCM1': ['Lê Hoàng Long', 'Phạm Minh Đức'],
        'HCM2': ['Hoàng Văn C', 'Trần Thị D'],
        'HCM3': ['Phan Văn E', 'Đỗ Thị F']
      };
      const names = classNameStr ? (fallbackMap[classNameStr] || []) : ['Nguyễn Văn Nam', 'Trần Thị Mai', 'Lê Hoàng Long', 'Phạm Minh Đức', 'Hoàng Văn C', 'Trần Thị D', 'Phan Văn E', 'Đỗ Thị F'];
      res.json(names.map(name => ({
        name,
        maxUploadSize: 20
      })));
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
    if (parts.length < 3) return null;
    
    // Check expiration (24 hours)
    const tokenTime = parseInt(parts[2], 10);
    const EXPIRATION_TIME = 24 * 60 * 60 * 1000;
    if (Date.now() - tokenTime > EXPIRATION_TIME) {
      return null;
    }
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
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
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
    const { username, role } = (req as any).user;
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

    const changes: string[] = [];
    if (displayName && displayName.trim() !== '' && displayName.trim() !== oldDisplayName) {
      changes.push(`Tên hiển thị: "${oldDisplayName}" → "${displayName.trim()}"`);
      user.displayName = displayName.trim();
    }
    if (password && password.trim() !== '') {
      changes.push('Đã thay đổi mật khẩu');
      user.password = hashPassword(password);
    }
    if (typeof email === 'string') {
      if (email.trim().toLowerCase() !== (user.email || '')) {
        changes.push(`Email: "${user.email || '(chưa có)'}" → "${email.trim().toLowerCase() || '(xóa)'}"`);
      }
      user.email = email.trim().toLowerCase();
    }

    await user.save();

    // Ghi log thao tác cập nhật profile
    const changeDetails = changes.length > 0 ? changes.join('; ') : 'Không có thay đổi nào';
    await logAudit('PROFILE_UPDATE', 'Profile', `Cập nhật hồ sơ cá nhân (${username}): ${changeDetails}`, username, role);

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }
    const response = await buildPaginatedResponse(UserModel, query, page, limit);
    response.data = response.data.map((u: any) => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    });
    res.json(response);
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

    await logAudit('CREATE', 'User', `Tạo tài khoản: ${newUser.username} (${role}, tên: ${displayName})`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Tạo tài khoản thành công.', user: { username: newUser.username, role: newUser.role, displayName: newUser.displayName, email: newUser.email } });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tạo tài khoản: ' + err.message });
  }
});

app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    const role = sanitize(req.body.role);
    const displayName = sanitize(req.body.displayName);
    const email = sanitize(req.body.email);
    const status = sanitize(req.body.status);
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    const reqUser = (req as any).user;

    // Check if renaming the admin account
    if (user.username === 'admin' && username && username.trim().toLowerCase() !== 'admin') {
      return res.status(400).json({ error: 'Không thể thay đổi tên đăng nhập của tài khoản admin hệ thống.' });
    }

    // Check username uniqueness if changed
    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await UserModel.findOne({ username: cleanUsername });
      if (existing) {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại trên hệ thống.' });
      }
      user.username = cleanUsername;
    }

    // Logic: Không cho phép khóa tài khoản ngang cấp hoặc chính mình
    if (status === 'inactive') {
      if (user.username === reqUser.username) {
        return res.status(400).json({ error: 'Không thể tự khóa tài khoản của chính mình.' });
      }
      if (user.role === 'admin' && reqUser.role === 'admin' && user.username !== reqUser.username) {
        return res.status(400).json({ error: 'Không thể khóa tài khoản của quản trị viên khác ngang cấp.' });
      }
    }

    if (user.username === 'admin' && role && role !== 'admin') {
      return res.status(400).json({ error: 'Không thể hạ quyền của tài khoản admin tối cao.' });
    }

    // Logic: Nếu tự hạ quyền của chính mình, phải đảm bảo còn ít nhất 1 admin khác đang hoạt động
    if (user.username === reqUser.username && user.role === 'admin' && role && role !== 'admin') {
      const activeAdminCount = await UserModel.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: 'Bạn là Quản trị viên duy nhất còn lại. Vui lòng cấp quyền Quản trị cho một tài khoản khác trước khi tự hạ cấp.' });
      }
    }

    const oldDisplayName = user.displayName;
    const oldRole = user.role;

    if (password && password.trim() !== '') {
      user.password = hashPassword(password);
    }
    if (role) user.role = role;
    if (displayName) user.displayName = displayName;
    if (typeof email === 'string') user.email = email.trim().toLowerCase();
    if (status) user.status = status;
    await user.save();
    await logAudit('UPDATE', 'User', `Cập nhật tài khoản: ${user.username}`, (req as any).user.username, (req as any).user.role);

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

    const reqUser = (req as any).user;
    if (user.username === reqUser.username) {
      return res.status(400).json({ error: 'Không thể tự xóa tài khoản của chính mình.' });
    }
    if (user.role === 'admin' && reqUser.role === 'admin') {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của quản trị viên khác.' });
    }

    const userRole = user.role;
    const userDisplayName = user.displayName;

    await UserModel.findByIdAndDelete(req.params.id);
    await logAudit('DELETE', 'User', `Xóa tài khoản: ${user.username} (${userRole}, tên: ${userDisplayName})`, reqUser.username, reqUser.role);

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

app.post('/api/admin/users/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    // Check if trying to delete self or admin
    const reqUser = (req as any).user;
    const usersToDelete = await UserModel.find({ _id: { $in: ids } });
    
    for (const u of usersToDelete) {
      if (u.username === reqUser.username) {
        return res.status(400).json({ error: 'Không thể tự xóa tài khoản của chính mình trong danh sách hàng loạt.' });
      }
      if (u.username === 'admin') {
        return res.status(400).json({ error: 'Không thể xóa tài khoản admin hệ thống.' });
      }
      if (u.role === 'admin' && reqUser.role === 'admin') {
        return res.status(400).json({ error: 'Không thể xóa tài khoản của quản trị viên khác.' });
      }
    }

    for (const user of usersToDelete) {
      if (user.role === 'teacher') {
        await TeacherModel.deleteOne({ name: user.displayName.trim() });
        await ClassModel.updateMany({ teacherName: user.displayName.trim() }, { teacherName: 'Chưa phân công' });
      }
    }

    await UserModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'User', `Xóa ${ids.length} tài khoản hàng loạt`, reqUser.username, reqUser.role);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});

app.post('/api/admin/users/bulk-update-status', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    }
    
    const reqUser = (req as any).user;
    const usersToUpdate = await UserModel.find({ _id: { $in: ids } });
    
    for (const u of usersToUpdate) {
      if (status === 'inactive' && u.username === reqUser.username) {
        return res.status(400).json({ error: 'Không thể tự khóa tài khoản của chính mình.' });
      }
      if (status === 'inactive' && u.username === 'admin') {
        return res.status(400).json({ error: 'Không thể khóa tài khoản admin hệ thống.' });
      }
    }
    
    await UserModel.updateMany({ _id: { $in: ids } }, { status });
    await logAudit('BULK_UPDATE_STATUS', 'User', `Cập nhật trạng thái "${status}" cho ${ids.length} tài khoản`, reqUser.username, reqUser.role);
    res.json({ message: 'Cập nhật trạng thái hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật hàng loạt: ' + err.message });
  }
});

// API CRUD LỚP HỌC (Classes)
app.get('/api/admin/classes', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      query.teacherName = teacherName;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const response = await buildPaginatedResponse(ClassModel, query, page, limit);
    
    // Add student count to each class
    const classesWithCount = await Promise.all(response.data.map(async (cls: any) => {
      const studentCount = await StudentModel.countDocuments({ className: cls.name });
      return {
        ...cls.toObject(),
        studentCount
      };
    }));

    res.json({
      ...response,
      data: classesWithCount
    });
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

    const startDate = req.body.startDate ? parseVietnamDate(req.body.startDate) : undefined;
    const startTime = sanitize(req.body.startTime) || "08:00";
    const endTime = sanitize(req.body.endTime) || "10:00";
    const checkpoint1StartDate = req.body.checkpoint1StartDate ? parseVietnamDate(req.body.checkpoint1StartDate) : undefined;
    const checkpoint1Deadline = req.body.checkpoint1Deadline ? parseVietnamDate(req.body.checkpoint1Deadline) : undefined;
    const checkpoint2StartDate = req.body.checkpoint2StartDate ? parseVietnamDate(req.body.checkpoint2StartDate) : undefined;
    const checkpoint2Deadline = req.body.checkpoint2Deadline ? parseVietnamDate(req.body.checkpoint2Deadline) : undefined;
    const finalProjectStartDate = req.body.finalProjectStartDate ? parseVietnamDate(req.body.finalProjectStartDate) : undefined;
    const finalProjectDeadline = req.body.finalProjectDeadline ? parseVietnamDate(req.body.finalProjectDeadline) : undefined;
    const allowLateUpload = req.body.allowLateUpload === true;

    if (!name || !teacherName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên lớp và tên giáo viên.' });
    }
    const cleanClassName = name.trim().toUpperCase();
    const existing = await ClassModel.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'Tên lớp học đã tồn tại.' });
    }

    await createTeacherWithAccount(teacherName.trim(), newTeacherUsername, newTeacherPassword, undefined, (req as any).user.username, (req as any).user.role);

    const newClass = new ClassModel({
      name: cleanClassName,
      teacherName: teacherName.trim(),
      startDate,
      startTime,
      endTime,
      checkpoint1StartDate,
      checkpoint1Deadline,
      checkpoint2StartDate,
      checkpoint2Deadline,
      finalProjectStartDate,
      finalProjectDeadline,
      allowLateUpload
    });
    await newClass.save();
    await logAudit('CREATE', 'Class', `Tạo lớp học: ${newClass.name} (giáo viên: ${teacherName.trim()})`, (req as any).user.username, (req as any).user.role);
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

    const startDate = req.body.startDate === null || req.body.startDate === '' ? null : (req.body.startDate ? parseVietnamDate(req.body.startDate) : undefined);
    const startTime = req.body.startTime !== undefined ? sanitize(req.body.startTime) : undefined;
    const endTime = req.body.endTime !== undefined ? sanitize(req.body.endTime) : undefined;
    const checkpoint1StartDate = req.body.checkpoint1StartDate === null || req.body.checkpoint1StartDate === '' ? null : (req.body.checkpoint1StartDate ? parseVietnamDate(req.body.checkpoint1StartDate) : undefined);
    const checkpoint1Deadline = req.body.checkpoint1Deadline === null || req.body.checkpoint1Deadline === '' ? null : (req.body.checkpoint1Deadline ? parseVietnamDate(req.body.checkpoint1Deadline) : undefined);
    const checkpoint2StartDate = req.body.checkpoint2StartDate === null || req.body.checkpoint2StartDate === '' ? null : (req.body.checkpoint2StartDate ? parseVietnamDate(req.body.checkpoint2StartDate) : undefined);
    const checkpoint2Deadline = req.body.checkpoint2Deadline === null || req.body.checkpoint2Deadline === '' ? null : (req.body.checkpoint2Deadline ? parseVietnamDate(req.body.checkpoint2Deadline) : undefined);
    const finalProjectStartDate = req.body.finalProjectStartDate === null || req.body.finalProjectStartDate === '' ? null : (req.body.finalProjectStartDate ? parseVietnamDate(req.body.finalProjectStartDate) : undefined);
    const finalProjectDeadline = req.body.finalProjectDeadline === null || req.body.finalProjectDeadline === '' ? null : (req.body.finalProjectDeadline ? parseVietnamDate(req.body.finalProjectDeadline) : undefined);
    const allowLateUpload = req.body.allowLateUpload !== undefined ? req.body.allowLateUpload === true : undefined;

    const cls = await ClassModel.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
    }

    if (name && name.trim().toUpperCase() !== cls.name.toUpperCase()) {
      const existing = await ClassModel.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i') } });
      if (existing) {
        return res.status(400).json({ error: 'Tên lớp học mới đã tồn tại.' });
      }
      const oldName = cls.name;
      cls.name = name.trim().toUpperCase();
      
      // Đồng bộ tên lớp mới cho học viên và các bài nộp cũ
      await StudentModel.updateMany({ className: oldName }, { className: cls.name });
      await SubmissionModel.updateMany({ className: oldName }, { className: cls.name });
    }
    if (teacherName) {
      cls.teacherName = teacherName.trim();
      await createTeacherWithAccount(teacherName.trim(), newTeacherUsername, newTeacherPassword, undefined, (req as any).user.username, (req as any).user.role);
    }

    if (startDate !== undefined) (cls as any).startDate = startDate;
    if (startTime !== undefined) (cls as any).startTime = startTime;
    if (endTime !== undefined) (cls as any).endTime = endTime;
    if (checkpoint1StartDate !== undefined) (cls as any).checkpoint1StartDate = checkpoint1StartDate;
    if (checkpoint1Deadline !== undefined) (cls as any).checkpoint1Deadline = checkpoint1Deadline;
    if (checkpoint2StartDate !== undefined) (cls as any).checkpoint2StartDate = checkpoint2StartDate;
    if (checkpoint2Deadline !== undefined) (cls as any).checkpoint2Deadline = checkpoint2Deadline;
    if (finalProjectStartDate !== undefined) (cls as any).finalProjectStartDate = finalProjectStartDate;
    if (finalProjectDeadline !== undefined) (cls as any).finalProjectDeadline = finalProjectDeadline;
    if (allowLateUpload !== undefined) (cls as any).allowLateUpload = allowLateUpload;

    await cls.save();
    await logAudit('UPDATE', 'Class', `Cập nhật lớp học: ${cls.name}`, (req as any).user.username, (req as any).user.role);
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

    await logAudit('DELETE', 'Class', `Xóa lớp học: ${cls.name}`, (req as any).user.username, (req as any).user.role);

    // Xóa liên kết lớp của các học viên thuộc lớp này
    await StudentModel.updateMany({ className: cls.name }, { className: 'Chưa phân công lớp' });

    res.json({ message: 'Xóa lớp học thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa lớp học: ' + err.message });
  }
});

app.post('/api/admin/classes/bulk-delete', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    const classesToDelete = await ClassModel.find({ _id: { $in: ids } });
    const classNames = classesToDelete.map(c => c.name);
    await StudentModel.updateMany({ className: { $in: classNames } }, { className: 'Chưa phân công lớp' });
    
    await ClassModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Class', `Xóa ${ids.length} lớp học hàng loạt`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});

// API CRUD GIÁO VIÊN (Teachers)
app.get('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const response = await buildPaginatedResponse(TeacherModel, query, page, limit);
    res.json(response);
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

    await logAudit('CREATE', 'Teacher', `Tạo giáo viên: ${savedTeacher?.name}`, (req as any).user.username, (req as any).user.role);
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
    await logAudit('UPDATE', 'Teacher', `Cập nhật giáo viên: ${teacher.name}`, (req as any).user.username, (req as any).user.role);
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
    await logAudit('DELETE', 'Teacher', `Xóa giáo viên: ${teacherName}`, (req as any).user.username, (req as any).user.role);

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

app.post('/api/admin/teachers/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    const teachersToDelete = await TeacherModel.find({ _id: { $in: ids } });
    const teacherNames = teachersToDelete.map(t => t.name);
    
    if (useMongoDB) {
      await UserModel.deleteMany({ displayName: { $in: teacherNames }, role: 'teacher' });
    }
    await ClassModel.updateMany({ teacherName: { $in: teacherNames } }, { teacherName: 'Chưa phân công' });
    
    await TeacherModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Teacher', `Xóa ${ids.length} giáo viên hàng loạt`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});

// API CRUD HỌC VIÊN (Students)
app.get('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    const classNameFilter = req.query.className as string;

    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      
      if (classNameFilter) {
        if (classNames.includes(classNameFilter.trim())) {
          query.className = classNameFilter.trim();
        } else {
          return res.status(403).json({ error: 'Bạn không có quyền truy cập dữ liệu lớp này.' });
        }
      } else {
        query.className = { $in: classNames };
      }
    } else {
      if (classNameFilter) {
        query.className = classNameFilter.trim();
      }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } },
        { studentCode: { $regex: search, $options: 'i' } }
      ];
    }
    
    const response = await buildPaginatedResponse(StudentModel, query, page, limit);
    
    response.data = await Promise.all(response.data.map(async (student: any) => {
      const studentObj = student.toObject ? student.toObject() : student;
      const submissionCount = await SubmissionModel.countDocuments({ fullName: studentObj.name, className: studentObj.className });
      return { ...studentObj, submissionCount };
    }));

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});

app.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const leaderboard = await SubmissionModel.aggregate([
      {
        $group: {
          _id: { fullName: '$fullName', className: '$className' },
          submissionCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          fullName: '$_id.fullName',
          className: '$_id.className',
          submissionCount: 1
        }
      },
      {
        $sort: { submissionCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải bảng xếp hạng: ' + err.message });
  }
});

app.post('/api/admin/students/bulk-update-status', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    }
    await StudentModel.updateMany({ _id: { $in: ids } }, { status });
    await logAudit('BULK_UPDATE_STATUS', 'Student', `Cập nhật trạng thái "${status}" cho ${ids.length} học viên`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Cập nhật trạng thái hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi cập nhật hàng loạt: ' + err.message });
  }
});

app.post('/api/admin/students/bulk-delete', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    await StudentModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Student', `Xóa ${ids.length} học viên hàng loạt`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});

app.post('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const name = sanitize(req.body.name);
    const className = sanitize(req.body.className);
    const studentCode = sanitize(req.body.studentCode);
    const userRole = (req as any).user.role;
    const maxUploadSize = userRole === 'admin' && req.body.maxUploadSize !== undefined
      ? Number(req.body.maxUploadSize)
      : 20;

    if (!name || !className) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên học viên và lớp học.' });
    }

    let finalStudentCode = studentCode && studentCode.trim() !== '' ? studentCode.trim() : '';
    if (!finalStudentCode) {
      finalStudentCode = await generateStudentCode(name);
    } else {
      const codeExisting = await StudentModel.findOne({ studentCode: finalStudentCode });
      if (codeExisting) {
        return res.status(400).json({ error: 'Mã tra cứu học viên đã tồn tại.' });
      }
    }

    // Auto-create class if not exists
    let finalClassName = className.trim().toUpperCase();
    if (useMongoDB) {
      const classExisting = await ClassModel.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(className.trim())}$`, 'i') } });
      if (!classExisting) {
        const newClass = new ClassModel({
          name: finalClassName,
          teacherName: 'Chưa phân công'
        });
        await newClass.save();
      } else {
        finalClassName = classExisting.name;
      }
    }

    const newStudent = new StudentModel({
      name: name.trim(),
      className: finalClassName,
      studentCode: finalStudentCode,
      maxUploadSize: maxUploadSize
    });
    await newStudent.save();
    await logAudit('CREATE', 'Student', `Tạo học viên: ${newStudent.name} (lớp: ${newStudent.className}, mã: ${newStudent.studentCode})`, (req as any).user.username, (req as any).user.role);
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
    const status = sanitize(req.body.status);
    const userRole = (req as any).user.role;

    const student = await StudentModel.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Không tìm thấy học viên.' });
    }
    let finalStudentCode = studentCode && studentCode.trim() !== '' ? studentCode.trim() : '';
    if (!finalStudentCode) {
      finalStudentCode = await generateStudentCode(name || student.name);
    }
    
    if (finalStudentCode !== student.studentCode) {
      const codeExisting = await StudentModel.findOne({ studentCode: finalStudentCode });
      if (codeExisting) {
        return res.status(400).json({ error: 'Mã tra cứu học viên mới đã tồn tại.' });
      }
      student.studentCode = finalStudentCode;
    }
    if (name) student.name = name.trim();
    if (className) {
      let finalClassName = className.trim().toUpperCase();

      // Auto-create class if not exists
      if (useMongoDB) {
        const classExisting = await ClassModel.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(className.trim())}$`, 'i') } });
        if (!classExisting) {
          const newClass = new ClassModel({
            name: finalClassName,
            teacherName: 'Chưa phân công'
          });
          await newClass.save();
        } else {
          finalClassName = classExisting.name;
        }
      }
      student.className = finalClassName;
    }
    
    if (userRole === 'admin' && req.body.maxUploadSize !== undefined) {
      (student as any).maxUploadSize = Number(req.body.maxUploadSize);
    }
    
    if (status) {
      student.status = status;
    }

    await student.save();
    await logAudit('UPDATE', 'Student', `Cập nhật học viên: ${student.name} (lớp: ${student.className})`, (req as any).user.username, (req as any).user.role);
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
    await logAudit('DELETE', 'Student', `Xóa học viên: ${student.name} (lớp: ${student.className})`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Xóa học viên thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa học viên: ' + err.message });
  }
});

// API CRUD BÀI NỘP (Submissions)
app.get('/api/admin/submissions', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      query.teacher = teacherName;
    }
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } }
      ];
    }
    const response = await buildPaginatedResponse(SubmissionModel, query, page, limit, { createdAt: -1 });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách bài nộp: ' + err.message });
  }
});

app.post('/api/admin/submissions/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    await SubmissionModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Submission', `Xóa ${ids.length} bản ghi bài nộp hàng loạt`, (req as any).user.username, (req as any).user.role);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
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

    await logAudit('DELETE', 'Submission', `Xóa bài nộp: ${submission.fileName} (học viên: ${submission.fullName}, lớp: ${submission.className})`, (req as any).user.username, (req as any).user.role);
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
          studentCode: { $regex: new RegExp(`^${escapeRegExp(trimmedCode)}$`, 'i') }
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
        return res.status(400).json({ error: 'Tệp tin vượt quá kích thước giới hạn hệ thống cho phép (tối đa 500MB).' });
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

    const fullName = sanitize(req.body.fullName || 'N/A').trim();
    const className = sanitize(req.body.className || 'N/A').trim();

    // Check size limit dynamically based on student
    let maxUploadSizeMB = 20; // default
    if (useMongoDB && fullName !== 'N/A' && className !== 'N/A') {
      const student = await StudentModel.findOne({ name: fullName, className: className });
      if (student) {
        if (student.status === 'inactive') {
          for (const f of files) {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
          return res.status(403).json({ error: 'Tài khoản học viên đang bị khóa. Bạn không thể nộp bài, vui lòng liên hệ Admin hoặc Giáo viên.' });
        }
        if ((student as any).maxUploadSize !== undefined) {
          maxUploadSizeMB = (student as any).maxUploadSize;
        }
      }
    }

    const limitBytes = maxUploadSizeMB * 1024 * 1024;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > limitBytes) {
      // Delete temporary files written by Multer
      for (const f of files) {
        if (fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
        }
      }
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        error: `Tổng dung lượng các tệp tin tải lên (${totalSizeMB}MB) vượt quá giới hạn cho phép của học viên ${fullName} (tối đa ${maxUploadSizeMB}MB).`
      });
    }

    // Check deadline for class submissions
    if (useMongoDB && className !== 'N/A') {
      const cls = await ClassModel.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(className)}$`, 'i') } });
      if (cls) {
        const stage = sanitize(req.body.stage || 'N/A').trim();
        const stageLower = stage.toLowerCase();
        // Ignore theory lessons
        const isTheory = stageLower.includes('ly thuyet') || stageLower.includes('lý thuyết') || stageLower.includes('theory');
        
        if (!isTheory) {
          let startDeadline: Date | null = null;
          let endDeadline: Date | null = null;

          if (stageLower.includes('checkpoint 1')) {
            startDeadline = (cls as any).checkpoint1StartDate ? parseVietnamDate((cls as any).checkpoint1StartDate) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 28, cls.startTime || "08:00") : null);
            endDeadline = cls.checkpoint1Deadline ? parseVietnamDate(cls.checkpoint1Deadline) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 28, cls.endTime || "10:00") : null);
          } else if (stageLower.includes('checkpoint 2')) {
            startDeadline = (cls as any).checkpoint2StartDate ? parseVietnamDate((cls as any).checkpoint2StartDate) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 56, cls.startTime || "08:00") : null);
            endDeadline = cls.checkpoint2Deadline ? parseVietnamDate(cls.checkpoint2Deadline) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 56, cls.endTime || "10:00") : null);
          } else if (stageLower.includes('san pham cuoi khoa') || stageLower.includes('sản phẩm cuối khóa')) {
            startDeadline = (cls as any).finalProjectStartDate ? parseVietnamDate((cls as any).finalProjectStartDate) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 0, cls.startTime || "08:00") : null);
            endDeadline = cls.finalProjectDeadline ? parseVietnamDate(cls.finalProjectDeadline) : (cls.startDate ? calculateVietnamDeadline(cls.startDate, 85, cls.endTime || "10:00") : null);
          }

          if (startDeadline && new Date() < startDeadline) {
            for (const f of files) {
              if (fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
              }
            }
            const formattedStart = formatVietnamDateTime(startDeadline);
            return res.status(403).json({
              error: `Chưa đến thời gian mở cổng nộp bài cho giai đoạn này (${stage}). Cổng nộp bài sẽ mở vào lúc: ${formattedStart}.`
            });
          }

          if (endDeadline && new Date() > endDeadline && !cls.allowLateUpload) {
            for (const f of files) {
              if (fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
              }
            }
            const formattedDeadline = formatVietnamDateTime(endDeadline);
            return res.status(403).json({
              error: `Đã quá hạn nộp bài cho giai đoạn này (${stage}). Hạn chót là: ${formattedDeadline}. Cổng nộp bài đã đóng.`
            });
          }
        }
      }
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
    const stage = sanitize(req.body.stage || 'N/A').trim();
    const session = sanitize(req.body.session || 'N/A').trim();

    const fileDetails: any[] = [];
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

    // Ghi nhận hành động nộp bài vào audit log
    // Dùng tên học viên làm 'user' vì đây là hành động của học viên (không xác thực)
    const fileNamesList = fileDetails.map(f => f.originalName).join(', ');
    await logAudit(
      'UPLOAD',
      'Submission',
      `Nộp bài: ${fullName} | Lớp: ${className} | ${stage} - ${session} | Lần ${attemptNumber} | File: ${fileNamesList}`,
      fullName,
      'student'
    );

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

// API Audit Logs - Xem nhat ky hoat dong
// CHINH SACH BAO MAT: Khong tao endpoint DELETE/PUT cho audit logs.
// Audit log la bat bien de dam bao tinh toan ven cua lich su thao tac.
app.get('/api/admin/audit-logs', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const resourceFilter = req.query.resource as string;

    const query: any = {};
    const conditions: any[] = [];

    // Admin thấy toàn bộ log, Teacher chỉ thấy log của chính mình hoặc của admin
    if (role === 'teacher') {
      conditions.push({
        $or: [
          { user: username },
          { role: 'admin' }
        ]
      });
    }

    // Bộ lọc tìm kiếm theo nội dung
    if (search) {
      conditions.push({
        $or: [
          { user: { $regex: search, $options: 'i' } },
          { details: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    // Bộ lọc theo loại tài nguyên
    if (resourceFilter) {
      query.resource = resourceFilter;
    }

    const response = await buildPaginatedResponse(AuditLogModel, query, page, limit, { createdAt: -1 });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải nhật ký hoạt động: ' + err.message });
  }
});
// GHI CHU: Khong co endpoint DELETE /api/admin/audit-logs - Day la thiet ke co y dinh.

// API Thống kê Dashboard
app.get('/api/admin/dashboard-stats', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      
      const totalClasses = teacherClasses.length;
      const totalStudents = await StudentModel.countDocuments({ className: { $in: classNames } });
      const totalSubmissions = await SubmissionModel.countDocuments({ teacher: teacherName });
      
      return res.json({
        users: 0,
        teachers: 0,
        classes: totalClasses,
        students: totalStudents,
        submissions: totalSubmissions
      });
    }
    
    const totalUsers = await UserModel.countDocuments({});
    const totalTeachers = await TeacherModel.countDocuments({});
    const totalClasses = await ClassModel.countDocuments({});
    const totalStudents = await StudentModel.countDocuments({});
    const totalSubmissions = await SubmissionModel.countDocuments({});
    
    res.json({
      users: totalUsers,
      teachers: totalTeachers,
      classes: totalClasses,
      students: totalStudents,
      submissions: totalSubmissions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải thống kê: ' + err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[server]: Backend is running at http://localhost:${PORT}`);
});
