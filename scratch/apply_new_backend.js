const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize all newlines to LF for perfect string matching
content = content.replace(/\r\n/g, '\n');

// Clean up script escape artifacts
content = content.replace(/const UserModel = mongoose\.model\('User', userSchema\);\\n/g, "const UserModel = mongoose.model('User', userSchema);\n");
content = content.replace(/\}\);\\n\\napp\.post\('\/api\/admin\/students'/g, "});\n\napp.post('/api/admin/students'");
content = content.replace(/\}\);\\n\\napp\.delete\('\/api\/admin\/submissions\/:id'/g, "});\n\napp.delete('/api/admin/submissions/:id'");

// 1. In app.put('/api/admin/users/:id'), extract username parameter
const originalUserPasswordSanitize = 'const password = sanitize(req.body.password);';
const newUserPasswordSanitize = 'const username = sanitize(req.body.username);\n    const password = sanitize(req.body.password);';

// Replace first occurrence (which is inside app.put('/api/admin/users/:id'))
const putStartIndex = content.indexOf("app.put('/api/admin/users/:id'");
if (putStartIndex !== -1) {
  const targetIndex = content.indexOf(originalUserPasswordSanitize, putStartIndex);
  if (targetIndex !== -1) {
    content = content.substring(0, targetIndex) + newUserPasswordSanitize + content.substring(targetIndex + originalUserPasswordSanitize.length);
    console.log('1a. Username parameter extraction injected.');
  }
}

// 2. In app.put('/api/admin/users/:id'), insert check username check uniqueness and block admin renaming
const originalReqUserSetting = 'const reqUser = (req as any).user;';
const newUserReqUserSetting = `const reqUser = (req as any).user;

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
    }`;

if (putStartIndex !== -1) {
  const targetIndex = content.indexOf(originalReqUserSetting, putStartIndex);
  if (targetIndex !== -1) {
    content = content.substring(0, targetIndex) + newUserReqUserSetting + content.substring(targetIndex + originalReqUserSetting.length);
    console.log('1b. Username duplicate verification logic injected.');
  }
}

// 3. In app.post('/api/admin/classes'), update class uniqueness lookup and uppercase saving
const postClassStartIndex = content.indexOf("app.post('/api/admin/classes'");
if (postClassStartIndex !== -1) {
  const originalClassCheck = 'const existing = await ClassModel.findOne({ name: name.trim() });';
  const newClassCheck = `const cleanClassName = name.trim().toUpperCase();
    const existing = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${name.trim()}\$\`, 'i') } });`;
  
  const checkIndex = content.indexOf(originalClassCheck, postClassStartIndex);
  if (checkIndex !== -1) {
    content = content.substring(0, checkIndex) + newClassCheck + content.substring(checkIndex + originalClassCheck.length);
    console.log('2a. POST classes duplicate check updated to case-insensitive.');
  }

  const originalClassNameInst = 'name: name.trim(),';
  const newClassNameInst = 'name: cleanClassName,';
  const instIndex = content.indexOf(originalClassNameInst, postClassStartIndex);
  if (instIndex !== -1) {
    content = content.substring(0, instIndex) + newClassNameInst + content.substring(instIndex + originalClassNameInst.length);
    console.log('2b. POST classes instantiator set to uppercase name.');
  }
}

// 4. In app.put('/api/admin/classes/:id'), update class uniqueness lookup and uppercase saving
const putClassStartIndex = content.indexOf("app.put('/api/admin/classes/:id'");
if (putClassStartIndex !== -1) {
  const originalClassCheckAndRename = `if (name && name.trim() !== cls.name) {
      const existing = await ClassModel.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ error: 'Tên lớp học mới đã tồn tại.' });
      }
      const oldName = cls.name;
      cls.name = name.trim();
      
      // Đồng bộ tên lớp mới cho học viên và các bài nộp cũ
      await StudentModel.updateMany({ className: oldName }, { className: cls.name });
      await SubmissionModel.updateMany({ className: oldName }, { className: cls.name });
    }`;

  const newClassCheckAndRename = `if (name && name.trim().toUpperCase() !== cls.name.toUpperCase()) {
      const existing = await ClassModel.findOne({ name: { $regex: new RegExp(\`^\${name.trim()}\$\`, 'i') } });
      if (existing) {
        return res.status(400).json({ error: 'Tên lớp học mới đã tồn tại.' });
      }
      const oldName = cls.name;
      cls.name = name.trim().toUpperCase();
      
      // Đồng bộ tên lớp mới cho học viên và các bài nộp cũ
      await StudentModel.updateMany({ className: oldName }, { className: cls.name });
      await SubmissionModel.updateMany({ className: oldName }, { className: cls.name });
    }`;

  const targetIndex = content.indexOf(originalClassCheckAndRename, putClassStartIndex);
  if (targetIndex !== -1) {
    content = content.substring(0, targetIndex) + newClassCheckAndRename + content.substring(targetIndex + originalClassCheckAndRename.length);
    console.log('3. PUT classes check and update updated to case-insensitive and uppercase.');
  }
}

// 5. In app.post('/api/admin/students'), update class auto-create case-insensitive check and uppercase saving
const postStudentStartIndex = content.indexOf("app.post('/api/admin/students'");
if (postStudentStartIndex !== -1) {
  const originalClassCreation = `// Auto-create class if not exists
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
      className: className.trim(),`;

  const newClassCreation = `// Auto-create class if not exists
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
      className: finalClassName,`;

  const targetIndex = content.indexOf(originalClassCreation, postStudentStartIndex);
  if (targetIndex !== -1) {
    content = content.substring(0, targetIndex) + newClassCreation + content.substring(targetIndex + originalClassCreation.length);
    console.log('4. POST students class check updated to case-insensitive and uppercase.');
  }
}

// 6. In app.put('/api/admin/students/:id'), update class auto-create case-insensitive check and uppercase saving
const putStudentStartIndex = content.indexOf("app.put('/api/admin/students/:id'");
if (putStudentStartIndex !== -1) {
  const originalClassCreation = `if (className) {
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
    }`;

  const newClassCreation = `if (className) {
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
    }`;

  const targetIndex = content.indexOf(originalClassCreation, putStudentStartIndex);
  if (targetIndex !== -1) {
    content = content.substring(0, targetIndex) + newClassCreation + content.substring(targetIndex + originalClassCreation.length);
    console.log('5. PUT students class check updated to case-insensitive and uppercase.');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Applied all updates and cleaned up escape sequences successfully.');
