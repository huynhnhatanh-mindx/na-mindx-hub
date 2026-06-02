const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

// Replace students GET
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

// Replace submissions GET
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

fs.writeFileSync(backendPath, content, 'utf8');
console.log('Fixed students and submissions endpoints successfully.');
