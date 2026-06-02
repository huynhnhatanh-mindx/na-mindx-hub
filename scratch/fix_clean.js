const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Clean up script escape artifacts
content = content.replace(/const UserModel = mongoose\.model\('User', userSchema\);\\n/g, "const UserModel = mongoose.model('User', userSchema);\n");
content = content.replace(/\}\);\\n\\napp\.post\('\/api\/admin\/students'/g, "});\n\napp.post('/api/admin/students'");
content = content.replace(/\}\);\\n\\napp\.delete\('\/api\/admin\/submissions\/:id'/g, "});\n\napp.delete('/api/admin/submissions/:id'");

// 2. Apply username edit capability and uniqueness checks in PUT /api/admin/users/:id
content = content.replace(
  /app\.put\('\/api\/admin\/users\/:id',\s*adminAuth,\s*async\s*\(req:\s*Request,\s*res:\s*Response\)\s*=>\s*\{\s*try\s*\{\s*const\s*password\s*=\s*sanitize\(req\.body\.password\);/g,
  `app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);`
);

// 3. Add username check only if not already added
if (!content.includes('Check if renaming the admin account')) {
  content = content.replace(
    /const\s*reqUser\s*=\s*\(req\s*as\s*any\)\.user;/g,
    `const reqUser = (req as any).user;

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
    }`
  );
}

// 4. Update POST /api/admin/classes to be case-insensitive and save uppercase
content = content.replace(
  /const\s*existing\s*=\s*await\s*ClassModel\.findOne\(\{\s*name:\s*name\.trim\(\)\s*\}\);\s*if\s*\(existing\)\s*\{[^}]*\}\s*await\s*createTeacherWithAccount\([^)]*\);\s*const\s*newClass\s*=\s*new\s*ClassModel\(\{\s*name:\s*name\.trim\(\),/gs,
  `const cleanClassName = name.trim().toUpperCase();
    const existing = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${name.trim()}\$\`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'Tên lớp học đã tồn tại.' });
    }

    await createTeacherWithAccount(teacherName.trim(), newTeacherUsername, newTeacherPassword);

    const newClass = new ClassModel({
      name: cleanClassName,`
);

// 5. Update PUT /api/admin/classes/:id to be case-insensitive and save uppercase
content = content.replace(
  /if\s*\(name\s*&&\s*name\.trim\(\)\s*!==\s*cls\.name\)\s*\{\s*const\s*existing\s*=\s*await\s*ClassModel\.findOne\(\{\s*name:\s*name\.trim\(\)\s*\}\);\s*if\s*\(existing\)\s*\{\s*return\s*res\.status\(400\)\.json\(\{\s*error:\s*'Tên lớp học mới đã tồn tại\.'\s*\}\);\s*\}\s*const\s*oldName\s*=\s*cls\.name;\s*cls\.name\s*=\s*name\.trim\(\);/gs,
  `if (name && name.trim().toUpperCase() !== cls.name.toUpperCase()) {
      const existing = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${name.trim()}\$\`, 'i') } });
      if (existing) {
        return res.status(400).json({ error: 'Tên lớp học mới đã tồn tại.' });
      }
      const oldName = cls.name;
      cls.name = name.trim().toUpperCase();`
);

// 6. Update Student POST and PUT class validations to be case-insensitive
content = content.replace(
  /\/\/ Auto-create class if not exists\s*if\s*\(useMongoDB\)\s*\{\s*const\s*classExisting\s*=\s*await\s*ClassModel\.findOne\(\{\s*name:\s*className\.trim\(\)\s*\}\);\s*if\s*\(!classExisting\)\s*\{\s*const\s*newClass\s*=\s*new\s*ClassModel\(\{\s*name:\s*className\.trim\(\),\s*teacherName:\s*'Chưa phân công'\s*\}\);\s*await\s*newClass\.save\(\);\s*\}\s*\}\s*const\s*newStudent\s*=\s*new\s*StudentModel\(\{\s*name:\s*name\.trim\(\),\s*className:\s*className\.trim\(\),/gs,
  `// Auto-create class if not exists
    let finalClassName = className.trim().toUpperCase();
    if (useMongoDB) {
      const classExisting = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${className.trim()}\$\`, 'i') } });
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
      className: finalClassName,`
);

content = content.replace(
  /if\s*\(className\)\s*\{\s*student\.className\s*=\s*className\.trim\(\);\s*\/\/ Auto-create class if not exists\s*if\s*\(useMongoDB\)\s*\{\s*const\s*classExisting\s*=\s*await\s*ClassModel\.findOne\(\{\s*name:\s*className\.trim\(\)\s*\}\);\s*if\s*\(!classExisting\)\s*\{\s*const\s*newClass\s*=\s*new\s*ClassModel\(\{\s*name:\s*className\.trim\(\),\s*teacherName:\s*'Chưa phân công'\s*\}\);\s*await\s*newClass\.save\(\);\s*\}\s*\}\s*\}/gs,
  `if (className) {
      let finalClassName = className.trim().toUpperCase();

      // Auto-create class if not exists
      if (useMongoDB) {
        const classExisting = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${className.trim()}\$\`, 'i') } });
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
    }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cleaned up escape sequences and successfully applied all backend updates!');
