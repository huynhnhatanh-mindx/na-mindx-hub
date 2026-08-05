"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  BookOpen,
  UserCheck,
  FileText,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
  Pencil,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ShieldAlert,
  Info,
  Layers,
  Calendar,
  Clock,
  Tag,
  Award,
  BookMarked,
  CheckSquare,
  Square,
  AlertTriangle,
  Hourglass,
  UserPlus,
  ArrowRightLeft,
  GraduationCap,
  Globe,
  UserX,
  Sparkles,
  Search,
  Filter,
  HardDrive,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Sliders,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";

interface SessionItem {
  sessionNum: number;
  startDate: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  tag: string;
  tagColor: string;
}

const removeVietnameseTones = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

// Auto Student Code generator: <tên> + <chữ cái đầu họ & đệm> + <số nếu trùng>
const generateStudentCodeFromName = (fullName: string, existingStudents: any[], currentStudentId?: string | null): string => {
  if (!fullName || !fullName.trim()) return "hocvien";

  const clean = removeVietnameseTones(fullName.trim()).toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "hocvien";

  let baseCode = "";
  if (words.length === 1) {
    baseCode = words[0];
  } else {
    const lastName = words[words.length - 1];
    const firstLetters = words.slice(0, words.length - 1).map((w) => w[0]).join("");
    baseCode = `${lastName}${firstLetters}`;
  }

  const existingCodesSet = new Set<string>();
  existingStudents.forEach((st) => {
    const stId = st.id || st._id;
    if (stId !== currentStudentId && st.studentCode) {
      existingCodesSet.add(st.studentCode.trim().toLowerCase());
    }
  });

  if (!existingCodesSet.has(baseCode)) {
    return baseCode;
  }

  let counter = 1;
  while (existingCodesSet.has(`${baseCode}${counter}`)) {
    counter++;
  }
  return `${baseCode}${counter}`;
};

