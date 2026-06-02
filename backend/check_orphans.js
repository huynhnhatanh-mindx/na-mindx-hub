const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const classes = await mongoose.connection.collection('classes').find({}).toArray();
    const students = await mongoose.connection.collection('students').find({}).toArray();
    
    const classNames = new Set(classes.map(c => c.name));
    const orphaned = students.filter(s => s.className !== 'Chưa phân lớp' && !classNames.has(s.className));
    
    console.log('Orphaned students:', orphaned.map(s => ({ name: s.name, className: s.className })));
    
    // Fix them
    if (orphaned.length > 0) {
      const result = await mongoose.connection.collection('students').updateMany(
        { _id: { $in: orphaned.map(s => s._id) } },
        { $set: { className: 'Chưa phân lớp' } }
      );
      console.log('Fixed', result.modifiedCount, 'students');
    }
    
    process.exit(0);
  })
  .catch(console.error);
