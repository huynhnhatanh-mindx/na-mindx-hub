"use client";

import { useState, useEffect } from "react";
import { Users, Shuffle, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface Group {
  id: number;
  name: string;
  members: string[];
}

export default function GroupArrangerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState<number>(3);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/admin/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadClasses();
  }, []);

  const handleClassChange = async (className: string) => {
    setSelectedClass(className);
    if (!className) {
      setStudentsList([]);
      setGroups([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/students?class=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        const names = data.map((s: any) => s.name);
        setStudentsList(names);
        setGroups([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoGroup = () => {
    if (studentsList.length === 0) return;
    const shuffled = [...studentsList].sort(() => Math.random() - 0.5);
    const result: Group[] = [];
    let groupIndex = 1;

    for (let i = 0; i < shuffled.length; i += groupSize) {
      const members = shuffled.slice(i, i + groupSize);
      result.push({
        id: groupIndex,
        name: `Nhóm ${groupIndex}`,
        members,
      });
      groupIndex++;
    }

    setGroups(result);
    showToast(`Đã chia thành ${result.length} nhóm học tập!`, "success");
  };

  return (
    <div className="space-y-8 py-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Users className="w-3.5 h-3.5" /> Công Cụ Chia Nhóm
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Chia Nhóm Học Tập Tự Động
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo nhóm học viên ngẫu nhiên hoặc tùy chỉnh số lượng thành viên mỗi nhóm linh hoạt
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              Lớp Học
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Chọn Lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              Số học viên / Nhóm
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={groupSize}
              onChange={(e) => setGroupSize(parseInt(e.target.value) || 3)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAutoGroup}
            disabled={!selectedClass || studentsList.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            <span>Chia Nhóm Tự Động</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Đang tải danh sách học viên...</p>
          </div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4 border-t border-border">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-5 rounded-xl bg-input/30 border border-border hover:border-primary/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground font-mono">{group.name}</h3>
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.members.length} thành viên
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {group.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground font-medium flex items-center gap-2"
                    >
                      <span className="w-4 text-center text-primary font-bold">{idx + 1}.</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">Vui lòng chọn lớp học và bấm Chia Nhóm Tự Động</p>
          </div>
        )}
      </div>
    </div>
  );
}