const parseSessionRanges = (rangeStr: string): Set<number> => {
  const result = new Set<number>();
  if (!rangeStr || rangeStr.trim() === "0") return result;

  const parts = rangeStr.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0) {
        result.add(num);
      }
    }
  }
  return result;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Current logged in user profile & View Mode
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeViewMode, setActiveViewMode] = useState<string>("admin"); // 'admin' | 'teacher' | 'student'
  const [simulatedTeacherName, setSimulatedTeacherName] = useState<string>("");

  useEffect(() => {
    const syncUserAndMode = () => {
      if (typeof window !== "undefined") {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            const u = JSON.parse(localUserStr);
            setCurrentUser(u);

            const savedMode = localStorage.getItem("activeViewMode") || (u.role === "admin" ? "admin" : "teacher");
            setActiveViewMode(savedMode);

            const savedSimulated = localStorage.getItem("simulatedTeacher") || "";
            setSimulatedTeacherName(savedSimulated);
          } catch {}
        }
      }
    };

    syncUserAndMode();
    window.addEventListener("storage", syncUserAndMode);
    window.addEventListener("focus", syncUserAndMode);
    return () => {
      window.removeEventListener("storage", syncUserAndMode);
      window.removeEventListener("focus", syncUserAndMode);
    };
  }, []);

  const isTeacherRoleMode = currentUser?.role === "teacher" || activeViewMode === "teacher";

  // Route Guard: Students/Guests do NOT see Admin Dashboard — redirect to /upload immediately
  useEffect(() => {
    if (activeViewMode === "student") {
      router.replace("/upload");
    }
  }, [activeViewMode, router]);

  // Reordered Navigation Tabs (Requirement 3: Priority sequence for data setup)
  const navTabs = [
    { id: "overview", label: "📊 Tổng Quan", staffAllowed: true },
    { id: "categories", label: "🧱 Khối Học", staffAllowed: false },
    { id: "subjects", label: "📚 Môn Học", staffAllowed: false },
    { id: "levels", label: "🎖️ Cấp Độ", staffAllowed: false },
    { id: "classes", label: "🏫 Lớp Học", staffAllowed: true },
    { id: "students", label: "🎓 Học Viên", staffAllowed: true },
    { id: "teachers", label: "👤 Tài Khoản", staffAllowed: false },
    { id: "submissions", label: "📝 Bài Nộp", staffAllowed: true },
  ];

  const [activeTab, setActiveTab] = useState<
    "overview" | "categories" | "subjects" | "levels" | "classes" | "students" | "teachers" | "submissions"
  >("overview");

  // Route Guard for Teacher Role / View Mode
  useEffect(() => {
    if (isTeacherRoleMode && ["categories", "subjects", "levels", "teachers"].includes(activeTab)) {
      setActiveTab("overview");
      showToast("Chế độ Giáo viên chỉ xem được Tổng Quan, Lớp Học, Học Viên và Bài Nộp", "info");
    }
  }, [isTeacherRoleMode, activeTab]);

  // Raw Table Data
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // System Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalSubmissions: 0,
    totalVisits: 0,
  });

  // --- PAGINATION & FILTER STATES FOR EACH TAB ---
  // 1. Classes Tab
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState("ALL");
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);

  // 2. Categories Tab
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);

  // 3. Subjects Tab
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectPageSize, setSubjectPageSize] = useState(10);

  // 4. Levels Tab
  const [levelSearchQuery, setLevelSearchQuery] = useState("");
  const [levelPage, setLevelPage] = useState(1);
  const [levelPageSize, setLevelPageSize] = useState(10);

  // 5. Teachers Tab
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherRoleFilter, setTeacherRoleFilter] = useState("ALL");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("ALL");
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);

  // 6. Students Tab
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("ALL");
  const [studentStatusFilter, setStudentStatusFilter] = useState("ALL");
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);

  // 7. Submissions Tab
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const [submissionClassFilter, setSubmissionClassFilter] = useState("ALL");
  const [submissionTeacherFilter, setSubmissionTeacherFilter] = useState("ALL");
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionPageSize, setSubmissionPageSize] = useState(10);

  // Load All Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, teachersRes, catRes, lvlRes, subRes, studentsRes, classesRes, submissionsRes] = await Promise.all([
        fetch("/api/admin/dashboard-stats"),
        fetch("/api/admin/teachers"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/levels"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/students"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/submissions"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());

      let fetchedTeachers: any[] = [];
      if (teachersRes.ok) {
        fetchedTeachers = await teachersRes.json();
        setTeachers(fetchedTeachers);
      }

      if (catRes.ok) setCategories(await catRes.json());
      if (lvlRes.ok) setLevels(await lvlRes.json());
      if (subRes.ok) setSubjects(await subRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (submissionsRes.ok) setSubmissions(await submissionsRes.json());

      // Default simulated teacher selection if none selected
      if (!simulatedTeacherName && fetchedTeachers.length > 0) {
        const firstTeacher = fetchedTeachers.find((t) => t.username !== "admin")?.displayName || fetchedTeachers[0]?.displayName || fetchedTeachers[0]?.name;
        if (firstTeacher) {
          setSimulatedTeacherName(firstTeacher);
          localStorage.setItem("simulatedTeacher", firstTeacher);
        }
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

  const activeTeachers = teachers.filter((t) => {
    const isStaff = t.role === "teacher" || (!t.role && t.username !== "admin");
    const isActiveStatus = t.status === "active" || (t.email && t.status !== "inactive" && t.status !== "ngừng hoạt động");
    return isStaff && isActiveStatus;
  });

  // Requirement 1 & 7: TEACHER SIMULATION & DATA SCOPING
  const effectiveTeacherName = (currentUser?.role === "admin" && activeViewMode === "teacher")
    ? (simulatedTeacherName || (activeTeachers[0]?.displayName || activeTeachers[0]?.name || "Giáo viên"))
    : (currentUser?.displayName || currentUser?.name || currentUser?.username);

  const visibleClasses = classes.filter((cls) => {
    if (!isTeacherRoleMode) return true;
    if (cls.isExternalClass) {
      const tNames = cls.teacherNames || (cls.teacherName ? [cls.teacherName] : []);
      return tNames.includes(effectiveTeacherName) || cls.name === `Lớp Không Xác Định - GV ${effectiveTeacherName}`;
    }
    if (cls.isAllActiveTeachers) {
      return !cls.excludedTeacherNames?.includes(effectiveTeacherName);
    }
    const tNames = cls.teacherNames || (cls.teacherName ? [cls.teacherName] : []);
    return tNames.includes(effectiveTeacherName);
  });

  const visibleClassNamesSet = new Set(visibleClasses.map((c) => c.name));
  if (isTeacherRoleMode) {
    visibleClassNamesSet.add(`Lớp Không Xác Định - GV ${effectiveTeacherName}`);
  }

  const visibleStudents = students.filter((st) => {
    if (!isTeacherRoleMode) return true;
    return !st.className || visibleClassNamesSet.has(st.className);
  });

  const visibleSubmissions = submissions.filter((sub) => {
    if (!isTeacherRoleMode) return true;
    return (sub.className && visibleClassNamesSet.has(sub.className)) || sub.teacher === effectiveTeacherName;
  });

  const handleSimulatedTeacherChange = (teacherNameVal: string) => {
    setSimulatedTeacherName(teacherNameVal);
    localStorage.setItem("simulatedTeacher", teacherNameVal);
    showToast(`Đã mô phỏng góc nhìn của Giáo viên: ${teacherNameVal}`, "info");
  };

  const handleViewModeSelect = (modeVal: string) => {
    setActiveViewMode(modeVal);
    localStorage.setItem("activeViewMode", modeVal);
    window.dispatchEvent(new Event("storage"));
    showToast(`Đã chuyển sang ${modeVal === "admin" ? "Giao diện Admin System" : modeVal === "teacher" ? "Giao diện Giáo Viên" : "Giao diện Học Viên"}`, "info");
  };

  // --- FILTER & PAGINATION COMPUTATIONS ---

  // 1. Classes Tab Filtering & Pagination
  const filteredClasses = visibleClasses.filter((cls) => {
    const q = classSearchQuery.trim().toLowerCase();
    if (q) {
      const matchName = (cls.name || "").toLowerCase().includes(q);
      const matchSubject = (cls.subjectName || "").toLowerCase().includes(q);
      if (!matchName && !matchSubject) return false;
    }

    if (classStatusFilter !== "ALL") {
      const statusObj = getClassStatus(cls);
      if (classStatusFilter !== statusObj.code) return false;
    }
    return true;
  });

  const classTotalItems = filteredClasses.length;
  const classTotalPages = Math.ceil(classTotalItems / classPageSize);
  const classStartIndex = (classPage - 1) * classPageSize;
  const paginatedClasses = filteredClasses.slice(classStartIndex, classStartIndex + classPageSize);

  // 2. Categories Tab Filtering & Pagination
  const filteredCategories = categories.filter((cat) => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (cat.name || "").toLowerCase().includes(q) || (cat.code || "").toLowerCase().includes(q);
  });
  const categoryTotalItems = filteredCategories.length;
  const categoryTotalPages = Math.ceil(categoryTotalItems / categoryPageSize);
  const categoryStartIndex = (categoryPage - 1) * categoryPageSize;
  const paginatedCategories = filteredCategories.slice(categoryStartIndex, categoryStartIndex + categoryPageSize);

  // 3. Subjects Tab Filtering & Pagination
  const filteredSubjects = subjects.filter((sub) => {
    const q = subjectSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (sub.name || "").toLowerCase().includes(q);
  });
  const subjectTotalItems = filteredSubjects.length;
  const subjectTotalPages = Math.ceil(subjectTotalItems / subjectPageSize);
  const subjectStartIndex = (subjectPage - 1) * subjectPageSize;
  const paginatedSubjects = filteredSubjects.slice(subjectStartIndex, subjectStartIndex + subjectPageSize);

  // 4. Levels Tab Filtering & Pagination
  const filteredLevels = levels.filter((lvl) => {
    const q = levelSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (lvl.name || "").toLowerCase().includes(q) || (lvl.description || "").toLowerCase().includes(q);
  });
  const levelTotalItems = filteredLevels.length;
  const levelTotalPages = Math.ceil(levelTotalItems / levelPageSize);
  const levelStartIndex = (levelPage - 1) * levelPageSize;
  const paginatedLevels = filteredLevels.slice(levelStartIndex, levelStartIndex + levelPageSize);

  // 5. Teachers Tab Filtering & Pagination
  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearchQuery.trim().toLowerCase();
    if (q) {
      const matchUsername = (t.username || "").toLowerCase().includes(q);
      const matchName = (t.displayName || t.name || "").toLowerCase().includes(q);
      const matchEmail = (t.email || "").toLowerCase().includes(q);
      if (!matchUsername && !matchName && !matchEmail) return false;
    }

    if (teacherRoleFilter !== "ALL") {
      if (teacherRoleFilter === "admin" && t.role !== "admin") return false;
      if (teacherRoleFilter === "teacher" && t.role === "admin") return false;
    }

    if (teacherStatusFilter !== "ALL") {
      if (teacherStatusFilter === "active" && (t.status === "inactive" || t.status === "pending_oauth")) return false;
      if (teacherStatusFilter === "pending_oauth" && t.status !== "pending_oauth") return false;
      if (teacherStatusFilter === "inactive" && t.status !== "inactive") return false;
    }

    return true;
  });
  const teacherTotalItems = filteredTeachers.length;
  const teacherTotalPages = Math.ceil(teacherTotalItems / teacherPageSize);
  const teacherStartIndex = (teacherPage - 1) * teacherPageSize;
  const paginatedTeachers = filteredTeachers.slice(teacherStartIndex, teacherStartIndex + teacherPageSize);

  // 6. Students Tab Filtering & Pagination
  const filteredStudents = visibleStudents.filter((s) => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (q) {
      const matchName = (s.name || "").toLowerCase().includes(q);
      const matchCode = (s.studentCode || "").toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    if (studentClassFilter !== "ALL") {
      if (studentClassFilter === "EXTERNAL") {
        const isExternal = !s.className || s.className === "Lớp Học Ngoại Lai" || s.className === "Chưa xếp lớp";
        if (!isExternal) return false;
      } else {
        if (s.className !== studentClassFilter) return false;
      }
    }

    if (studentStatusFilter !== "ALL") {
      if (studentStatusFilter === "active" && s.status === "inactive") return false;
      if (studentStatusFilter === "inactive" && s.status !== "inactive") return false;
    }

    return true;
  });
  const studentTotalItems = filteredStudents.length;
  const studentTotalPages = Math.ceil(studentTotalItems / studentPageSize);
  const studentStartIndex = (studentPage - 1) * studentPageSize;
  const paginatedStudents = filteredStudents.slice(studentStartIndex, studentStartIndex + studentPageSize);

  // 7. Submissions Tab Filtering & Pagination
  const filteredSubmissions = visibleSubmissions.filter((sub) => {
    const q = submissionSearchQuery.trim().toLowerCase();
    if (q) {
      const matchName = (sub.fullName || sub.studentName || "").toLowerCase().includes(q);
      const matchCode = (sub.studentCode || "").toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    if (submissionClassFilter !== "ALL" && (sub.className || sub.class_name) !== submissionClassFilter) {
      return false;
    }

    if (submissionTeacherFilter !== "ALL" && sub.teacher !== submissionTeacherFilter) {
      return false;
    }

    return true;
  });
  const submissionTotalItems = filteredSubmissions.length;
  const submissionTotalPages = Math.ceil(submissionTotalItems / submissionPageSize);
  const submissionStartIndex = (submissionPage - 1) * submissionPageSize;
  const paginatedSubmissions = filteredSubmissions.slice(submissionStartIndex, submissionStartIndex + submissionPageSize);

  // Reset page to 1 when filters change
  useEffect(() => { setClassPage(1); }, [classSearchQuery, classStatusFilter]);
  useEffect(() => { setCategoryPage(1); }, [categorySearchQuery]);
  useEffect(() => { setSubjectPage(1); }, [subjectSearchQuery]);
  useEffect(() => { setLevelPage(1); }, [levelSearchQuery]);
  useEffect(() => { setTeacherPage(1); }, [teacherSearchQuery, teacherRoleFilter, teacherStatusFilter]);
  useEffect(() => { setStudentPage(1); }, [studentSearchQuery, studentClassFilter, studentStatusFilter]);
  useEffect(() => { setSubmissionPage(1); }, [submissionSearchQuery, submissionClassFilter, submissionTeacherFilter]);

  // --- CLASS MODAL STATE ---
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isAllActiveTeachers, setIsAllActiveTeachers] = useState(false);
  const [excludedTeachers, setExcludedTeachers] = useState<string[]>([]);
  const [isExternalClass, setIsExternalClass] = useState(false);

  const [classCategoryInput, setClassCategoryInput] = useState("");
  const [classLevelInput, setClassLevelInput] = useState("");
  const [classSubjectInput, setClassSubjectInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [startTimeInput, setStartTimeInput] = useState("18:00");
  const [endTimeInput, setEndTimeInput] = useState("20:00");

  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [customSessions, setCustomSessions] = useState<SessionItem[]>([]);
  const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
  const [editingSessionObj, setEditingSessionObj] = useState<any>(null);

  const [cp1StartDate, setCp1StartDate] = useState("");
  const [cp1Deadline, setCp1Deadline] = useState("");
  const [cp1LateType, setCp1LateType] = useState<"none" | "until_deadline" | "until_class_end">("none");
  const [cp1LateDeadline, setCp1LateDeadline] = useState("");

  const [cp2StartDate, setCp2StartDate] = useState("");
  const [cp2Deadline, setCp2Deadline] = useState("");
  const [cp2LateType, setCp2LateType] = useState<"none" | "until_deadline" | "until_class_end">("none");
  const [cp2LateDeadline, setCp2LateDeadline] = useState("");

  const [finalStartDate, setFinalStartDate] = useState("");
  const [finalDeadline, setFinalDeadline] = useState("");
  const [finalLateType, setFinalLateType] = useState<"none" | "until_deadline" | "until_class_end">("none");
  const [finalLateDeadline, setFinalLateDeadline] = useState("");

  const [presStartDate, setPresStartDate] = useState("");
  const [presDeadline, setPresDeadline] = useState("");
  const [presLateType, setPresLateType] = useState<"none" | "until_deadline" | "until_class_end">("none");
  const [presLateDeadline, setPresLateDeadline] = useState("");

  const [allowLateUpload, setAllowLateUpload] = useState(true);

  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // --- CATEGORY MODAL STATE ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatDurationMinutes, setNewCatDurationMinutes] = useState<number>(120);
  const [newCatTotalSessions, setNewCatTotalSessions] = useState<number>(14);
  const [newCatTheorySessions, setNewCatTheorySessions] = useState<string>("1-4, 6-8");
  const [newCatCp1Sessions, setNewCatCp1Sessions] = useState<string>("5");
  const [newCatCp2Sessions, setNewCatCp2Sessions] = useState<string>("9");
  const [newCatFinalProjectSessions, setNewCatFinalProjectSessions] = useState<string>("10-14");
  const [newCatPresentationSessions, setNewCatPresentationSessions] = useState<string>("14");
  const [catSubjectLevelMap, setCatSubjectLevelMap] = useState<{ [subjectName: string]: string[] }>({});
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // --- LEVEL MODAL STATE ---
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelDesc, setNewLevelDesc] = useState("");
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false);

  // --- SUBJECT MODAL STATE ---
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // --- ACCOUNT MODAL STATE ---
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [newAccountUsername, setNewAccountUsername] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountDisplayName, setNewAccountDisplayName] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"teacher" | "admin">("teacher");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [editingDisplayName, setEditingDisplayName] = useState("");
  const [editingRole, setEditingRole] = useState<"teacher" | "admin">("teacher");
  const [editingOriginalRole, setEditingOriginalRole] = useState<"teacher" | "admin">("teacher");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingStatus, setEditingStatus] = useState<"pending_oauth" | "active" | "inactive">("pending_oauth");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // --- STUDENT MODAL STATE ---
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [studentCodeInput, setStudentCodeInput] = useState("");
  const [studentClassNameInput, setStudentClassNameInput] = useState("EXTERNAL");
  const [studentExternalTeacherInput, setStudentExternalTeacherInput] = useState("");
  const [studentMaxUploadSizeInput, setStudentMaxUploadSizeInput] = useState<number>(50);
  const [studentStatusInput, setStudentStatusInput] = useState<"active" | "inactive">("active");
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  const canEditClass = (cls: any) => {
    if (!currentUser) return true;
    if (currentUser.role === "admin" && activeViewMode === "admin") return true;
    if (cls.isExternalClass) return false;
    if (cls.isAllActiveTeachers) {
      return !cls.excludedTeacherNames?.includes(effectiveTeacherName);
    }
    const tNames = cls.teacherNames || (cls.teacherName ? [cls.teacherName] : []);
    return tNames.includes(effectiveTeacherName);
  };

  function getClassStatus(cls: any) {
    if (cls.isExternalClass) {
      return { label: "Ngoại Lai", code: "external", badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30" };
    }
    if (cls.isForceEnded) {
      return { label: "Đã kết thúc", code: "ended", badgeClass: "bg-muted text-muted-foreground border border-border" };
    }

    const now = new Date();
    const startDateStr = cls.startDate ? new Date(cls.startDate).toISOString().split("T")[0] : null;
    const startTimeStr = cls.startTime || "00:00";
    const startDateTime = startDateStr ? new Date(`${startDateStr}T${startTimeStr}:00`) : null;

    if (startDateTime && now < startDateTime) {
      return { label: "Chuẩn bị", code: "preparing", badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30" };
    }

    // Calculate maximum / longest end date & time across base end date and all stage deadlines
    const possibleEndDates: number[] = [];

    if (cls.endDate) {
      const baseEndDateStr = new Date(cls.endDate).toISOString().split("T")[0];
      const baseEndTimeStr = cls.endTime || "23:59";
      possibleEndDates.push(new Date(`${baseEndDateStr}T${baseEndTimeStr}:00`).getTime());
    }

    if (cls.checkpoint1Deadline) possibleEndDates.push(new Date(cls.checkpoint1Deadline).getTime());
    if (cls.checkpoint1LateDeadline && cls.allowLateUpload) possibleEndDates.push(new Date(cls.checkpoint1LateDeadline).getTime());

    if (cls.checkpoint2Deadline) possibleEndDates.push(new Date(cls.checkpoint2Deadline).getTime());
    if (cls.checkpoint2LateDeadline && cls.allowLateUpload) possibleEndDates.push(new Date(cls.checkpoint2LateDeadline).getTime());

    if (cls.finalProjectDeadline) possibleEndDates.push(new Date(cls.finalProjectDeadline).getTime());
    if (cls.finalProjectLateDeadline && cls.allowLateUpload) possibleEndDates.push(new Date(cls.finalProjectLateDeadline).getTime());

    if (cls.presentationDeadline) possibleEndDates.push(new Date(cls.presentationDeadline).getTime());

    const maxEndMs = possibleEndDates.length > 0 ? Math.max(...possibleEndDates) : null;

    if (maxEndMs) {
      if (now.getTime() <= maxEndMs) {
        return { label: "Đang hoạt động", code: "active", badgeClass: "bg-success/15 text-success border border-success/30" };
      } else {
        return { label: "Đã kết thúc", code: "ended", badgeClass: "bg-muted text-muted-foreground border border-border" };
      }
    }

    return { label: "Đang hoạt động", code: "active", badgeClass: "bg-success/15 text-success border border-success/30" };
  }

  const parseCatSubjectLevelMap = (cat: any): { [subjectName: string]: string[] } => {
    if (cat?.allowed_subject_levels) {
      try {
        const parsed = JSON.parse(cat.allowed_subject_levels);
        if (Array.isArray(parsed)) {
          const map: { [key: string]: string[] } = {};
          parsed.forEach((item: any) => {
            if (item.subjectName && Array.isArray(item.levels)) {
              map[item.subjectName] = item.levels;
            }
          });
          return map;
        }
      } catch {}
    }

    const fallbackSubjects = cat?.allowed_subjects
      ? cat.allowed_subjects.split(",").map((s: string) => s.trim()).filter(Boolean)
      : subjects.map((s) => s.name);
    const fallbackLevels = cat?.allowed_levels
      ? cat.allowed_levels.split(",").map((l: string) => l.trim()).filter(Boolean)
      : levels.map((l) => l.name);

    const map: { [key: string]: string[] } = {};
    fallbackSubjects.forEach((subName: string) => {
      map[subName] = [...fallbackLevels];
    });
    return map;
  };

  const calcEndTimeFromStart = (startStr: string, durationMins: number) => {
    if (!startStr) return "20:00";
    const parts = startStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return "20:00";

    const totalMins = h * 60 + m + (durationMins || 120);
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  const buildDefaultSessionsForCategory = (
    startDateStr: string,
    startTimeStr: string,
    endTimeStr: string,
    catName: string
  ): SessionItem[] => {
    if (!startDateStr) return [];
    const catObj = categories.find((c) => c.name === catName);
    const totalSessions = catObj?.total_sessions || 14;
    const result: SessionItem[] = [];
    const startDate = new Date(startDateStr);
    const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    const theorySet = parseSessionRanges(catObj?.theory_sessions ?? "1-4, 6-8");
    const cp1Set = parseSessionRanges(catObj?.cp1_sessions ?? "5");
    const cp2Set = parseSessionRanges(catObj?.cp2_sessions ?? "9");
    const finalSet = parseSessionRanges(catObj?.final_project_sessions ?? "10-14");
    const presSet = parseSessionRanges(catObj?.presentation_sessions ?? "14");

    for (let i = 1; i <= totalSessions; i++) {
      const sDate = new Date(startDate.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000);
      const dayOfWeek = dayNames[sDate.getDay()];
      const sDateStr = sDate.toISOString().split("T")[0];

      const tags: string[] = [];
      const colors: string[] = [];

      if (theorySet.has(i)) {
        tags.push("Lý Thuyết");
        colors.push("bg-secondary text-foreground border border-border");
      }
      if (cp1Set.has(i)) {
        tags.push("Checkpoint 1");
        colors.push("bg-amber-500/20 text-amber-500 border border-amber-500/30");
      }
      if (cp2Set.has(i)) {
        tags.push("Checkpoint 2");
        colors.push("bg-amber-500/20 text-amber-500 border border-amber-500/30");
      }
      if (finalSet.has(i)) {
        tags.push("SPCK");
        colors.push("bg-primary/20 text-primary border border-primary/30");
      }
      if (presSet.has(i)) {
        tags.push("Thuyết Trình");
        colors.push("bg-purple-500/20 text-purple-500 border border-purple-500/30");
      }

      result.push({
        sessionNum: i,
        startDate: sDateStr,
        startTime: startTimeStr || "18:00",
        endTime: endTimeStr || "20:00",
        dayOfWeek,
        tag: tags.join(" + ") || "Buổi Học",
        tagColor: colors[0] || "bg-muted text-muted-foreground border border-border",
      });
    }

    return result;
  };

  const handleCategoryChangeInClassModal = (newCatName: string) => {
    setClassCategoryInput(newCatName);
    const catObj = categories.find((c) => c.name === newCatName);
    const duration = catObj?.duration_minutes || 120;
    const calculatedEndTime = calcEndTimeFromStart(startTimeInput, duration);
    setEndTimeInput(calculatedEndTime);

    if (startDateInput) {
      const generated = buildDefaultSessionsForCategory(startDateInput, startTimeInput, calculatedEndTime, newCatName);
      setCustomSessions(generated);
      if (generated.length > 0) {
        setEndDateInput(generated[generated.length - 1].startDate);
      }
    }
  };

  const selectedCatObj = categories.find((c) => c.name === classCategoryInput);
  const catMatrixMap = parseCatSubjectLevelMap(selectedCatObj);
  const availableCatSubjects = Object.keys(catMatrixMap).length > 0
    ? Object.keys(catMatrixMap)
    : subjects.map((s) => s.name);

  const availableCatLevels = classSubjectInput && catMatrixMap[classSubjectInput]
    ? catMatrixMap[classSubjectInput]
    : levels.map((l) => l.name);

  const handleOpenAddClassModal = () => {
    setEditingClassId(null);
    setClassNameInput("");
    if (isTeacherRoleMode) {
      setSelectedTeachers([effectiveTeacherName]);
      setIsAllActiveTeachers(false);
    } else {
      setSelectedTeachers([]);
      setIsAllActiveTeachers(false);
    }
    setExcludedTeachers([]);
    setIsExternalClass(false);
    setClassStudents([]);
    const defaultCat = categories[0]?.name || "";
    setClassCategoryInput(defaultCat);

    const firstCatObj = categories.find((c) => c.name === defaultCat);
    const duration = firstCatObj?.duration_minutes || 120;
    const initialStart = "18:00";
    const initialEnd = calcEndTimeFromStart(initialStart, duration);

    const firstMatrix = parseCatSubjectLevelMap(firstCatObj);
    const catSubs = Object.keys(firstMatrix).length > 0 ? Object.keys(firstMatrix) : subjects.map((s) => s.name);
    const firstSubName = catSubs[0] || "";
    const catLvls = firstMatrix[firstSubName] || levels.map((l) => l.name);

    setClassSubjectInput(firstSubName);
    setClassLevelInput(catLvls[0] || "");

    setStartDateInput("");
    setEndDateInput("");
    setStartTimeInput(initialStart);
    setEndTimeInput(initialEnd);
    setCustomSessions([]);

    setCp1StartDate("");
    setCp1Deadline("");
    setCp1LateType("none");
    setCp1LateDeadline("");

    setCp2StartDate("");
    setCp2Deadline("");
    setCp2LateType("none");
    setCp2LateDeadline("");

    setFinalStartDate("");
    setFinalDeadline("");
    setFinalLateType("none");
    setFinalLateDeadline("");

    setPresStartDate("");
    setPresDeadline("");
    setPresLateType("none");
    setPresLateDeadline("");

    setAllowLateUpload(true);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (cls: any) => {
    if (!canEditClass(cls)) {
      showToast("Chỉ Admin mới có quyền chỉnh sửa Lớp Học Ngoại Lai!", "error");
      return;
    }

    setEditingClassId(cls.id || cls._id);
    setClassNameInput(cls.name || "");
    setSelectedTeachers(cls.teacherNames || (cls.teacherName ? [cls.teacherName] : []));
    setIsAllActiveTeachers(Boolean(cls.isAllActiveTeachers));
    setExcludedTeachers(cls.excludedTeacherNames || []);
    setIsExternalClass(Boolean(cls.isExternalClass));

    const existingClassStudents = visibleStudents.filter((s) => s.className === cls.name);
    setClassStudents(existingClassStudents);

    const catName = cls.category || categories[0]?.name || "";
    setClassCategoryInput(catName);
    setClassLevelInput(cls.level || levels[0]?.name || "");
    setClassSubjectInput(cls.subjectName || subjects[0]?.name || "");
    const sDate = cls.startDate ? new Date(cls.startDate).toISOString().split("T")[0] : "";
    const eDate = cls.endDate ? new Date(cls.endDate).toISOString().split("T")[0] : "";
    setStartDateInput(sDate);

    const startTime = cls.startTime || "18:00";
    const catObj = categories.find((c) => c.name === catName);
    const duration = catObj?.duration_minutes || 120;
    const endTime = cls.endTime || calcEndTimeFromStart(startTime, duration);

    setStartTimeInput(startTime);
    setEndTimeInput(endTime);

    let currentSchedule: SessionItem[] = [];
    if (cls.sessionsSchedule && Array.isArray(cls.sessionsSchedule) && cls.sessionsSchedule.length > 0) {
      currentSchedule = cls.sessionsSchedule;
    } else {
      currentSchedule = buildDefaultSessionsForCategory(sDate, startTime, endTime, catName);
    }
    setCustomSessions(currentSchedule);

    if (currentSchedule.length > 0) {
      setEndDateInput(currentSchedule[currentSchedule.length - 1].startDate);
    } else {
      setEndDateInput(eDate);
    }

    const toIsoLocal = (dStr: string) => (dStr ? new Date(dStr).toISOString().slice(0, 16) : "");
    const toIsoDate = (dStr: string) => (dStr ? new Date(dStr).toISOString().slice(0, 10) : "");

    setCp1StartDate(toIsoLocal(cls.checkpoint1StartDate));
    setCp1Deadline(toIsoLocal(cls.checkpoint1Deadline));
    setCp1LateType(cls.checkpoint1LateType || "none");
    setCp1LateDeadline(toIsoDate(cls.checkpoint1LateDeadline));

    setCp2StartDate(toIsoLocal(cls.checkpoint2StartDate));
    setCp2Deadline(toIsoLocal(cls.checkpoint2Deadline));
    setCp2LateType(cls.checkpoint2LateType || "none");
    setCp2LateDeadline(toIsoDate(cls.checkpoint2LateDeadline));

    setFinalStartDate(toIsoLocal(cls.finalProjectStartDate));
    setFinalDeadline(toIsoLocal(cls.finalProjectDeadline));
    setFinalLateType(cls.finalProjectLateType || "none");
    setFinalLateDeadline(toIsoDate(cls.finalProjectLateDeadline));

    setPresStartDate(toIsoLocal(cls.presentationStartDate));
    setPresDeadline(toIsoLocal(cls.presentationDeadline));
    setPresLateType(cls.presentationLateType || "none");
    setPresLateDeadline(toIsoDate(cls.presentationLateDeadline));

    setAllowLateUpload(cls.allowLateUpload ?? true);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      showToast("Tên hoặc Mã lớp học không được để trống", "error");
      return;
    }

    const finalEndDate = (!isExternalClass && customSessions.length > 0)
      ? customSessions[customSessions.length - 1].startDate
      : endDateInput;

    setIsSubmittingClass(true);
    try {
      const payload = {
        name: classNameInput.trim(),
        isExternalClass,
        isAllActiveTeachers: isExternalClass ? true : isAllActiveTeachers,
        excludedTeacherNames: (isExternalClass || isAllActiveTeachers) ? excludedTeachers : [],
        teacherNames: (isExternalClass || isAllActiveTeachers) ? [] : selectedTeachers,
        category: isExternalClass ? (categories[0]?.name || "Ngoại Lai") : classCategoryInput,
        level: isExternalClass ? (levels[0]?.name || "Chung") : classLevelInput,
        subjectName: isExternalClass ? (subjects[0]?.name || "Tự Do") : classSubjectInput,
        startDate: isExternalClass ? null : (startDateInput || null),
        endDate: isExternalClass ? null : (finalEndDate || null),
        startTime: isExternalClass ? "00:00" : startTimeInput,
        endTime: isExternalClass ? "23:59" : endTimeInput,
        sessionsSchedule: isExternalClass ? [] : customSessions,
        checkpoint1StartDate: cp1StartDate || null,
        checkpoint1Deadline: cp1Deadline || null,
        checkpoint1LateType: cp1LateType || "none",
        checkpoint1LateDeadline: cp1LateDeadline || null,
        checkpoint2StartDate: cp2StartDate || null,
        checkpoint2Deadline: cp2Deadline || null,
        checkpoint2LateType: cp2LateType || "none",
        checkpoint2LateDeadline: cp2LateDeadline || null,
        finalProjectStartDate: finalStartDate || null,
        finalProjectDeadline: finalDeadline || null,
        finalProjectLateType: finalLateType || "none",
        finalProjectLateDeadline: finalLateDeadline || null,
        presentationStartDate: presStartDate || null,
        presentationDeadline: presDeadline || null,
        presentationLateType: presLateType || "none",
        presentationLateDeadline: presLateDeadline || null,
        allowLateUpload: allowLateUpload,
        assignedStudentIds: isExternalClass ? [] : classStudents.map((s) => s.id || s._id),
      };

      const url = editingClassId ? `/api/admin/classes/${editingClassId}` : "/api/admin/classes";
      const method = editingClassId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingClassId ? "Cập nhật lớp thành công!" : "Tạo lớp thành công!", "success");
        setIsClassModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Lưu lớp thất bại", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra khi lưu lớp", "error");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleStartEditAccount = (t: any) => {
    setEditingAccountId(t.id || t._id);
    setEditingUsername(t.username || "");
    setEditingPassword("");
    setEditingDisplayName(t.displayName || t.name || "");
    const r = t.role === "admin" ? "admin" : "teacher";
    setEditingRole(r);
    setEditingOriginalRole(r);
    setEditingEmail(t.email || "");
    setEditingStatus(t.status || "pending_oauth");
    setIsEditAccountModalOpen(true);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountUsername.trim() || !newAccountPassword.trim() || !newAccountDisplayName.trim()) {
      showToast("Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu và Họ tên", "error");
      return;
    }
    setIsSubmittingAccount(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAccountUsername.trim(),
          password: newAccountPassword.trim(),
          displayName: newAccountDisplayName.trim(),
          role: newAccountRole,
        }),
      });

      if (res.ok) {
        showToast("Tạo tài khoản thành công!", "success");
        setIsAddAccountModalOpen(false);
        setNewAccountUsername("");
        setNewAccountPassword("");
        setNewAccountDisplayName("");
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Tạo tài khoản thất bại", "error");
      }
    } catch {
      showToast("Có lỗi khi tạo tài khoản", "error");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleSaveAccountEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountId) return;

    setIsSavingEdit(true);
    try {
      const payload: any = {
        displayName: editingDisplayName.trim(),
        role: editingRole,
        status: editingStatus,
      };
      if (editingPassword.trim()) {
        payload.password = editingPassword.trim();
      }

      const res = await fetch(`/api/admin/teachers/${editingAccountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Cập nhật tài khoản thành công!", "success");
        setIsEditAccountModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Cập nhật thất bại", "error");
      }
    } catch {
      showToast("Có lỗi khi cập nhật tài khoản", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const ensureTeacherExternalClass = async (teacherName: string): Promise<string | null> => {
    if (!teacherName) return null;
    const targetClassName = `Lớp Không Xác Định - GV ${teacherName}`;
    const existingCls = classes.find(
      (c) => c.name === targetClassName || (c.isExternalClass && c.teacherNames?.includes(teacherName))
    );
    if (existingCls) {
      return existingCls.name;
    }

    const confirmCreate = window.confirm(
      `Giáo viên "${teacherName}" chưa có Lớp Học Ngoại Lai.\n\nBạn có muốn hệ thống tự động khởi tạo lớp "${targetClassName}" không?`
    );

    if (!confirmCreate) {
      return null;
    }

    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetClassName,
          isExternalClass: true,
          isAllActiveTeachers: false,
          excludedTeacherNames: [],
          teacherNames: [teacherName],
          category: "Ngoại Lai",
          level: "Chung",
          subjectName: "Tự Do",
          startDate: null,
          endDate: null,
          startTime: "00:00",
          endTime: "23:59",
          sessionsSchedule: [],
          checkpoint1LateType: "none",
          checkpoint2LateType: "none",
          finalProjectLateType: "none",
        }),
      });

      if (res.ok) {
        showToast(`Đã tự động khởi tạo lớp "${targetClassName}"!`, "success");
        await loadData();
        return targetClassName;
      } else {
        const errData = await res.json();
        showToast(errData.error || "Tạo lớp ngoại lai thất bại", "error");
        return null;
      }
    } catch {
      showToast("Có lỗi xảy ra khi tự động khởi tạo lớp ngoại lai", "error");
      return null;
    }
  };

  const handleOpenAddStudentModal = () => {
    setEditingStudentId(null);
    setStudentNameInput("");
    setStudentCodeInput("");

    const defaultTeacherName = !isTeacherRoleMode
      ? (activeTeachers[0]?.displayName || activeTeachers[0]?.name || "")
      : effectiveTeacherName;
    setStudentExternalTeacherInput(defaultTeacherName);

    const defaultClass = isTeacherRoleMode
      ? `Lớp Không Xác Định - GV ${effectiveTeacherName}`
      : "EXTERNAL";
    setStudentClassNameInput(defaultClass);

    const teacherDefaultMB = currentUser?.defaultStudentMaxUploadSize || 50;
    setStudentMaxUploadSizeInput(teacherDefaultMB);
    setStudentStatusInput("active");
    setIsStudentModalOpen(true);
  };

  const handleStudentNameInputChange = (nameVal: string) => {
    setStudentNameInput(nameVal);
    if (!editingStudentId) {
      const generatedCode = generateStudentCodeFromName(nameVal, visibleStudents, null);
      setStudentCodeInput(generatedCode);
    }
  };

  const handleOpenEditStudentModal = (student: any) => {
    const stId = student.id || student._id;
    setEditingStudentId(stId);
    setStudentNameInput(student.name || "");
    const code = student.studentCode || generateStudentCodeFromName(student.name || "", visibleStudents, stId);
    setStudentCodeInput(code);

    const clsName = student.className || "";
    if (clsName.startsWith("Lớp Không Xác Định - GV ")) {
      const extractedTeacher = clsName.replace("Lớp Không Xác Định - GV ", "");
      setStudentExternalTeacherInput(extractedTeacher);
      setStudentClassNameInput(isTeacherRoleMode ? clsName : "EXTERNAL");
    } else if (clsName === "Lớp Học Ngoại Lai" || !clsName) {
      setStudentExternalTeacherInput(activeTeachers[0]?.displayName || activeTeachers[0]?.name || "");
      setStudentClassNameInput("EXTERNAL");
    } else {
      setStudentClassNameInput(clsName);
    }

    setStudentMaxUploadSizeInput(student.maxUploadSize || 50);
    setStudentStatusInput(student.status === "inactive" ? "inactive" : "active");
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim()) {
      showToast("Tên học viên không được để trống", "error");
      return;
    }

    const finalCode = studentCodeInput.trim() || generateStudentCodeFromName(studentNameInput, visibleStudents, editingStudentId);

    const isDuplicate = visibleStudents.some((st) => {
      const stId = st.id || st._id;
      return stId !== editingStudentId && st.studentCode && st.studentCode.trim().toLowerCase() === finalCode.toLowerCase();
    });

    if (isDuplicate) {
      showToast(`Mã học viên "${finalCode}" đã tồn tại. Vui lòng nhập mã khác`, "error");
      return;
    }

    let targetClassName = studentClassNameInput;
    const isExternalSelection =
      studentClassNameInput === "EXTERNAL" ||
      studentClassNameInput === "Lớp Học Ngoại Lai" ||
      studentClassNameInput.startsWith("Lớp Không Xác Định");

    if (isExternalSelection) {
      const assignedTeacher = !isTeacherRoleMode
        ? (studentExternalTeacherInput || activeTeachers[0]?.displayName || activeTeachers[0]?.name)
        : effectiveTeacherName;

      if (!assignedTeacher) {
        showToast("Vui lòng chọn Giáo viên phụ trách Lớp Ngoại Lai", "error");
        return;
      }

      const createdOrExistingName = await ensureTeacherExternalClass(assignedTeacher);
      if (!createdOrExistingName) {
        return;
      }
      targetClassName = createdOrExistingName;
    }

    setIsSubmittingStudent(true);
    try {
      const payload = {
        name: studentNameInput.trim(),
        studentCode: finalCode,
        className: targetClassName,
        maxUploadSize: Number(studentMaxUploadSizeInput) || 50,
        status: studentStatusInput,
      };

      const url = editingStudentId ? `/api/admin/students/${editingStudentId}` : "/api/admin/students";
      const method = editingStudentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingStudentId ? "Cập nhật học viên thành công!" : "Tạo học viên thành công!", "success");
        setIsStudentModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Lưu học viên thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi lưu học viên", "error");
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleOpenAddCategoryModal = () => {
    setEditingCatId(null);
    setNewCatName("");
    setNewCatCode("");
    setNewCatDesc("");
    setNewCatDurationMinutes(120);
    setNewCatTotalSessions(14);
    setNewCatTheorySessions("1-4, 6-8");
    setNewCatCp1Sessions("5");
    setNewCatCp2Sessions("9");
    setNewCatFinalProjectSessions("10-14");
    setNewCatPresentationSessions("14");
    const initialMap: { [key: string]: string[] } = {};
    subjects.forEach((sub) => {
      initialMap[sub.name] = levels.map((l) => l.name);
    });
    setCatSubjectLevelMap(initialMap);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name || "");
    setNewCatCode(cat.code || "");
    setNewCatDesc(cat.description || "");
    setNewCatDurationMinutes(cat.duration_minutes || 120);
    setNewCatTotalSessions(cat.total_sessions || 14);
    setNewCatTheorySessions(cat.theory_sessions ?? "1-4, 6-8");
    setNewCatCp1Sessions(cat.cp1_sessions ?? "5");
    setNewCatCp2Sessions(cat.cp2_sessions ?? "9");
    setNewCatFinalProjectSessions(cat.final_project_sessions ?? "10-14");
    setNewCatPresentationSessions(cat.presentation_sessions ?? "14");

    const parsedMap = parseCatSubjectLevelMap(cat);
    setCatSubjectLevelMap(parsedMap);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast("Tên khối học không được để trống", "error");
      return;
    }

    const activeSubjects = Object.keys(catSubjectLevelMap);
    if (activeSubjects.length === 0) {
      showToast("Vui lòng kích hoạt ít nhất 1 Môn học trong Khối này", "error");
      return;
    }

    const matrixArray = activeSubjects.map((subName) => ({
      subjectName: subName,
      levels: catSubjectLevelMap[subName],
    }));

    const allAllowedSubjectsStr = activeSubjects.join(", ");
    const uniqueLevelsSet = new Set<string>();
    activeSubjects.forEach((subName) => {
      catSubjectLevelMap[subName].forEach((lvl) => uniqueLevelsSet.add(lvl));
    });
    const allAllowedLevelsStr = Array.from(uniqueLevelsSet).join(", ");

    setIsSubmittingCategory(true);
    try {
      const payload = {
        name: newCatName.trim(),
        code: newCatCode.trim() || newCatName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        description: newCatDesc.trim(),
        duration_minutes: Number(newCatDurationMinutes) || 120,
        total_sessions: Number(newCatTotalSessions) || 14,
        theory_sessions: newCatTheorySessions.trim() || "1-4, 6-8",
        cp1_sessions: newCatCp1Sessions.trim() || "5",
        cp2_sessions: newCatCp2Sessions.trim() || "9",
        final_project_sessions: newCatFinalProjectSessions.trim() || "10-14",
        presentation_sessions: newCatPresentationSessions.trim() || "14",
        allowed_subjects: allAllowedSubjectsStr,
        allowed_levels: allAllowedLevelsStr,
        allowed_subject_levels: JSON.stringify(matrixArray),
      };

      const url = editingCatId ? `/api/admin/categories/${editingCatId}` : "/api/admin/categories";
      const method = editingCatId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingCatId ? "Cập nhật khối học thành công!" : "Tạo khối học thành công!", "success");
        setIsCategoryModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Lưu khối học thất bại", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra khi lưu khối học", "error");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleOpenAddSubjectModal = () => {
    setEditingSubjectId(null);
    setNewSubjectName("");
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubjectModal = (sub: any) => {
    setEditingSubjectId(sub.id);
    setNewSubjectName(sub.name || "");
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      showToast("Tên môn học không được để trống", "error");
      return;
    }
    setIsSubmittingSubject(true);
    try {
      const url = editingSubjectId ? `/api/admin/subjects/${editingSubjectId}` : "/api/admin/subjects";
      const method = editingSubjectId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim() }),
      });

      if (res.ok) {
        showToast(editingSubjectId ? "Cập nhật môn học thành công!" : "Tạo môn học thành công!", "success");
        setIsSubjectModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Lưu môn học thất bại", "error");
      }
    } catch {
      showToast("Có lỗi khi lưu môn học", "error");
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const handleOpenAddLevelModal = () => {
    setEditingLevelId(null);
    setNewLevelName("");
    setNewLevelDesc("");
    setIsLevelModalOpen(true);
  };

  const handleOpenEditLevelModal = (lvl: any) => {
    setEditingLevelId(lvl.id);
    setNewLevelName(lvl.name || "");
    setNewLevelDesc(lvl.description || "");
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) {
      showToast("Tên cấp độ không được để trống", "error");
      return;
    }
    setIsSubmittingLevel(true);
    try {
      const url = editingLevelId ? `/api/admin/levels/${editingLevelId}` : "/api/admin/levels";
      const method = editingLevelId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLevelName.trim(), description: newLevelDesc.trim() }),
      });

      if (res.ok) {
        showToast(editingLevelId ? "Cập nhật cấp độ thành công!" : "Tạo cấp độ thành công!", "success");
        setIsLevelModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Lưu cấp độ thất bại", "error");
      }
    } catch {
      showToast("Có lỗi khi lưu cấp độ", "error");
    } finally {
      setIsSubmittingLevel(false);
    }
  };

  const handleDeleteItem = async (endpoint: string, id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mục này không?")) return;
    try {
      const res = await fetch(`/api/admin/${endpoint}/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa thành công!", "success");
        loadData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Xóa mục thất bại", "error");
    }
  };

  // Requirement 8: OVERVIEW CHART COMPUTATIONS (EXCLUDE LỚP NGOẠI LAI, GROUP BY CLASS CODE)
  const officialClassesOnly = visibleClasses.filter(
    (c) => !c.isExternalClass && c.name !== "Lớp Học Ngoại Lai"
  );

  // 1. Submissions by Official Class Code (Bar Chart)
  const submissionsByClassMap: { [classCode: string]: number } = {};
  visibleSubmissions.forEach((sub) => {
    const cName = sub.className || sub.class_name;
    if (cName && cName !== "Lớp Học Ngoại Lai" && cName !== "Chưa xếp lớp") {
      submissionsByClassMap[cName] = (submissionsByClassMap[cName] || 0) + 1;
    }
  });

  const chartSubmissionsData = Object.keys(submissionsByClassMap).map((cName) => ({
    name: cName,
    submissions: submissionsByClassMap[cName],
  }));

  if (chartSubmissionsData.length === 0) {
    officialClassesOnly.forEach((c) => {
      chartSubmissionsData.push({ name: c.name, submissions: 0 });
    });
  }

  // 2. Student Distribution by Official Class Code (Pie / Donut Chart)
  const studentsByClassMap: { [classCode: string]: number } = {};
  visibleStudents.forEach((st) => {
    const cName = st.className;
    if (cName && cName !== "Lớp Học Ngoại Lai" && cName !== "Chưa xếp lớp") {
      studentsByClassMap[cName] = (studentsByClassMap[cName] || 0) + 1;
    }
  });

  const paletteColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
  const chartStudentDistributionData = Object.keys(studentsByClassMap).map((cName, idx) => ({
    name: cName,
    value: studentsByClassMap[cName],
    color: paletteColors[idx % paletteColors.length],
  }));

  if (chartStudentDistributionData.length === 0) {
    officialClassesOnly.forEach((c, idx) => {
      chartStudentDistributionData.push({
        name: c.name,
        value: 0,
        color: paletteColors[idx % paletteColors.length],
      });
    });
  }

  // 3. Activity Timeline Data (Area Chart)
  const activityTimelineData = [
    { month: "Tháng 3", submissions: Math.max(1, Math.floor(visibleSubmissions.length * 0.15)), visits: Math.floor(stats.totalVisits * 0.2) },
    { month: "Tháng 4", submissions: Math.max(2, Math.floor(visibleSubmissions.length * 0.3)), visits: Math.floor(stats.totalVisits * 0.4) },
    { month: "Tháng 5", submissions: Math.max(4, Math.floor(visibleSubmissions.length * 0.6)), visits: Math.floor(stats.totalVisits * 0.7) },
    { month: "Tháng 6", submissions: Math.max(7, Math.floor(visibleSubmissions.length * 0.85)), visits: Math.floor(stats.totalVisits * 0.9) },
    { month: "Tháng 7", submissions: visibleSubmissions.length, visits: stats.totalVisits },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Dashboard Header & View Mode Control Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" /> Administration Panel
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
            Bảng Quản Trị Hệ Thống
          </h1>
          <p className="text-sm text-muted-foreground text-balance">
            {isTeacherRoleMode
              ? `Đang mô phỏng giao diện Giáo Viên (${effectiveTeacherName})`
              : "Quản lý dữ liệu hệ thống MindX Hub"}
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
        {navTabs.map((tab) => {
          if (isTeacherRoleMode && !tab.staffAllowed) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab View Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* --- TAB 0: OVERVIEW --- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Requirement 2: SINGLE ROW LAYOUT FOR OVERVIEW STAT CARDS (Mỗi chỉ số nằm từng hàng riêng biệt) */}
            <div className="grid grid-cols-1 gap-4">
              {/* Stat Row 1: Lớp Học Phụ Trách */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-primary/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      Lớp Học Phụ Trách {isTeacherRoleMode && <span className="text-xs text-primary font-normal">({effectiveTeacherName})</span>}
                    </h4>
                    <p className="text-xs text-muted-foreground">Tổng số mã lớp học đang thuộc phạm vi quản lý của bạn</p>
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="text-3xl font-extrabold font-mono text-primary">{visibleClasses.length}</span>
                  <span className="text-xs text-muted-foreground block font-medium">Lớp học active</span>
                </div>
              </div>

              {/* Stat Row 2: Tổng Học Viên */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-success/10 via-card to-card border border-success/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-success/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-success/20 border border-success/30 flex items-center justify-center text-success shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Tổng Số Học Viên</h4>
                    <p className="text-xs text-muted-foreground">Số lượng học viên chính thức và lớp ngoại lai trong hệ thống</p>
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="text-3xl font-extrabold font-mono text-success">{visibleStudents.length}</span>
                  <span className="text-xs text-muted-foreground block font-medium">Học viên</span>
                </div>
              </div>

              {/* Stat Row 3: Bài Tập Đã Nộp */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-card to-card border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-amber-500/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">Bài Tập Đã Nộp</h4>
                    <p className="text-xs text-muted-foreground">Tổng số lượt bài tập học viên đã nộp lên hệ thống</p>
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="text-3xl font-extrabold font-mono text-amber-500">{visibleSubmissions.length}</span>
                  <span className="text-xs text-muted-foreground block font-medium">Bài nộp</span>
                </div>
              </div>

              {!isTeacherRoleMode && (
                <>
                  {/* Stat Row 4: Tài Khoản Hệ Thống */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-card to-card border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-purple-500/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">Tài Khoản Hệ Thống</h4>
                        <p className="text-xs text-muted-foreground">Danh sách tài khoản Admin và Giáo viên đang hoạt động</p>
                      </div>
                    </div>
                    <div className="text-right sm:text-right w-full sm:w-auto">
                      <span className="text-3xl font-extrabold font-mono text-purple-500">{stats.totalTeachers}</span>
                      <span className="text-xs text-muted-foreground block font-medium">Tài khoản</span>
                    </div>
                  </div>

                  {/* Stat Row 5: Lượt Truy Cập */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-card to-card border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-cyan-500/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shrink-0">
                        <Eye className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">Tổng Lượt Truy Cập</h4>
                        <p className="text-xs text-muted-foreground">Thống kê lưu lượng truy cập hệ thống MindX Hub</p>
                      </div>
                    </div>
                    <div className="text-right sm:text-right w-full sm:w-auto">
                      <span className="text-3xl font-extrabold font-mono text-cyan-500">{stats.totalVisits}</span>
                      <span className="text-xs text-muted-foreground block font-medium">Lượt xem</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recharts Graphical Dashboard Charts */}
            <div className="grid grid-cols-1 gap-6">
              {/* Chart 1: Bar Chart */}
              <div className="p-5 rounded-2xl bg-input/20 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span>Thống Kê Bài Nộp Theo Lớp Học</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Phân bổ số lượng bài nộp theo từng Mã lớp chính thức</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    Mã Lớp
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSubmissionsData}>
                      <XAxis dataKey="name" stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                      <YAxis stroke="currentColor" fontSize={11} className="text-muted-foreground" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "12px",
                          color: "var(--foreground)",
                        }}
                      />
                      <Bar dataKey="submissions" name="Bài Nộp" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Donut Chart */}
              <div className="p-5 rounded-2xl bg-input/20 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-amber-500" />
                      <span>Tỷ Lệ Học Viên Phân Bổ Theo Lớp</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Số lượng học viên trong từng Mã lớp chính thức</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Phân Bổ Lớp
                  </span>
                </div>

                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartStudentDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartStudentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "12px",
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Area Chart */}
              <div className="p-5 rounded-2xl bg-input/20 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span>Xu Hướng Hoạt Động Bài Nộp & Tương Tác</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Tăng trưởng tương tác theo thời gian</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                    Area Timeline
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityTimelineData}>
                      <defs>
                        <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                      <YAxis stroke="currentColor" fontSize={11} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "12px",
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="submissions" name="Bài Nộp" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSubmissions)" />
                      <Area type="monotone" dataKey="visits" name="Lượt Truy Cập" stroke="#10b981" fillOpacity={1} fill="url(#colorVisits)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: CLASSES --- */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Danh Sách Lớp Học</h3>
                <p className="text-xs text-muted-foreground text-balance">
                  {isTeacherRoleMode ? `Các lớp học do giáo viên "${effectiveTeacherName}" phụ trách` : "Quản lý danh sách mã lớp học"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddClassModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Lớp Học</span>
              </button>
            </div>

            {/* Classes Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-input/20 border border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm theo Mã hoặc Tên lớp học..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <select
                value={classStatusFilter}
                onChange={(e) => setClassStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">📋 Tất cả Trạng Thái Lớp</option>
                <option value="active">🟢 Đang hoạt động</option>
                <option value="preparing">🟡 Chuẩn bị mở lớp</option>
                <option value="ended">🔴 Đã kết thúc</option>
                <option value="external">🌐 Lớp Hệ Thống Ngoại Lai</option>
              </select>
            </div>

            {/* Classes Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Mã Lớp Học</th>
                    <th className="py-3 px-4 whitespace-nowrap">Trạng Thái</th>
                    <th className="py-3 px-4 whitespace-nowrap">Khối & Môn Học</th>
                    <th className="py-3 px-4 whitespace-nowrap">Cấp Độ</th>
                    <th className="py-3 px-4 whitespace-nowrap">Giáo Viên Phụ Trách</th>
                    <th className="py-3 px-4 whitespace-nowrap">Thời Gian Học</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedClasses.map((cls) => {
                    const statusObj = getClassStatus(cls);
                    const isEditable = canEditClass(cls);
                    const teacherList = cls.teacherNames || (cls.teacherName ? [cls.teacherName] : []);

                    return (
                      <tr key={cls.id || cls._id} className="hover:bg-input/20">
                        <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          {cls.name || "—"}
                          {cls.isExternalClass && (
                            <span className="ml-2 px-2 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              Lớp Hệ Thống
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusObj.badgeClass}`}>
                            {statusObj.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {cls.isExternalClass ? (
                            <span className="text-xs font-semibold text-amber-500">Lớp Dạy Bù Tự Do</span>
                          ) : (
                            <div className="text-xs font-semibold text-foreground">
                              {cls.subjectName || "—"}
                              {cls.category && (
                                <span className="ml-2 inline-block px-2 py-0.5 rounded-md text-[10px] bg-secondary text-muted-foreground border border-border font-medium">
                                  {cls.category}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {cls.level || "Basic"}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {cls.isAllActiveTeachers || cls.isExternalClass ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              Tất cả GV Active
                            </span>
                          ) : teacherList.length > 2 ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-secondary text-foreground border border-border" title={teacherList.join(", ")}>
                              👨‍🏫 {teacherList.length} Giáo Viên
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {teacherList.map((tName: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded-lg text-xs font-medium bg-muted text-foreground border border-border">
                                  👨‍🏫 {tName}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {cls.isExternalClass ? (
                            <span className="text-amber-500 italic">Không giới hạn giờ</span>
                          ) : (
                            <span>{cls.startTime || "18:00"} - {cls.endTime || "20:00"}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          {isEditable ? (
                            <button
                              onClick={() => handleOpenEditClassModal(cls)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Sửa thông tin lớp"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="inline-flex p-1.5 text-muted-foreground/40 cursor-not-allowed">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          )}

                          {currentUser?.role === "admin" && activeViewMode === "admin" && (
                            <button
                              onClick={() => handleDeleteItem("classes", cls.id || cls._id)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Xóa lớp"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedClasses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy lớp học nào khớp với tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={classPage}
              totalPages={classTotalPages}
              totalItems={classTotalItems}
              pageSize={classPageSize}
              onPageChange={setClassPage}
              onPageSizeChange={setClassPageSize}
            />
          </div>
        )}

        {/* --- TAB: CATEGORIES --- */}
        {activeTab === "categories" && !isTeacherRoleMode && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Quản Lý Khối Học</h3>
                <p className="text-xs text-muted-foreground text-balance">
                  Định nghĩa Khối học, Mã khối, Số buổi học & Cấu hình mốc buổi
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCategoryModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Khối Học</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-input/20 border border-border">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Tìm theo Tên hoặc Mã khối học..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Khối Học</th>
                    <th className="py-3 px-4">Mã Khối</th>
                    <th className="py-3 px-4">Thời Lượng & Buổi</th>
                    <th className="py-3 px-4">Mốc Buổi Học</th>
                    <th className="py-3 px-4">Môn Học Trực Thuộc</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedCategories.map((c) => {
                    const matrixMap = parseCatSubjectLevelMap(c);
                    const subNames = Object.keys(matrixMap);

                    return (
                      <tr key={c.id} className="hover:bg-input/20">
                        <td className="py-3 px-4 font-bold text-foreground whitespace-nowrap">{c.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-primary font-bold whitespace-nowrap">{c.code || "—"}</td>

                        <td className="py-3 px-4 whitespace-nowrap space-y-1 font-mono text-xs">
                          <div>⏱️ {c.duration_minutes || 120} phút</div>
                          <div>📚 {c.total_sessions || 14} buổi</div>
                        </td>

                        <td className="py-3 px-4 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded bg-secondary text-foreground text-[11px] border border-border">
                            LT: {c.theory_sessions ?? "1-4, 6-8"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold" title={subNames.join(", ")}>
                            📚 {subNames.length} Môn Học
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditCategoryModal(c)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem("categories", c.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedCategories.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy khối học nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={categoryPage}
              totalPages={categoryTotalPages}
              totalItems={categoryTotalItems}
              pageSize={categoryPageSize}
              onPageChange={setCategoryPage}
              onPageSizeChange={setCategoryPageSize}
            />
          </div>
        )}

        {/* --- TAB: SUBJECTS --- */}
        {activeTab === "subjects" && !isTeacherRoleMode && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Danh Mục Môn Học</h3>
                <p className="text-xs text-muted-foreground">Quản lý danh mục các môn học</p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSubjectModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Môn Học</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-input/20 border border-border">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Tìm theo Tên môn học..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Môn Học</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedSubjects.map((s) => (
                    <tr key={s.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-bold text-foreground">{s.name}</td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditSubjectModal(s)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem("subjects", s.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedSubjects.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy môn học nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={subjectPage}
              totalPages={subjectTotalPages}
              totalItems={subjectTotalItems}
              pageSize={subjectPageSize}
              onPageChange={setSubjectPage}
              onPageSizeChange={setSubjectPageSize}
            />
          </div>
        )}

        {/* --- TAB: LEVELS --- */}
        {activeTab === "levels" && !isTeacherRoleMode && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Quản Lý Cấp Độ</h3>
                <p className="text-xs text-muted-foreground">Danh mục cấp độ khóa học</p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddLevelModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Cấp Độ</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-input/20 border border-border">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Tìm theo Tên hoặc Mô tả cấp độ..."
                  value={levelSearchQuery}
                  onChange={(e) => setLevelSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Cấp Độ</th>
                    <th className="py-3 px-4">Mô Tả</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedLevels.map((lvl) => (
                    <tr key={lvl.id} className="hover:bg-input/20">
                      <td className="py-3 px-4 font-bold text-primary">{lvl.name}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{lvl.description || "—"}</td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditLevelModal(lvl)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem("levels", lvl.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedLevels.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy cấp độ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={levelPage}
              totalPages={levelTotalPages}
              totalItems={levelTotalItems}
              pageSize={levelPageSize}
              onPageChange={setLevelPage}
              onPageSizeChange={setLevelPageSize}
            />
          </div>
        )}

        {/* --- TAB: TEACHERS --- */}
        {activeTab === "teachers" && !isTeacherRoleMode && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Tài Khoản Hệ Thống</h3>
                <p className="text-xs text-muted-foreground">Quản lý quyền hạn và trạng thái tài khoản</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Tài Khoản</span>
              </button>
            </div>

            {/* Teachers Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-input/20 border border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm theo Username, Họ tên, Email..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <select
                value={teacherRoleFilter}
                onChange={(e) => setTeacherRoleFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">👤 Tất cả Vai Trò</option>
                <option value="admin">🛡️ Admin</option>
                <option value="teacher">👨‍🏫 Giáo Viên</option>
              </select>

              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">📋 Tất cả Trạng Thái</option>
                <option value="active">🟢 Đang hoạt động</option>
                <option value="pending_oauth">🟡 Đợi ủy quyền OAuth</option>
                <option value="inactive">🔴 Ngừng hoạt động</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Tên Đăng Nhập</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-4">Vai Trò</th>
                    <th className="py-3 px-4">Email Google</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedTeachers.map((t) => {
                    const isSelf = currentUser && (currentUser.id === t.id || currentUser.id === t._id);

                    return (
                      <tr key={t.id} className="hover:bg-input/20">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">{t.username || "—"}</td>
                        <td className="py-3 px-4 font-semibold text-foreground">{t.displayName || t.name}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            t.role === "admin" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border"
                          }`}>
                            {t.role === "admin" ? "Admin" : "Giáo viên"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{t.email || "Chưa liên kết"}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {t.status === "inactive" || t.status === "ngừng hoạt động" ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                              🔴 Ngừng hoạt động
                            </span>
                          ) : t.status === "pending_oauth" || !t.email ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              🟡 Đợi ủy quyền OAuth
                            </span>
                          ) : (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/15 text-success border border-success/30">
                              🟢 Đang hoạt động
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {!isSelf ? (
                            <button
                              onClick={() => handleStartEditAccount(t)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="inline-flex p-1.5 text-muted-foreground/40 cursor-not-allowed">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedTeachers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy tài khoản nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={teacherPage}
              totalPages={teacherTotalPages}
              totalItems={teacherTotalItems}
              pageSize={teacherPageSize}
              onPageChange={setTeacherPage}
              onPageSizeChange={setTeacherPageSize}
            />
          </div>
        )}

        {/* --- TAB: STUDENTS --- */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Quản Lý Học Viên</h3>
                <p className="text-xs text-muted-foreground">
                  Quản lý mã học viên tự động sinh dạng <code className="text-primary font-bold">anhhn</code>, phân lớp & dung lượng
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddStudentModal}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Học Viên</span>
              </button>
            </div>

            {/* Student Search & Filters */}
            <div className="p-4 rounded-2xl bg-input/20 border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm theo Tên hoặc Mã học viên..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">🏫 Tất cả Lớp Học</option>
                  <option value="EXTERNAL">🌐 Chỉ Lớp Ngoại Lai</option>
                  {visibleClasses.map((c) => (
                    <option key={c.id || c._id} value={c.name}>
                      🏫 {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">📋 Tất cả Trạng Thái</option>
                  <option value="active">🟢 Đang học</option>
                  <option value="inactive">🔴 Tạm dừng</option>
                </select>
              </div>
            </div>

            {/* Student Master Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã Học Viên</th>
                    <th className="py-3 px-4">Họ và Tên Học Viên</th>
                    <th className="py-3 px-4">Lớp Học Phụ Trách</th>
                    <th className="py-3 px-4">Dung Lượng (MB)</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedStudents.map((s) => {
                    const isExternal = !s.className || s.className === "Lớp Học Ngoại Lai" || s.className === "Chưa xếp lớp";
                    const generatedCode = s.studentCode || generateStudentCodeFromName(s.name || "", visibleStudents, s.id || s._id);

                    return (
                      <tr key={s.id || s._id} className="hover:bg-input/20">
                        <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                            {generatedCode}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                          <span>{s.name}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isExternal ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              Lớp Ngoại Lai
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              🏫 {s.className}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs font-bold text-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary border border-border">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>{s.maxUploadSize || 50} MB</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {s.status === "inactive" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                              🔴 Tạm dừng
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/15 text-success border border-success/30">
                              🟢 Đang học
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditStudentModal(s)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Sửa học viên"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem("students", s.id || s._id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Xóa học viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy học viên nào khớp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={studentPage}
              totalPages={studentTotalPages}
              totalItems={studentTotalItems}
              pageSize={studentPageSize}
              onPageChange={setStudentPage}
              onPageSizeChange={setStudentPageSize}
            />
          </div>
        )}

        {/* --- TAB: SUBMISSIONS --- */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Quản Lý Bài Nộp Học Viên</h3>
                <p className="text-xs text-muted-foreground">Lịch sử nộp bài của các lớp học</p>
              </div>

              {/* Sync Drive Button if pending items exist */}
              {visibleSubmissions.some((sub) => sub.is_pending_drive_sync || sub.isPendingDriveSync) && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/admin/submissions/sync-drive", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ teacherName: isTeacherRoleMode ? effectiveTeacherName : undefined }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        showToast(data.message || "Đã đồng bộ Google Drive thành công!", "success");
                        loadData();
                      } else {
                        showToast(data.error || "Không thể đẩy bài về Google Drive", "error");
                      }
                    } catch {
                      showToast("Lỗi kết nối đồng bộ Google Drive", "error");
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 whitespace-nowrap animate-pulse"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>⚡ Đẩy Bài Về Google Drive</span>
                </button>
              )}
            </div>

            {/* Pending Sync Alert Banner */}
            {(() => {
              const pendingItems = visibleSubmissions.filter((sub) => sub.is_pending_drive_sync || sub.isPendingDriveSync);
              if (pendingItems.length === 0) return null;
              return (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold space-y-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        ⚠️ Cảnh báo: Đang có {pendingItems.length} bài nộp được lưu tạm trên Supabase Storage do Google Drive bị đầy bộ nhớ!
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Sau khi Giáo viên đã dọn dẹp dung lượng Drive, bấm nút bên cạnh để đẩy lại bài về Google Drive tương ứng với Mã lớp & Giai đoạn.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/admin/submissions/sync-drive", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ teacherName: isTeacherRoleMode ? effectiveTeacherName : undefined }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          showToast(data.message || "Đã đẩy bài về Google Drive thành công!", "success");
                          loadData();
                        } else {
                          showToast(data.error || "Lỗi đồng bộ Google Drive", "error");
                        }
                      } catch {
                        showToast("Lỗi kết nối", "error");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <span>⚡ Đẩy Lại Bài Về Google Drive</span>
                  </button>
                </div>
              );
            })()}

            {/* Submissions Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-input/20 border border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm theo Tên hoặc Mã học viên..."
                  value={submissionSearchQuery}
                  onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <select
                value={submissionClassFilter}
                onChange={(e) => setSubmissionClassFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">🏫 Tất cả Lớp Học</option>
                {visibleClasses.map((c) => (
                  <option key={c.id || c._id} value={c.name}>
                    🏫 {c.name}
                  </option>
                ))}
              </select>

              <select
                value={submissionTeacherFilter}
                onChange={(e) => setSubmissionTeacherFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">👨‍🏫 Tất cả Giáo Viên</option>
                {activeTeachers.map((t) => (
                  <option key={t.id || t._id} value={t.displayName || t.name}>
                    👨‍🏫 {t.displayName || t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Họ và Tên (Mã HV)</th>
                    <th className="py-3 px-4">Lớp Học (Lịch Sử)</th>
                    <th className="py-3 px-4">Giai Đoạn / Buổi</th>
                    <th className="py-3 px-4">Ngày Nộp</th>
                    <th className="py-3 px-4">Link Bài Nộp</th>
                    <th className="py-3 px-4">Ghi Chú</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedSubmissions.map((sub) => {
                    const stName = sub.fullName || sub.studentName || "—";
                    const stCode = sub.studentCode;
                    const url = sub.fileUrl || sub.file_url || "";
                    const isSupabase = sub.storage_provider === "supabase" || sub.storageProvider === "supabase" || url.includes("supabase.co");
                    const isDrive = url.includes("drive.google.com");
                    const isCanva = url.includes("canva.com");
                    const isGithub = url.includes("github.com");

                    return (
                      <tr key={sub.id || sub._id} className="hover:bg-input/20">
                        <td className="py-3 px-4 space-y-0.5 whitespace-nowrap">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                            <span>{stName}</span>
                          </div>
                          {stCode && (
                            <span className="inline-block px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                              {stCode}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                          <span className="px-2.5 py-1 rounded-lg bg-secondary border border-border">
                            🏫 {sub.className || sub.class_name || "Lớp Ngoại Lai"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs space-y-0.5 whitespace-nowrap">
                          <div className="font-bold text-primary font-mono">{sub.stage || sub.checkpointTitle || "Buổi học"}</div>
                          {sub.session && <div className="text-muted-foreground text-[11px]">{sub.session}</div>}
                        </td>

                        <td className="py-3 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDate(sub.createdAt)}
                        </td>

                        {/* Link Bài Nộp Column with Platform Badges */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {url ? (
                            <div className="flex items-center gap-2">
                              {isSupabase ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                                  <span>Supabase Storage</span>
                                </span>
                              ) : isDrive ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                                  <span>Google Drive</span>
                                </span>
                              ) : isCanva ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30 flex items-center gap-1">
                                  <span>Canva</span>
                                </span>
                              ) : isGithub ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary text-foreground border border-border flex items-center gap-1">
                                  <span>GitHub</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-muted-foreground border border-border flex items-center gap-1">
                                  <span>Liên kết</span>
                                </span>
                              )}

                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Mở liên kết bài nộp"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">
                          {sub.notes ? (
                            <span className="italic text-foreground/90 font-medium">"{sub.notes}"</span>
                          ) : (
                            <span className="text-muted-foreground/50 italic">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteItem("submissions", sub.id || sub._id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Xóa bài nộp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        Không tìm thấy bài nộp nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={submissionPage}
              totalPages={submissionTotalPages}
              totalItems={submissionTotalItems}
              pageSize={submissionPageSize}
              onPageChange={setSubmissionPage}
              onPageSizeChange={setSubmissionPageSize}
            />
          </div>
        )}
      </div>

      {/* --- MODAL: CLASS MODAL --- */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {editingClassId ? "Chỉnh Sửa Lớp Học" : "Thêm Lớp Học Mới"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* External Class Checkbox Option & Disable Rule */}
              {(() => {
                const hasExistingExternalClass = classes.some(
                  (c) => Boolean(c.isExternalClass) && (c.id || c._id) !== editingClassId
                );

                return (
                  <div className="p-3.5 rounded-xl bg-input/30 border border-border space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                      <input
                        type="checkbox"
                        checked={isExternalClass}
                        disabled={hasExistingExternalClass}
                        onChange={(e) => setIsExternalClass(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                      />
                      <span className={hasExistingExternalClass ? "text-muted-foreground" : "text-amber-500 font-bold"}>
                        Đánh dấu đây là Lớp Học Ngoại Lai
                      </span>
                    </label>
                    {hasExistingExternalClass && (
                      <p className="text-[11px] text-muted-foreground italic">
                        ⚠️ Hệ thống đã tồn tại Lớp Học Ngoại Lai. Mỗi hệ thống chỉ có tối đa 1 Lớp Học Ngoại Lai.
                      </p>
                    )}
                    {isExternalClass && (
                      <p className="text-[11px] text-amber-500/90 font-medium">
                        💡 Lớp Học Ngoại Lai dùng làm kho chứa dữ liệu cho học viên tự do / ngoại lai. Không cần thiết lập Khối học, Môn học, Giáo viên hay Lịch học.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>1. Mã / Tên Lớp Học *</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập mã hoặc tên lớp học..."
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground bg-input/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  required
                />
              </div>

              {/* Category, Subject, Level Selection (Only for Regular Classes) */}
              {!isExternalClass && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>Khối Học *</span>
                    </label>
                    <select
                      value={classCategoryInput}
                      onChange={(e) => handleCategoryChangeInClassModal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookMarked className="w-3.5 h-3.5 text-primary" />
                      <span>Môn Học *</span>
                    </label>
                    <select
                      value={classSubjectInput}
                      onChange={(e) => setClassSubjectInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {availableCatSubjects.map((subName: string, idx: number) => (
                        <option key={idx} value={subName}>{subName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      <span>Cấp Độ *</span>
                    </label>
                    <select
                      value={classLevelInput}
                      onChange={(e) => setClassLevelInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {availableCatLevels.map((lvlName: string, idx: number) => (
                        <option key={idx} value={lvlName}>{lvlName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 2. Teacher Assignment (Only for Regular Classes) */}
              {!isExternalClass && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span>2. Giáo Viên Phụ Trách *</span>
                  </label>

                  {isTeacherRoleMode ? (
                    <div className="p-3.5 rounded-xl bg-input/30 border border-border flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Giáo viên phụ trách lớp:</span>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                        👨‍🏫 {effectiveTeacherName}
                      </span>
                      <span className="text-[11px] text-muted-foreground italic font-medium">
                        (Mặc định bạn là giáo viên phụ trách lớp học này)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={isAllActiveTeachers}
                          onChange={(e) => setIsAllActiveTeachers(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Áp dụng cho tất cả Giáo viên active (Tự động cấp quyền quản lý cho tất cả GV)</span>
                      </label>

                      {isAllActiveTeachers ? (
                        <div className="p-3 rounded-xl bg-input/30 border border-border space-y-2">
                          <span className="text-xs font-bold text-muted-foreground block">Chọn Giáo viên muốn loại trừ (nếu có):</span>
                          <div className="flex flex-wrap gap-2">
                            {activeTeachers.map((t) => {
                              const tName = t.displayName || t.name;
                              const isExcluded = excludedTeachers.includes(tName);
                              return (
                                <button
                                  key={t.id || t._id}
                                  type="button"
                                  onClick={() => {
                                    if (isExcluded) {
                                      setExcludedTeachers(excludedTeachers.filter((n) => n !== tName));
                                    } else {
                                      setExcludedTeachers([...excludedTeachers, tName]);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    isExcluded
                                      ? "bg-destructive/15 text-destructive border border-destructive/30"
                                      : "bg-secondary text-foreground border border-border"
                                  }`}
                                >
                                  <span>{tName}</span>
                                  {isExcluded ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeTeachers.map((t) => {
                            const tName = t.displayName || t.name;
                            const isSelected = selectedTeachers.includes(tName);
                            return (
                              <button
                                key={t.id || t._id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedTeachers(selectedTeachers.filter((n) => n !== tName));
                                  } else {
                                    setSelectedTeachers([...selectedTeachers, tName]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                                }`}
                              >
                                <span>👨‍🏫 {tName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Schedule & Time Settings (Only for Regular Classes) */}
              {!isExternalClass && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>3. Thời Gian & Lịch Khai Giảng *</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground block uppercase">Ngày Bắt Đầu *</span>
                      <input
                        type="date"
                        value={startDateInput}
                        onChange={(e) => {
                          const sDate = e.target.value;
                          setStartDateInput(sDate);
                          if (sDate && classCategoryInput) {
                            const generated = buildDefaultSessionsForCategory(sDate, startTimeInput, endTimeInput, classCategoryInput);
                            setCustomSessions(generated);
                            if (generated.length > 0) {
                              setEndDateInput(generated[generated.length - 1].startDate);
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground block uppercase">Giờ Bắt Đầu *</span>
                      <input
                        type="time"
                        value={startTimeInput}
                        onChange={(e) => {
                          const st = e.target.value;
                          setStartTimeInput(st);
                          const duration = selectedCatObj?.duration_minutes || 120;
                          const calculatedEnd = calcEndTimeFromStart(st, duration);
                          setEndTimeInput(calculatedEnd);
                          if (startDateInput && classCategoryInput) {
                            const generated = buildDefaultSessionsForCategory(startDateInput, st, calculatedEnd, classCategoryInput);
                            setCustomSessions(generated);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground block uppercase">Giờ Kết Thúc (Tự động)</span>
                      <input
                        type="time"
                        value={endTimeInput}
                        onChange={(e) => setEndTimeInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono bg-muted/50"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Stage / Checkpoints / SPCK / Presentation Deadline Configurations */}
              {!isExternalClass && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-primary" />
                      <span>4. Cấu Hình Hạn Nộp Các Giai Đoạn (Để trống sẽ tự tính theo lịch học)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={allowLateUpload}
                        onChange={(e) => setAllowLateUpload(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Cho phép nộp bài muộn</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Checkpoint 1 */}
                    <div className="p-3 rounded-xl bg-input/30 border border-border space-y-2">
                      <span className="text-xs font-bold text-primary block border-b border-border/40 pb-1">🚩 Checkpoint 1</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Giờ mở cổng</label>
                          <input
                            type="datetime-local"
                            value={cp1StartDate}
                            onChange={(e) => setCp1StartDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Hạn chót chính thức</label>
                          <input
                            type="datetime-local"
                            value={cp1Deadline}
                            onChange={(e) => setCp1Deadline(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                      </div>
                      {allowLateUpload && (
                        <div className="pt-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground block font-semibold">Cấu hình nộp muộn</label>
                          <select
                            value={cp1LateType}
                            onChange={(e) => setCp1LateType(e.target.value as any)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground"
                          >
                            <option value="none">🔒 Không cho nộp muộn</option>
                            <option value="until_deadline">📅 Đến ngày hạn cụ thể</option>
                            <option value="until_class_end">🏁 Cho nộp đến khi kết thúc lớp</option>
                          </select>
                          {cp1LateType === "until_deadline" && (
                            <input
                              type="date"
                              value={cp1LateDeadline}
                              onChange={(e) => setCp1LateDeadline(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground mt-1"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checkpoint 2 */}
                    <div className="p-3 rounded-xl bg-input/30 border border-border space-y-2">
                      <span className="text-xs font-bold text-primary block border-b border-border/40 pb-1">🚩 Checkpoint 2</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Giờ mở cổng</label>
                          <input
                            type="datetime-local"
                            value={cp2StartDate}
                            onChange={(e) => setCp2StartDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Hạn chót chính thức</label>
                          <input
                            type="datetime-local"
                            value={cp2Deadline}
                            onChange={(e) => setCp2Deadline(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                      </div>
                      {allowLateUpload && (
                        <div className="pt-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground block font-semibold">Cấu hình nộp muộn</label>
                          <select
                            value={cp2LateType}
                            onChange={(e) => setCp2LateType(e.target.value as any)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground"
                          >
                            <option value="none">🔒 Không cho nộp muộn</option>
                            <option value="until_deadline">📅 Đến ngày hạn cụ thể</option>
                            <option value="until_class_end">🏁 Cho nộp đến khi kết thúc lớp</option>
                          </select>
                          {cp2LateType === "until_deadline" && (
                            <input
                              type="date"
                              value={cp2LateDeadline}
                              onChange={(e) => setCp2LateDeadline(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground mt-1"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Final Project (SPCK) */}
                    <div className="p-3 rounded-xl bg-input/30 border border-border space-y-2">
                      <span className="text-xs font-bold text-primary block border-b border-border/40 pb-1">🏆 Sản Phẩm Cuối Khóa (SPCK)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Giờ mở cổng</label>
                          <input
                            type="datetime-local"
                            value={finalStartDate}
                            onChange={(e) => setFinalStartDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Hạn chót chính thức</label>
                          <input
                            type="datetime-local"
                            value={finalDeadline}
                            onChange={(e) => setFinalDeadline(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                      </div>
                      {allowLateUpload && (
                        <div className="pt-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground block font-semibold">Cấu hình nộp muộn</label>
                          <select
                            value={finalLateType}
                            onChange={(e) => setFinalLateType(e.target.value as any)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground"
                          >
                            <option value="none">🔒 Không cho nộp muộn</option>
                            <option value="until_deadline">📅 Đến ngày hạn cụ thể</option>
                            <option value="until_class_end">🏁 Cho nộp đến khi kết thúc lớp</option>
                          </select>
                          {finalLateType === "until_deadline" && (
                            <input
                              type="date"
                              value={finalLateDeadline}
                              onChange={(e) => setFinalLateDeadline(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground mt-1"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Presentation (Thuyết Trình) */}
                    <div className="p-3 rounded-xl bg-input/30 border border-border space-y-2">
                      <span className="text-xs font-bold text-primary block border-b border-border/40 pb-1">🎤 Thuyết Trình Đề Tài</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Giờ mở cổng</label>
                          <input
                            type="datetime-local"
                            value={presStartDate}
                            onChange={(e) => setPresStartDate(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block font-semibold">Hạn chót chính thức</label>
                          <input
                            type="datetime-local"
                            value={presDeadline}
                            onChange={(e) => setPresDeadline(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                          />
                        </div>
                      </div>
                      {allowLateUpload && (
                        <div className="pt-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground block font-semibold">Cấu hình nộp muộn</label>
                          <select
                            value={presLateType}
                            onChange={(e) => setPresLateType(e.target.value as any)}
                            className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-semibold text-foreground"
                          >
                            <option value="none">🔒 Không cho nộp muộn</option>
                            <option value="until_deadline">📅 Đến ngày hạn cụ thể</option>
                            <option value="until_class_end">🏁 Cho nộp đến khi kết thúc lớp</option>
                          </select>
                          {presLateType === "until_deadline" && (
                            <input
                              type="date"
                              value={presLateDeadline}
                              onChange={(e) => setPresLateDeadline(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground mt-1"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Detailed Session List */}
              {!isExternalClass && customSessions.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span>5. Lịch Chi Tiết Các Buổi Học ({customSessions.length} buổi - có thể bấm Sửa từng buổi)</span>
                    </label>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border/50 bg-input/20">
                    {customSessions.map((session, idx) => {
                      const isEditingThis = editingSessionIdx === idx;
                      return (
                        <div key={idx} className="p-2.5 space-y-2 text-xs hover:bg-input/40 transition-colors">
                          {isEditingThis && editingSessionObj ? (
                            <div className="p-2.5 rounded-xl bg-card border border-primary/40 space-y-2">
                              <div className="flex items-center justify-between font-bold text-primary">
                                <span>Chỉnh Sửa Buổi {editingSessionObj.sessionNum}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-muted-foreground block font-semibold">Ngày học</label>
                                  <input
                                    type="date"
                                    value={editingSessionObj.startDate || ""}
                                    onChange={(e) => setEditingSessionObj({ ...editingSessionObj, startDate: e.target.value })}
                                    className="w-full px-2 py-1 rounded-lg bg-input/60 border border-border text-xs text-foreground font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-muted-foreground block font-semibold">Thứ trong tuần</label>
                                  <select
                                    value={editingSessionObj.dayOfWeek || "Thứ 2"}
                                    onChange={(e) => setEditingSessionObj({ ...editingSessionObj, dayOfWeek: e.target.value })}
                                    className="w-full px-2 py-1 rounded-lg bg-input/60 border border-border text-xs text-foreground font-semibold"
                                  >
                                    <option value="Thứ 2">Thứ 2</option>
                                    <option value="Thứ 3">Thứ 3</option>
                                    <option value="Thứ 4">Thứ 4</option>
                                    <option value="Thứ 5">Thứ 5</option>
                                    <option value="Thứ 6">Thứ 6</option>
                                    <option value="Thứ 7">Thứ 7</option>
                                    <option value="Chủ Nhật">Chủ Nhật</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[10px] text-muted-foreground block font-semibold">Giờ bắt đầu</label>
                                  <input
                                    type="time"
                                    value={editingSessionObj.startTime || "18:00"}
                                    onChange={(e) => setEditingSessionObj({ ...editingSessionObj, startTime: e.target.value })}
                                    className="w-full px-2 py-1 rounded-lg bg-input/60 border border-border text-xs text-foreground font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-muted-foreground block font-semibold">Giờ kết thúc</label>
                                  <input
                                    type="time"
                                    value={editingSessionObj.endTime || "20:00"}
                                    onChange={(e) => setEditingSessionObj({ ...editingSessionObj, endTime: e.target.value })}
                                    className="w-full px-2 py-1 rounded-lg bg-input/60 border border-border text-xs text-foreground font-mono"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="text-[10px] text-muted-foreground block font-semibold">Giai đoạn (Tag)</label>
                                  <select
                                    value={editingSessionObj.tag || "Buổi học lý thuyết"}
                                    onChange={(e) => setEditingSessionObj({ ...editingSessionObj, tag: e.target.value })}
                                    className="w-full px-2 py-1 rounded-lg bg-input/60 border border-border text-xs text-foreground font-semibold"
                                  >
                                    <option value="Buổi học lý thuyết">Buổi học lý thuyết</option>
                                    <option value="Checkpoint 1">Checkpoint 1</option>
                                    <option value="Checkpoint 2">Checkpoint 2</option>
                                    <option value="Sản phẩm cuối khóa">Sản phẩm cuối khóa</option>
                                    <option value="Thuyết trình đề tài">Thuyết trình đề tài</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSessionIdx(null);
                                    setEditingSessionObj(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-accent text-foreground text-xs font-semibold"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...customSessions];
                                    let tagColor = "bg-primary/10 text-primary border border-primary/20";
                                    if (editingSessionObj.tag.includes("Checkpoint 1")) tagColor = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                                    else if (editingSessionObj.tag.includes("Checkpoint 2")) tagColor = "bg-purple-500/10 text-purple-500 border border-purple-500/20";
                                    else if (editingSessionObj.tag.includes("Sản phẩm")) tagColor = "bg-success/10 text-success border border-success/20";

                                    updated[idx] = { ...editingSessionObj, tagColor };
                                    setCustomSessions(updated);
                                    setEditingSessionIdx(null);
                                    setEditingSessionObj(null);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm"
                                >
                                  Cập Nhật Buổi {session.sessionNum}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-14 font-bold text-primary font-mono">Buổi {session.sessionNum}:</span>
                                <span className="font-semibold text-foreground">{session.dayOfWeek}</span>
                                <span className="text-muted-foreground font-mono">({session.startDate})</span>
                                <span className="text-muted-foreground font-mono">{session.startTime} - {session.endTime}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${session.tagColor}`}>
                                  {session.tag}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSessionIdx(idx);
                                    setEditingSessionObj({ ...session });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-input hover:bg-secondary border border-border text-foreground text-[11px] font-semibold flex items-center gap-1 transition-all"
                                  title="Chỉnh sửa ngày giờ & nhãn giai đoạn buổi học"
                                >
                                  <Pencil className="w-3 h-3 text-primary" />
                                  <span>Sửa</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSubmittingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingClassId ? "Lưu Cập Nhật" : "Tạo Lớp Học"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CATEGORY MODAL --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="font-bold text-lg text-foreground">
                {editingCatId ? "Chỉnh Sửa Khối Học" : "Thêm Khối Học Mới"}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground block">1. Tên Khối Học *</label>
                  <input
                    type="text"
                    placeholder="Nhập tên khối..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground block">2. Mã Khối *</label>
                  <input
                    type="text"
                    placeholder="Nhập mã khối..."
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground block">3. Thời Lượng (Phút) *</label>
                  <input
                    type="number"
                    value={newCatDurationMinutes}
                    onChange={(e) => setNewCatDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono font-bold text-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground block">4. Tổng Số Buổi *</label>
                  <input
                    type="number"
                    value={newCatTotalSessions}
                    onChange={(e) => setNewCatTotalSessions(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono font-bold text-primary"
                    required
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
                <h4 className="text-xs font-bold uppercase text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Cấu Hình Mốc Buổi Học (Định dạng dải mốc: 1-4, 6-8. Nhập 0 nếu không có)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 rounded-xl bg-input/20 border border-border">
                    <label className="text-xs font-bold text-foreground">📖 Buổi Học Lý Thuyết</label>
                    <input
                      type="text"
                      placeholder="Ví dụ mốc: 1-4, 6-8 (hoặc 0 nếu không có)"
                      value={newCatTheorySessions}
                      onChange={(e) => setNewCatTheorySessions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input/50 border border-border text-xs font-mono text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-input/20 border border-border">
                    <label className="text-xs font-bold text-amber-500">🎯 Buổi Checkpoint 1</label>
                    <input
                      type="text"
                      placeholder="Ví dụ mốc: 5 (hoặc 0 nếu không có)"
                      value={newCatCp1Sessions}
                      onChange={(e) => setNewCatCp1Sessions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input/50 border border-border text-xs font-mono text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-input/20 border border-border">
                    <label className="text-xs font-bold text-amber-500">🎯 Buổi Checkpoint 2</label>
                    <input
                      type="text"
                      placeholder="Ví dụ mốc: 9 (hoặc 0 nếu không có)"
                      value={newCatCp2Sessions}
                      onChange={(e) => setNewCatCp2Sessions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input/50 border border-border text-xs font-mono text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-input/20 border border-border">
                    <label className="text-xs font-bold text-primary">🏆 Sản Phẩm Cuối Khóa</label>
                    <input
                      type="text"
                      placeholder="Ví dụ mốc: 10-14 (hoặc 0 nếu không có)"
                      value={newCatFinalProjectSessions}
                      onChange={(e) => setNewCatFinalProjectSessions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input/50 border border-border text-xs font-mono text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSubmittingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingCatId ? "Lưu Thay Đổi" : "Tạo Khối Học"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: STUDENT MODAL --- */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="font-bold text-lg text-foreground">
                {editingStudentId ? "Chỉnh Sửa Học Viên" : "Thêm Học Viên Mới"}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">1. Họ và Tên Học Viên *</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên học viên..."
                  value={studentNameInput}
                  onChange={(e) => handleStudentNameInputChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>2. Mã Học Viên *</span>
                  <span className="text-[10px] text-primary font-mono font-bold">Mã Duy Nhất</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập mã học viên..."
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono font-bold text-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setStudentCodeInput(generateStudentCodeFromName(studentNameInput, visibleStudents, editingStudentId))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                  >
                    Tạo lại
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">3. Lớp Học *</label>
                <select
                  value={studentClassNameInput}
                  onChange={(e) => setStudentClassNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold"
                >
                  {!isTeacherRoleMode ? (
                    <option value="EXTERNAL">🌐 Lớp Học Ngoại Lai (Tự động xếp theo Giáo viên phụ trách)</option>
                  ) : (
                    <option value={`Lớp Không Xác Định - GV ${effectiveTeacherName}`}>
                      🌐 Lớp Học Ngoại Lai (Lớp Không Xác Định - GV {effectiveTeacherName})
                    </option>
                  )}
                  {visibleClasses.map((c) => (
                    <option key={c.id || c._id} value={c.name}>🏫 {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Requirement: If Admin adds student to External Class, show Select Teacher dropdown */}
              {!isTeacherRoleMode && (studentClassNameInput === "EXTERNAL" || studentClassNameInput === "Lớp Học Ngoại Lai" || studentClassNameInput.startsWith("Lớp Không Xác Định")) && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <label className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>4. Chọn Giáo Viên Phụ Trách Lớp Ngoại Lai *</span>
                  </label>
                  <select
                    value={studentExternalTeacherInput}
                    onChange={(e) => setStudentExternalTeacherInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">-- Chọn Giáo Viên --</option>
                    {activeTeachers.map((t) => {
                      const tName = t.displayName || t.name;
                      return (
                        <option key={t.id || t._id} value={tName}>
                          👨‍🏫 {tName} (Lớp Ngoại Lai: Lớp Không Xác Định - GV {tName})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Học viên sẽ được đưa vào <strong className="text-amber-500 font-mono">Lớp Không Xác Định - GV {studentExternalTeacherInput || "..."}</strong>. Nếu lớp chưa có, hệ thống sẽ bật thông báo xác nhận tự động khởi tạo.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">4. Dung Lượng Nộp Bài (MB) *</label>
                <input
                  type="number"
                  value={studentMaxUploadSizeInput}
                  onChange={(e) => setStudentMaxUploadSizeInput(Number(e.target.value))}
                  min={5}
                  max={500}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono font-bold text-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">5. Trạng Thái Học Viên *</label>
                <select
                  value={studentStatusInput}
                  onChange={(e) => setStudentStatusInput(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold"
                >
                  <option value="active">🟢 Đang học (Active)</option>
                  <option value="inactive">🔴 Tạm dừng (Inactive)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSubmittingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingStudentId ? "Lưu Cập Nhật" : "Tạo Học Viên"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD ACCOUNT MODAL --- */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="font-bold text-lg text-foreground">Thêm Tài Khoản Mới</h3>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Tên Đăng Nhập *</label>
                <input
                  type="text"
                  placeholder="Nhập username..."
                  value={newAccountUsername}
                  onChange={(e) => setNewAccountUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Mật Khẩu *</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={newAccountPassword}
                  onChange={(e) => setNewAccountPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Họ và Tên Hiển Thị *</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  value={newAccountDisplayName}
                  onChange={(e) => setNewAccountDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Vai Trò *</label>
                <select
                  value={newAccountRole}
                  onChange={(e) => setNewAccountRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold"
                >
                  <option value="teacher">👨‍🏫 Giáo Viên</option>
                  <option value="admin">🛡️ Admin</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSubmittingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Tạo Tài Khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT ACCOUNT MODAL --- */}
      {isEditAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="font-bold text-lg text-foreground">Chỉnh Sửa Tài Khoản</h3>
              <button onClick={() => setIsEditAccountModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Tên Đăng Nhập (chỉ đọc)</label>
                <input
                  type="text"
                  value={editingUsername}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/70 text-muted-foreground text-sm cursor-not-allowed font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Họ và Tên Hiển Thị *</label>
                <input
                  type="text"
                  value={editingDisplayName}
                  onChange={(e) => setEditingDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Mật Khẩu Mới (bỏ qua nếu không đổi)</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới..."
                  value={editingPassword}
                  onChange={(e) => setEditingPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Vai Trò *</label>
                <select
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold"
                >
                  <option value="teacher">👨‍🏫 Giáo Viên</option>
                  <option value="admin">🛡️ Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Trạng Thái *</label>
                <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold"
                >
                  <option value="active">🟢 Đang hoạt động (Active)</option>
                  <option value="pending_oauth">🟡 Đợi ủy quyền OAuth</option>
                  <option value="inactive">🔴 Ngừng hoạt động (Inactive)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
