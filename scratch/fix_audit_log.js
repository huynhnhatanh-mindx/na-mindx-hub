const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

const auditLogCode = `
// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  details: { type: String, required: true },
  performedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);

// Helper function
async function logAudit(action: string, entityType: string, details: string, performedBy: string) {
  try {
    if (mongoose.connection.readyState === 1) {
      const log = new AuditLogModel({ action, entityType, details, performedBy });
      await log.save();
    }
  } catch (err) {
    console.error('Error saving audit log:', err);
  }
}
`;

if (!content.includes('const AuditLogModel = mongoose.model')) {
  content = content.replace(
    "const UserModel = mongoose.model('User', userSchema);",
    "const UserModel = mongoose.model('User', userSchema);\\n" + auditLogCode
  );
  fs.writeFileSync(backendPath, content, 'utf8');
  console.log('AuditLogModel added successfully');
} else {
  console.log('AuditLogModel already exists');
}
