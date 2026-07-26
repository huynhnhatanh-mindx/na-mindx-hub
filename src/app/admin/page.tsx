"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  BookOpen,
  UserCheck,
  FileText,
  Eye,
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"classes" | "teachers" | "students" | "submissions" | "users">("classes");

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalSubmissions: 0,
    totalVisits: 0,
  });

  // Table Data
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals & New item forms
  const [newClassName, setNewClassName] = useState("");
  const [newTeacherForClass, setNewTeacherForClass] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");

  // Load Dashboard Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load Stats
      const statsRes = await fetch("/api/admin/dashboard-stats");
      if (statsRes.ok) setStats(await statsRes.json());

      // Load Tables based on active tab
      if (activeTab === "classes") {
        const res = await fetch("/api/admin/classes");
        if (res.ok) setClasses(await res.json());
      } else if (activeTab === "teachers") {
        const res = await fetch("/api/admin/teachers");
        if (res.ok) setTeachers(await res.json());
      } else if (activeTab === "students") {
        const res = await fetch("/api/admin/students");
        if (res.ok) setStudents(await res.json());
      } else if (activeTab === "submissions") {
        const res = await fetch("/api/admin/submissions");
        if (res.ok) setSubmissions(await res.json());
      } else if (activeTab === "users") {
        const res = await fetch("/api/admin/users");
        if (res.ok) setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newTeacherForClass) return;
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName, teacherName: newTeacherForClass }),
      });
      if (res.ok) {
        showToast("Tạo lớp học mới thành công!", "success");
        setNewClassName("");
        loadData();
      }
    } catch {
      showToast("Tạo lớp học thất bại", "error");
    }
  };

  // Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName) return;
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeacherName }),
      });
      if (res.ok) {
        showToast("Thêm giáo viên mới thành công!", "success");
        setNewTeacherName("");
        loadData();
      }
    } catch {
      showToast("Thêm giáo viên thất bại", "error");
    }
  };

  // Delete handlers
  const handleDeleteItem = async (endpoint: string, id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa không?")) return;
    try {
      const res = await fetch(`/api/admin/${endpoint}/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa mục thành công!", "success");
        loadData();
      }
    } catch {
      showToast("Xóa mục thất bại", "error");
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" /> Administration Panel
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
            Bảng Quản Trị Hệ Thống
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý cơ sở dữ liệu, giáo viên, lớp học, học viên và bài tập nộp
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Tổng Học Viên</span>
            <Users className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalStudents}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Tổng Lớp Học</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalClasses}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Giáo Viên</span>
            <UserCheck className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalTeachers}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Bài Tập Đã Nộp</span>
            <FileText className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalSubmissions}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Lượt Truy Cập</span>
            <Eye className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalVisits}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        {[
          { id: "classes", label: "Lớp Học" },
          { id: "teachers", label: "Giáo Viên" },
          { id: "students", label: "Học Viên" },
          { id: "submissions", label: "Bài Nộp" },
          { id: "users", label: "Tài Khoản System" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {activeTab === "classes" && (
          <div className="space-y-6">
            {/* Create Class Form */}
            <form onSubmit={handleCreateClass} className="p-4 rounded-xl bg-input/30 border border-border flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Tên lớp học mới (VD: HCM4)..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                required
              />
              <input
                type="text"
                placeholder="Tên Giáo viên phụ trách..."
                value={newTeacherForClass}
                onChange={(e) => setNewTeacherForClass(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Thêm Lớp
              </button>
            </form>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Lớp</th>
                    <th className="py-3 px-4">Giáo Viên</th>
                    <th className="py-3 px-4">Giờ Học</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-bold text-foreground font-mono">{cls.name}</td>
                      <td className="py-3 px-4 text-foreground">{cls.teacherName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{cls.startTime} - {cls.endTime}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem("classes", cls.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "teachers" && (
          <div className="space-y-6">
            <form onSubmit={handleCreateTeacher} className="p-4 rounded-xl bg-input/30 border border-border flex gap-3">
              <input
                type="text"
                placeholder="Tên Giáo viên mới..."
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Thêm Giáo Viên
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Giáo Viên</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-bold text-foreground">{t.name}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem("teachers", t.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã HV</th>
                    <th className="py-3 px-4">Tên Học Viên</th>
                    <th className="py-3 px-4">Lớp Học</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {students.map((std) => (
                    <tr key={std.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{std.studentCode}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{std.name}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{std.className}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold">
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem("students", std.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Học Viên</th>
                    <th className="py-3 px-4">Lớp</th>
                    <th className="py-3 px-4">Giai Đoạn / Buổi</th>
                    <th className="py-3 px-4">Thời Gian Nộp</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-bold text-foreground">{sub.fullName}</td>
                      <td className="py-3 px-4 font-mono text-primary">{sub.className}</td>
                      <td className="py-3 px-4 text-muted-foreground">{sub.stage} - {sub.session}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(sub.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem("submissions", sub.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Tên Hiển Thị</th>
                    <th className="py-3 px-4">Vai Trò</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{u.username}</td>
                      <td className="py-3 px-4 text-foreground">{u.displayName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{u.email || "Chưa đặt"}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem("users", u.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
