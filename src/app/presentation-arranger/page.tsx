"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, Play, RefreshCw, Shuffle, CheckCircle2, Loader2, Award } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface Slot {
  index: number;
  volunteers: string[];
  lockedUser: string | null;
}

export default function PresentationArrangerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
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
      setSlots([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/students?class=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        const names = data.map((s: any) => s.name);
        setStudentsList(names);
        setSlots(
          names.map((_: string, idx: number) => ({
            index: idx + 1,
            volunteers: [],
            lockedUser: null,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomize = () => {
    if (studentsList.length === 0) return;
    const shuffled = [...studentsList].sort(() => Math.random() - 0.5);
    setSlots(
      shuffled.map((name, idx) => ({
        index: idx + 1,
        volunteers: [],
        lockedUser: name,
      }))
    );
    showToast("Đã ngẫu nhiên hóa lịch thuyết trình!", "success");
  };

  return (
    <div className="space-y-8 py-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Calendar className="w-3.5 h-3.5" /> Công Cụ Sắp Xếp
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Xếp Lịch Thuyết Trình Thuật Toán
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sắp xếp ngẫu nhiên hoặc đăng ký slot trình bày báo cáo bài tập lớn công bằng cho từng lớp
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:w-72">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              Chọn Lớp Học
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

          {selectedClass && (
            <button
              onClick={handleRandomize}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              <span>Ngẫu Nhiên Thứ Tự</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Đang tải danh sách học viên...</p>
          </div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
            {slots.map((slot) => (
              <div
                key={slot.index}
                className="p-4 rounded-xl bg-input/30 border border-border hover:border-primary/40 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center font-mono">
                    #{slot.index}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {slot.lockedUser || "Chưa chọn"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Thuyết trình lượt {slot.index}</p>
                  </div>
                </div>
                {slot.lockedUser && <CheckCircle2 className="w-4 h-4 text-success" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">Vui lòng chọn lớp học để xếp lịch thuyết trình</p>
          </div>
        )}
      </div>
    </div>
  );
}
