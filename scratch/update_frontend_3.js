const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/AdminDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Pagination block replacement
const oldEndTable = `              {/* --- BẢNG BÀI NỘP --- */}`;
const newEndTable = `              {/* Pagination */}
              {activeTab !== 'overview' && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn btn-neutral">Trước</button>
                  <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Trang {currentPage} / {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn btn-neutral">Sau</button>
                </div>
              )}

              {/* --- BẢNG BÀI NỘP --- */}`;
content = content.replace(oldEndTable, newEndTable);

// 2. Overview block
const overviewBlock = `              {/* --- TỔNG QUAN --- */}
              {activeTab === 'overview' && dashboardStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Tài khoản</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.users}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Giáo viên</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.teachers}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Lớp học</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.classes}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Học viên</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.students}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Bài nộp</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.submissions}</h1>
                  </div>
                </div>
              )}
              
              {/* --- NHẬT KÝ HOẠT ĐỘNG --- */}
              {activeTab === 'audit_logs' && (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem' }}>Thời gian</th>
                      <th style={{ padding: '1rem' }}>Người dùng</th>
                      <th style={{ padding: '1rem' }}>Hành động</th>
                      <th style={{ padding: '1rem' }}>Mục tiêu</th>
                      <th style={{ padding: '1rem' }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td data-label="Thời gian" style={{ padding: '1rem' }}>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                        <td data-label="Người dùng" style={{ padding: '1rem', fontWeight: 'bold' }}>{log.user}</td>
                        <td data-label="Hành động" style={{ padding: '1rem', color: 'var(--primary)' }}>{log.action}</td>
                        <td data-label="Mục tiêu" style={{ padding: '1rem' }}>{log.resource}</td>
                        <td data-label="Chi tiết" style={{ padding: '1rem' }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* --- BẢNG TÀI KHOẢN --- */}`;
content = content.replace(`              {/* --- BẢNG TÀI KHOẢN --- */}`, overviewBlock);

// Replace Table headers and rows to inject Checkboxes.
// Users
content = content.replace(
  `<th style={{ padding: '1rem' }}>Tên đăng nhập</th>`,
  `<th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, users)} checked={users.length > 0 && selectedIds.length === users.length} /></th>
                      <th style={{ padding: '1rem' }}>Tên đăng nhập</th>`
);
content = content.replace(
  `<td data-label="Tên đăng nhập" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.username}</td>`,
  `<td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Tên đăng nhập" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.username}</td>`
);

// Classes
content = content.replace(
  `<th style={{ padding: '1rem' }}>Tên lớp học</th>`,
  `<th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, classes)} checked={classes.length > 0 && selectedIds.length === classes.length} /></th>
                      <th style={{ padding: '1rem' }}>Tên lớp học</th>`
);
content = content.replace(
  `<td data-label="Tên lớp học" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>`,
  `<td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Tên lớp học" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>`
);

// Students
content = content.replace(
  `<th style={{ padding: '1rem' }}>Mã tra cứu</th>`,
  `<th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, students)} checked={students.length > 0 && selectedIds.length === students.length} /></th>
                      <th style={{ padding: '1rem' }}>Mã tra cứu</th>`
);
content = content.replace(
  `<td data-label="Mã tra cứu" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.studentCode}</td>`,
  `<td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Mã tra cứu" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.studentCode}</td>`
);

// Submissions
content = content.replace(
  `<th style={{ padding: '1rem' }}>Học viên</th>`,
  `<th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, submissions)} checked={submissions.length > 0 && selectedIds.length === submissions.length} /></th>
                      <th style={{ padding: '1rem' }}>Học viên</th>`
);
content = content.replace(
  `<td data-label="Học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.fullName}</td>`,
  `<td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.fullName}</td>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update UI Part 2 success');
