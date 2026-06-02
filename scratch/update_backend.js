const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Classes POST/PUT/DELETE Audits
content = content.replace(
  /res\.json\(\{ message: 'Tạo lớp học thành công.', data: savedClass \}\);/,
  "await logAudit('CREATE', 'Class', `Tạo lớp học: ${newClass.name}`, (req as any).user.username);\n    res.json({ message: 'Tạo lớp học thành công.', data: savedClass });"
);

content = content.replace(
  /res\.json\(\{ message: 'Cập nhật lớp học thành công.', data: cls \}\);/,
  "await logAudit('UPDATE', 'Class', `Cập nhật lớp học: ${cls.name}`, (req as any).user.username);\n    res.json({ message: 'Cập nhật lớp học thành công.', data: cls });"
);

content = content.replace(
  /res\.json\(\{ message: 'Xóa lớp học thành công.' \}\);/,
  "await logAudit('DELETE', 'Class', `Xóa lớp học: ${cls.name}`, (req as any).user.username);\n    res.json({ message: 'Xóa lớp học thành công.' });"
);

// 2. Teachers
content = content.replace(
  /app\.get\('\/api\/admin\/teachers', adminAuth, async \(req: Request, res: Response\) => \{\n  try \{\n    const teachers = await TeacherModel\.find\(\{\}\);\n    res\.json\(teachers\);\n  \} catch \(err: any\) \{\n    res\.status\(500\)\.json\(\{ error: 'Lỗi tải danh sách giáo viên: ' \+ err\.message \}\);\n  \}\n\}\);/,
  `app.get('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
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

app.post('/api/admin/teachers/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    const teachersToDelete = await TeacherModel.find({ _id: { $in: ids } });
    const teacherNames = teachersToDelete.map(t => t.name);
    
    // Xóa tài khoản giáo viên nếu có kết nối MongoDB
    if (mongoose.connection.readyState === 1) {
      await UserModel.deleteMany({ displayName: { $in: teacherNames }, role: 'teacher' });
    }
    await ClassModel.updateMany({ teacherName: { $in: teacherNames } }, { teacherName: 'Chưa phân công' });
    
    await TeacherModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Teacher', \`Xóa \${ids.length} giáo viên\`, (req as any).user.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});`
);

content = content.replace(
  /res\.json\(\{ message: 'Tạo giáo viên thành công.', data: savedTeacher \}\);/,
  "await logAudit('CREATE', 'Teacher', `Tạo giáo viên: ${savedTeacher?.name}`, (req as any).user.username);\n    res.json({ message: 'Tạo giáo viên thành công.', data: savedTeacher });"
);

content = content.replace(
  /res\.json\(\{ message: 'Cập nhật giáo viên thành công.', data: teacher \}\);/,
  "await logAudit('UPDATE', 'Teacher', `Cập nhật giáo viên: ${teacher.name}`, (req as any).user.username);\n    res.json({ message: 'Cập nhật giáo viên thành công.', data: teacher });"
);

content = content.replace(
  /res\.json\(\{ message: 'Xóa giáo viên thành công.' \}\);/,
  "await logAudit('DELETE', 'Teacher', `Xóa giáo viên: ${teacherName}`, (req as any).user.username);\n    res.json({ message: 'Xóa giáo viên thành công.' });"
);

// 3. Students
content = content.replace(
  /app\.get\('\/api\/admin\/students', adminOrTeacherAuth, async \(req: Request, res: Response\) => \{[\s\S]*?res\.json\(studentsWithCount\);\n  \} catch \(err: any\) \{\n    res\.status\(500\)\.json\(\{ error: 'Lỗi tải danh sách học viên: ' \+ err\.message \}\);\n  \}\n\}\);/,
  `app.get('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
        { className: { $regex: search, $options: 'i' } },
        { studentCode: { $regex: search, $options: 'i' } }
      ];
    }
    
    const response = await buildPaginatedResponse(StudentModel, query, page, limit);
    
    response.data = await Promise.all(response.data.map(async (student: any) => {
      const submissionCount = await SubmissionModel.countDocuments({ fullName: student.name, className: student.className });
      return { ...student, submissionCount };
    }));

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách học viên: ' + err.message });
  }
});

app.post('/api/admin/students/bulk-update-status', adminOrTeacherAuth, async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    }
    await StudentModel.updateMany({ _id: { $in: ids } }, { status });
    await logAudit('BULK_UPDATE', 'Student', \`Cập nhật trạng thái \${status} cho \${ids.length} học viên\`, (req as any).user.username);
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
    await logAudit('BULK_DELETE', 'Student', \`Xóa \${ids.length} học viên\`, (req as any).user.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});`
);

content = content.replace(
  /res\.json\(\{ message: 'Tạo học viên thành công.', data: newStudent \}\);/,
  "await logAudit('CREATE', 'Student', `Tạo học viên: ${newStudent.name}`, (req as any).user.username);\n    res.json({ message: 'Tạo học viên thành công.', data: newStudent });"
);

content = content.replace(
  /res\.json\(\{ message: 'Cập nhật học viên thành công.', data: student \}\);/,
  "await logAudit('UPDATE', 'Student', `Cập nhật học viên: ${student.name}`, (req as any).user.username);\n    res.json({ message: 'Cập nhật học viên thành công.', data: student });"
);

content = content.replace(
  /res\.json\(\{ message: 'Xóa học viên thành công.' \}\);/,
  "await logAudit('DELETE', 'Student', `Xóa học viên: ${student.name}`, (req as any).user.username);\n    res.json({ message: 'Xóa học viên thành công.' });"
);

// 4. Submissions
content = content.replace(
  /app\.get\('\/api\/admin\/submissions', adminOrTeacherAuth, async \(req: Request, res: Response\) => \{[\s\S]*?res\.json\(submissions\);\n  \} catch \(err: any\) \{\n    res\.status\(500\)\.json\(\{ error: 'Lỗi tải danh sách bài nộp: ' \+ err\.message \}\);\n  \}\n\}\);/,
  `app.get('/api/admin/submissions', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
    const response = await buildPaginatedResponse(SubmissionModel, query, page, limit);
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
    await logAudit('BULK_DELETE', 'Submission', \`Xóa \${ids.length} bản ghi bài nộp\`, (req as any).user.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});`
);

content = content.replace(
  /res\.json\(\{ message: 'Xóa bài nộp thành công.' \}\);/,
  "await logAudit('DELETE', 'Submission', `Xóa bài nộp: ${submission.fileName}`, (req as any).user.username);\n    res.json({ message: 'Xóa bài nộp thành công.' });"
);

// Add Audit Logs GET Endpoint and dashboard-stats
content = content.replace(
  /\/\/ --- BẮT ĐẦU SERVER ---/,
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

// --- BẮT ĐẦU SERVER ---`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Backend updated successfully');
