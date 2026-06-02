const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/AdminDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Tabs
const oldTabs = `          {[
            { id: 'users', label: 'Quản lý Tài khoản' },
            { id: 'classes', label: 'Quản lý Lớp học' },
            { id: 'students', label: 'Quản lý Học viên' },
            { id: 'submissions', label: 'Quản lý Bài nộp' }
          ].filter(tab => currentUser?.role === 'admin' || (tab.id !== 'users' && tab.id !== 'submissions')).map((tab) => (`;

const newTabs = `          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'users', label: 'Quản lý Tài khoản' },
            { id: 'classes', label: 'Quản lý Lớp học' },
            { id: 'students', label: 'Quản lý Học viên' },
            { id: 'submissions', label: 'Quản lý Bài nộp' },
            { id: 'audit_logs', label: 'Nhật ký Hoạt động' }
          ].filter(tab => currentUser?.role === 'admin' || (tab.id !== 'users' && tab.id !== 'audit_logs' && tab.id !== 'overview')).map((tab) => (`;
content = content.replace(oldTabs, newTabs);

// Replace Toolbar
const oldToolbar = `          {/* Header Controls for CRUD (Users, Classes, Students) */}
          {activeTab !== 'submissions' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleOpenCreateModal}
                style={{
                  maxWidth: '180px',
                  height: '2.5rem',
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm mới
              </button>
            </div>
          )}`;

const newToolbar = `          {/* Header Controls for CRUD (Users, Classes, Students) */}
          {activeTab !== 'overview' && activeTab !== 'audit_logs' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Search */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-field"
                  style={{ width: '250px' }}
                />
                <button className="btn btn-neutral" onClick={handleSearch} style={{ height: 'auto', padding: '0 1rem' }}>Tìm</button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedIds.length > 0 && activeTab !== 'submissions' && (
                   <button className="btn btn-danger" onClick={handleBulkDelete} style={{ height: 'auto', padding: '0 1rem' }}>Xóa {selectedIds.length} mục</button>
                )}
                {selectedIds.length > 0 && (activeTab === 'users' || activeTab === 'students') && (
                   <>
                     <button className="btn btn-neutral" onClick={() => handleBulkUpdateStatus('active')} style={{ height: 'auto', padding: '0 1rem' }}>Mở khóa</button>
                     <button className="btn btn-neutral" onClick={() => handleBulkUpdateStatus('inactive')} style={{ height: 'auto', padding: '0 1rem' }}>Khóa</button>
                   </>
                )}
                {activeTab !== 'submissions' && (
                  <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModal}
                    style={{
                      height: 'auto',
                      padding: '0 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Thêm mới
                  </button>
                )}
              </div>
            </div>
          )}`;
content = content.replace(oldToolbar, newToolbar);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update UI Part 1 success');
