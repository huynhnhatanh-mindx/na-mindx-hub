"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, Shuffle, CheckCircle2, Loader2, Sparkles, UserCheck } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface Slot {
  index: number;
  lockedUser: string | null;
  isVolunteer: boolean;
}

export default function PresentationArrangerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState<string[]>([]);
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
    setVolunteers([]);
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
          names.map((name: string, idx: number) => ({
            index: idx + 1,
            lockedUser: name,
            isVolunteer: false,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVolunteer = (name: string) => {
    if (volunteers.includes(name)) {
      setVolunteers(volunteers.filter((v) => v !== name));
    } else {
      setVolunteers([...volunteers, name]);
    }
  };

  const handleRandomize = () => {
    if (studentsList.length === 0) return;

    // Separate volunteers and non-volunteers
    const volList = studentsList.filter((name) => volunteers.includes(name));
    const nonVolList = studentsList.filter((name) => !volunteers.includes(name));

    // Shuffle non-volunteers
    const shuffledNonVol = [...nonVolList].sort(() => Math.random() - 0.5);

    // Combine volunteers first, then non-volunteers
    const finalOrder = [...volList, ...shuffledNonVol];

    setSlots(
      finalOrder.map((name, idx) => ({
        index: idx + 1,
        lockedUser: name,
        isVolunteer: volunteers.includes(name),
      }))
    );

    showToast(
      volList.length > 0
        ? `Đã xếp ${volList.length} học viên Tự nguyện lên đầu và bốc thăm phần còn lại!`
        : "Đã ngẫu nhiên hóa lịch thuyết trình!",
      "success"
    );
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
          Đăng ký slot Tự nguyện ưu tiên thuyết trình trước & Bốc thăm ngẫu nhiên công bằng cho từng lớp
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* Class Selection & Action */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:w-80">
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
              <span>Bốc Thăm & Sắp Xếp Thứ Tự</span>
            </button>
          )}
        </div>

        {/* Volunteer Selection Round */}
        {selectedClass && studentsList.length > 0 && (
          <div className="p-4 rounded-xl bg-input/20 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Vòng Tự Nguyện Thuyết Trình Trước ({volunteers.length} học viên)</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Tự nguyện sẽ được xếp lượt #1, #2...
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {studentsList.map((name) => {
                const isSelected = volunteers.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleVolunteer(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary/20 border-primary text-primary shadow-sm"
                        : "bg-input/50 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{name}</span>
                    {isSelected && <span className="text-[10px] bg-primary text-primary-foreground px-1 rounded">Tự nguyện</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Slots Result */}
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
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  slot.isVolunteer
                    ? "bg-primary/10 border-primary/40 shadow-sm"
                    : "bg-input/30 border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center font-mono ${
                      slot.isVolunteer
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 border border-primary/20 text-primary"
                    }`}
                  >
                    #{slot.index}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <span>{slot.lockedUser || "Chưa chọn"}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {slot.isVolunteer ? (
                        <span className="text-primary font-semibold">🌟 Tự nguyện</span>
                      ) : (
                        <span>Lượt thuyết trình #{slot.index}</span>
                      )}
                    </p>
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
