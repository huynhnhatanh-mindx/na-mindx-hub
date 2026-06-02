const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

// 1. Add dashboard-stats and audit-logs
if (!content.includes('/api/admin/dashboard-stats')) {
  content = content.replace(
    '// Start Server\napp.listen',
    `// API Audit Logs
app.get('/api/admin/audit-logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const response = await buildPaginatedResponse(AuditLogModel, {}, page, limit, { createdAt: -1 });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải nhật ký hoạt động: ' + err.message });
  }
});

// API Dashboard Stats
app.get('/api/admin/dashboard-stats', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
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
app.listen`
  );
}

// 2. Add JWT Expiration
const verifyRegex = /function verifySecureToken.*?return \{ username: parts\[0\], role: parts\[1\] \};/s;
if (!content.includes('EXPIRATION_TIME')) {
  content = content.replace(
    verifyRegex,
    `function verifySecureToken(token: string): { username: string; role: string } | null {
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
    return { username: parts[0], role: parts[1] };`
  );
}

// 3. Fix Students
if (content.includes('res.json(studentsWithCount);')) {
  const oldStudents = `app.get('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
    const students = await StudentModel.find(query).lean();
    
    // Đếm số lần nộp bài của mỗi học viên
    const studentsWithCount = await Promise.all(students.map(async (student: any) => {
      const submissionCount = await SubmissionModel.countDocuments({ fullName: student.name, className: student.className });
      return { ...student, submissionCount };
    }));

    res.json(studentsWithCount);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});`;

  const newStudents = `app.get('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      query.className = { $in: classNames };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentCode: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } }
      ];
    }

    const response = await buildPaginatedResponse(StudentModel, query, page, limit);
    
    // Đếm số lần nộp bài của mỗi học viên
    response.data = await Promise.all(response.data.map(async (student: any) => {
      const submissionCount = await SubmissionModel.countDocuments({ fullName: student.name, className: student.className });
      return { ...student, submissionCount };
    }));

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});`;
  content = content.replace(oldStudents, newStudents);
}

// 4. Fix Submissions
if (content.includes('res.json(submissions);') && content.includes('/api/admin/submissions')) {
  const oldSubmissions = `app.get('/api/admin/submissions', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
});`;

  const newSubmissions = `app.get('/api/admin/submissions', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { role, username } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {};
    if (role === 'teacher') {
      const user = await UserModel.findOne({ username });
      const teacherName = user ? user.displayName : '';
      const teacherClasses = await ClassModel.find({ teacherName });
      const classNames = teacherClasses.map(c => c.name);
      query.className = { $in: classNames };
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
});`;
  content = content.replace(oldSubmissions, newSubmissions);
}

fs.writeFileSync(backendPath, content, 'utf8');
console.log('Fixed backend properly.');
