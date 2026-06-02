const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const result = await mongoose.connection.collection('students').updateMany(
      { className: 'Chưa phân lớp' },
      { $set: { className: 'Chưa phân công lớp' } }
    );
    console.log('Fixed', result.modifiedCount, 'students');
    process.exit(0);
  })
  .catch(console.error);
