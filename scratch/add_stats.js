const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

const statsAndLogsEndpoints = `
// API Audit Logs
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

`;

if (!content.includes('/api/admin/dashboard-stats')) {
  content = content.replace(
    "app.listen(PORT, () => {",
    statsAndLogsEndpoints + "app.listen(PORT, () => {"
  );
  fs.writeFileSync(backendPath, content, 'utf8');
  console.log('Endpoints added successfully.');
} else {
  console.log('Endpoints already exist.');
}
