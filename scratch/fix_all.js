const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

// 1. Fix Users GET
const oldUsersGet = `app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find({}, { password: 0 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài khoản: ' + err.message });
  }
});`;

const newUsersGet = `app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
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
      const obj = { ...u };
      delete obj.password;
      return obj;
    });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài khoản: ' + err.message });
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
    await logAudit('BULK_DELETE', 'User', \`Xóa \${ids.length} tài khoản\`, reqUser.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});
`;

if (content.includes(oldUsersGet)) {
  content = content.replace(oldUsersGet, newUsersGet);
}

// 2. Fix Classes GET
const oldClassesGet = `app.get('/api/admin/classes', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
});`;

const newClassesGet = `app.get('/api/admin/classes', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách lớp học: ' + err.message });
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
    await logAudit('BULK_DELETE', 'Class', \`Xóa \${ids.length} lớp học\`, (req as any).user.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});
`;

if (content.includes(oldClassesGet)) {
  content = content.replace(oldClassesGet, newClassesGet);
}

// 3. Fix Teachers GET
const oldTeachersGet = `app.get('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
  try {
    const teachers = await TeacherModel.find({});
    res.json(teachers);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách giáo viên: ' + err.message });
  }
});`;

const newTeachersGet = `app.get('/api/admin/teachers', adminAuth, async (req: Request, res: Response) => {
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
});
`;

if (content.includes(oldTeachersGet)) {
  content = content.replace(oldTeachersGet, newTeachersGet);
}

// 4. Students update status bulk
const studentsStatus = `app.post('/api/admin/students/bulk-update-status', adminOrTeacherAuth, async (req: Request, res: Response) => {
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
});`;

if (!content.includes('students/bulk-delete')) {
  content = content.replace(
    "app.post('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {",
    studentsStatus + "\\n\\napp.post('/api/admin/students', adminOrTeacherAuth, async (req: Request, res: Response) => {"
  );
}

// 5. Submissions bulk delete
const submissionsBulk = `app.post('/api/admin/submissions/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    await SubmissionModel.deleteMany({ _id: { $in: ids } });
    await logAudit('BULK_DELETE', 'Submission', \`Xóa \${ids.length} bản ghi bài nộp\`, (req as any).user.username);
    res.json({ message: 'Xóa hàng loạt thành công.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi xóa hàng loạt: ' + err.message });
  }
});`;

if (!content.includes('submissions/bulk-delete')) {
  content = content.replace(
    "app.delete('/api/admin/submissions/:id', adminAuth, async (req: Request, res: Response) => {",
    submissionsBulk + "\\n\\napp.delete('/api/admin/submissions/:id', adminAuth, async (req: Request, res: Response) => {"
  );
}

fs.writeFileSync(backendPath, content, 'utf8');
console.log('Fixed users, classes, teachers, and bulk endpoints successfully.');
