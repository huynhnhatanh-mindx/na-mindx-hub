"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Shuffle, CheckCircle2, Loader2, Sparkles, UserCheck, RefreshCw, Lock, AlertCircle, Plus, X, ListOrdered } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface SlotItem {
  index: number;
  studentName: string | null;
  isVolunteer: boolean;
  isLocked: boolean;
}

export default function PresentationArrangerPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsList, setStudentsList] = useState<string[]>([]);
  
  // slotRegistrations: mapping slotIndex -> array of candidate student names registered via comboboxes
  const [slotRegistrations, setSlotRegistrations] = useState<{ [slotIndex: number]: string[] }>({});
  
  // slots: array of final/locked slot states
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Route Guard: Only Admin and Teacher roles (not in Student mode) can access this page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const localUserStr = localStorage.getItem("user");
      const activeViewMode = localStorage.getItem("activeViewMode") || "student";

      if (!localUserStr || activeViewMode === "student") {
        router.replace("/upload");
        return;
      }
      try {
        const u = JSON.parse(localUserStr);
        if (u.role !== "admin" && u.role !== "teacher") {
          router.replace("/upload");
        }
      } catch {
        router.replace("/upload");
      }
    }
  }, [router]);

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
    setSlotRegistrations({});
    setSlots([]);

    if (!className) {
      setStudentsList([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/students?class=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        const names = data.map((s: any) => s.name);
        setStudentsList(names);

        // Check if there is saved presentation schedule in localStorage
        const storageKey = `presentation_schedule_${className}`;
        const savedStr = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (savedStr) {
          try {
            const parsed = JSON.parse(savedStr);
            if (Array.isArray(parsed.slots) && parsed.slots.length === names.length) {
              setSlots(parsed.slots);
              setSlotRegistrations(parsed.slotRegistrations || {});
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        // Default empty slots & 1 default combobox per slot
        const initialSlots = names.map((_: string, idx: number) => ({
          index: idx + 1,
          studentName: null,
          isVolunteer: false,
          isLocked: false,
        }));
        setSlots(initialSlots);

        const initialRegs: { [slotIndex: number]: string[] } = {};
        initialSlots.forEach((s: SlotItem) => {
          initialRegs[s.index] = [""];
        });
        setSlotRegistrations(initialRegs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Combobox helper: Update candidate name at candidateIndex for slotIndex
  const updateCandidateInSlot = (slotIndex: number, candidateIndex: number, newStudentName: string) => {
    setSlotRegistrations((prev) => {
      const currentList = prev[slotIndex] ? [...prev[slotIndex]] : [""];
      currentList[candidateIndex] = newStudentName;
      return { ...prev, [slotIndex]: currentList };
    });
  };

  // Combobox helper: Add a new candidate combobox to slotIndex
  const addCandidateComboboxToSlot = (slotIndex: number) => {
    setSlotRegistrations((prev) => {
      const currentList = prev[slotIndex] ? [...prev[slotIndex]] : [];
      return { ...prev, [slotIndex]: [...currentList, ""] };
    });
  };

  // Combobox helper: Remove a candidate combobox at candidateIndex from slotIndex
  const removeCandidateComboboxFromSlot = (slotIndex: number, candidateIndex: number) => {
    setSlotRegistrations((prev) => {
      const currentList = prev[slotIndex] ? [...prev[slotIndex]] : [""];
      const updated = currentList.filter((_, idx) => idx !== candidateIndex);
      return { ...prev, [slotIndex]: updated.length > 0 ? updated : [""] };
    });
  };

  // Phase 1: Lock voluntary slots with confirmation & random pick for competing candidates
  const handleLockVoluntarySlots = () => {
    if (studentsList.length < 2) {
      showToast("Cần ít nhất 2 học viên trong lớp để xếp lịch!", "error");
      return;
    }

    const confirmLock = window.confirm(
      "Bạn có chắc chắn muốn chốt các vị trí Slot đã đăng ký không?\n\n- Vị trí có 1 học viên đăng ký sẽ được chốt trực tiếp.\n- Vị trí có từ 2 học viên tranh chấp trở lên sẽ bốc thăm ngẫu nhiên 1 học viên chiến thắng."
    );
    if (!confirmLock) return;

    // Track assigned students across slots
    const newSlots = [...slots];
    const assignedStudents = new Set<string>();
    
    // First keep existing locked students
    newSlots.forEach((s) => {
      if (s.isLocked && s.studentName) {
        assignedStudents.add(s.studentName);
      }
    });

    let lockedCount = 0;
    let conflictResolvedCount = 0;

    newSlots.forEach((slot, idx) => {
      if (slot.isLocked) return;

      // Extract unique valid registered names from comboboxes excluding already assigned
      const rawCandidates = (slotRegistrations[slot.index] || []).filter(Boolean);
      const registered = Array.from(new Set(rawCandidates)).filter((name) => !assignedStudents.has(name));

      if (registered.length === 1) {
        const winner = registered[0];
        newSlots[idx] = { ...slot, studentName: winner, isVolunteer: true, isLocked: true };
        assignedStudents.add(winner);
        lockedCount++;
      } else if (registered.length >= 2) {
        // Randomly pick 1 winner out of registered candidates
        const randomIndex = Math.floor(Math.random() * registered.length);
        const winner = registered[randomIndex];
        newSlots[idx] = { ...slot, studentName: winner, isVolunteer: true, isLocked: true };
        assignedStudents.add(winner);
        lockedCount++;
        conflictResolvedCount++;
      }
    });

    setSlots(newSlots);

    // Save to localStorage
    const storageKey = `presentation_schedule_${selectedClass}`;
    localStorage.setItem(storageKey, JSON.stringify({ slots: newSlots, slotRegistrations }));

    if (conflictResolvedCount > 0) {
      showToast(`Đã chốt các slot tự nguyện và chọn ngẫu nhiên người thắng cho ${conflictResolvedCount} slot tranh chấp!`, "success");
    } else if (lockedCount > 0) {
      showToast(`Đã chốt thành công ${lockedCount} slot tự nguyện!`, "success");
    } else {
      showToast("Chưa có slot mới nào được đăng ký để chốt.", "info");
    }
  };

  // Phase 2: Fill remaining unassigned slots randomly
  const handleFillRemainingSlots = () => {
    if (studentsList.length < 2) {
      showToast("Cần ít nhất 2 học viên trong lớp để xếp lịch!", "error");
      return;
    }

    const lockedStudents = new Set(slots.filter((s) => s.isLocked && s.studentName).map((s) => s.studentName!));
    const unassignedStudents = studentsList.filter((name) => !lockedStudents.has(name));

    if (unassignedStudents.length === 0) {
      showToast("Tất cả các slot đã được lấp đầy!", "info");
      return;
    }

    // Shuffle unassigned students
    const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);

    const newSlots = [...slots];
    let fillIndex = 0;

    newSlots.forEach((slot, idx) => {
      if (!slot.isLocked && fillIndex < shuffled.length) {
        newSlots[idx] = {
          ...slot,
          studentName: shuffled[fillIndex],
          isVolunteer: false,
          isLocked: true,
        };
        fillIndex++;
      }
    });

    setSlots(newSlots);

    // Save to localStorage
    const storageKey = `presentation_schedule_${selectedClass}`;
    localStorage.setItem(storageKey, JSON.stringify({ slots: newSlots, slotRegistrations }));

    showToast(`Đã bốc thăm ngẫu nhiên lấp đầy ${fillIndex} slot còn dư!`, "success");
  };

  // Reset functionality (Làm lại từ đầu)
  const handleResetArrangement = () => {
    if (!selectedClass) return;

    const confirmReset = window.confirm(
      "Bạn có chắc chắn muốn xóa lịch thuyết trình đã xếp và làm lại từ đầu không?"
    );
    if (!confirmReset) return;

    const resetSlots = studentsList.map((_: string, idx: number) => ({
      index: idx + 1,
      studentName: null,
      isVolunteer: false,
      isLocked: false,
    }));

    setSlots(resetSlots);
    const resetRegs: { [slotIndex: number]: string[] } = {};
    resetSlots.forEach((s) => {
      resetRegs[s.index] = [""];
    });
    setSlotRegistrations(resetRegs);

    const storageKey = `presentation_schedule_${selectedClass}`;
    localStorage.removeItem(storageKey);

    showToast("Đã xóa kết quả xếp lịch và làm lại từ đầu!", "info");
  };

  // Compute stats
  const totalStudents = studentsList.length;
  const isEligible = totalStudents >= 2;
  const lockedCount = slots.filter((s) => s.isLocked).length;
  const isFullyLocked = totalStudents > 0 && lockedCount === totalStudents;

  // Check if at least 1 non-empty candidate has been selected in any unlocked slot
  const hasAnyVoluntarySelection = slots.some((s) => {
    if (s.isLocked) return false;
    const candidates = slotRegistrations[s.index] || [];
    return candidates.some((c) => Boolean(c && c.trim()));
  });

  return (
    <div className="space-y-8 py-4 pb-28">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Calendar className="w-3.5 h-3.5" /> Sắp Xếp Lịch Thuyết Trình
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Xếp Lịch Thuyết Trình Thuật Toán
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dạng Danh Sách Dễ Nhìn & Combobox Đăng Ký Slot Không Hiện Học Viên Trùng
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* Class Selection */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="w-full sm:w-80">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              Chọn Lớp Học
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
            >
              <option value="">-- Chọn Lớp Học --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  🏫 {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Eligibility Check Warning */}
        {selectedClass && !isEligible && !isLoading && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Lớp học "{selectedClass}" hiện có {totalStudents} học viên. Cần ít nhất 2 học viên để thực hiện xếp lịch thuyết trình.</span>
          </div>
        )}

        {/* List View Rendering for Slots */}
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Đang tải danh sách học viên...</p>
          </div>
        ) : selectedClass && isEligible && slots.length > 0 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-input/20 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Danh Sách Slot Thuyết Trình ({lockedCount}/{totalStudents} Đã Chốt)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                * Đăng ký Combobox sẽ tự động ẩn các học viên đã được chọn trong cùng Slot hoặc ở Slot khác.
              </p>
            </div>

            {/* List Table / Row View */}
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              {slots.map((slot) => {
                const candidates = slotRegistrations[slot.index] || [""];
                const validCandidates = candidates.filter(Boolean);
                const uniqueCandidates = Array.from(new Set(validCandidates));
                const hasConflict = uniqueCandidates.length >= 2 && !slot.isLocked;

                return (
                  <div
                    key={slot.index}
                    className={`p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      slot.isLocked
                        ? slot.isVolunteer
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : "bg-primary/5 hover:bg-primary/10"
                        : hasConflict
                        ? "bg-destructive/5 hover:bg-destructive/10"
                        : "hover:bg-input/20"
                    }`}
                  >
                    {/* Left: Slot Badge & Info */}
                    <div className="flex items-center gap-3 sm:w-48 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-sm flex items-center justify-center shadow-sm">
                        #{slot.index}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground font-mono">
                          Slot Thuyết Trình #{slot.index}
                        </h4>
                        {slot.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                            <Lock className="w-3 h-3" /> Đã chốt
                          </span>
                        ) : hasConflict ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive animate-pulse">
                            ⚠️ Tranh Slot ({uniqueCandidates.length} người)
                          </span>
                        ) : uniqueCandidates.length === 1 ? (
                          <span className="text-[10px] font-bold text-amber-500">
                            1 Đăng ký
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Chưa đăng ký</span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Selection Comboboxes or Locked Student Display */}
                    <div className="w-full sm:flex-1">
                      {slot.isLocked ? (
                        <div className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-bold text-foreground max-w-md">
                          <span className="flex items-center gap-2">
                            <span>👨‍🎓</span>
                            <span>{slot.studentName}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {slot.isVolunteer ? "🌟 Tự nguyện" : "🎲 Bốc thăm"}
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-w-lg">
                          {candidates.map((currentVal: string, cIdx: number) => {
                            // Filter students: exclude students chosen in OTHER comboboxes of THIS slot
                            const otherSelectedInThisSlot = candidates.filter((_, idx) => idx !== cIdx && Boolean(_));
                            // Also exclude students locked in other slots
                            const lockedInOtherSlots = slots.filter((s) => s.isLocked && s.studentName).map((s) => s.studentName!);

                            const availableOptions = studentsList.filter(
                              (stName) => (!otherSelectedInThisSlot.includes(stName) && !lockedInOtherSlots.includes(stName)) || stName === currentVal
                            );

                            return (
                              <div key={cIdx} className="flex items-center gap-2">
                                <select
                                  value={currentVal}
                                  onChange={(e) => updateCandidateInSlot(slot.index, cIdx, e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-input/40 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">-- Chọn Học Viên Đăng Ký --</option>
                                  {availableOptions.map((stName) => (
                                    <option key={stName} value={stName}>
                                      👨‍🎓 {stName}
                                    </option>
                                  ))}
                                </select>

                                {cIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCandidateComboboxFromSlot(slot.index, cIdx)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                                    title="Gỡ ô đăng ký này"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => addCandidateComboboxToSlot(slot.index)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold border border-primary/20 transition-all inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm người tranh slot này</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">Vui lòng chọn lớp học để sắp xếp lịch thuyết trình</p>
          </div>
        )}
      </div>

      {/* STICKY FLOATING ACTION BAR AT BOTTOM OF SCREEN */}
      {selectedClass && isEligible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-primary/30 p-3 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 max-w-[95vw] sm:max-w-none">
          <button
            type="button"
            onClick={handleLockVoluntarySlots}
            disabled={!hasAnyVoluntarySelection || isFullyLocked}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            <span>Chốt Slot Đã Đăng Ký</span>
          </button>

          <button
            type="button"
            onClick={handleFillRemainingSlots}
            disabled={isFullyLocked}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            <span>Chốt & Xếp Ngẫu Nhiên Slot Dư</span>
          </button>

          <button
            type="button"
            onClick={handleResetArrangement}
            className="px-3.5 py-2.5 rounded-xl bg-destructive/15 text-destructive font-bold text-xs border border-destructive/30 hover:bg-destructive/25 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm Lại Từ Đầu</span>
          </button>
        </div>
      )}
    </div>
  );
}
