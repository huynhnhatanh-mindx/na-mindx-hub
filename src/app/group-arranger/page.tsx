"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Shuffle, Loader2, Sparkles, UserCheck, RefreshCw, Lock, AlertCircle, CheckCircle2, UserX } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface GroupMemberSlot {
  studentName: string | null;
  isVolunteer: boolean;
  isLocked: boolean;
}

interface GroupItem {
  id: number;
  name: string;
  capacity: number;
  slots: GroupMemberSlot[];
}

export default function GroupArrangerPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsList, setStudentsList] = useState<string[]>([]);
  
  // Grouping Mode: "normal" or "absent"
  const [groupMode, setGroupMode] = useState<"normal" | "absent">("normal");
  const [absentStudents, setAbsentStudents] = useState<string[]>([]);

  // Number of groups
  const [numGroups, setNumGroups] = useState<number>(2);
  
  // groupRegistrations: key = "groupIdx-slotIdx", value = selected student name string
  const [groupRegistrations, setGroupRegistrations] = useState<{ [key: string]: string }>({});
  
  // groups: array of GroupItem
  const [groups, setGroups] = useState<GroupItem[]>([]);
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
    setGroupRegistrations({});
    setGroups([]);
    setAbsentStudents([]);

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

        // Check for saved group arrangement in localStorage
        const storageKey = `group_arrangement_${className}`;
        const savedStr = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (savedStr) {
          try {
            const parsed = JSON.parse(savedStr);
            if (Array.isArray(parsed.groups)) {
              setGroups(parsed.groups);
              setGroupRegistrations(parsed.groupRegistrations || {});
              if (parsed.numGroups) setNumGroups(parsed.numGroups);
              if (parsed.groupMode) setGroupMode(parsed.groupMode);
              if (parsed.absentStudents) setAbsentStudents(parsed.absentStudents);
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        // Initialize default 2 groups
        const defaultNumGroups = Math.min(2, Math.max(1, names.length));
        setNumGroups(defaultNumGroups);
        initGroups(names, defaultNumGroups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initGroups = (names: string[], countGroups: number, customCapacities?: number[]) => {
    const totalStudents = names.length;
    if (totalStudents === 0) {
      setGroups([]);
      return;
    }

    const nGroups = Math.max(1, countGroups);
    let remaining = totalStudents;

    const newGroups: GroupItem[] = [];
    for (let gIdx = 0; gIdx < nGroups; gIdx++) {
      let cap = 1;
      if (customCapacities && customCapacities[gIdx] !== undefined) {
        cap = Math.max(1, customCapacities[gIdx]);
      } else {
        const baseCap = Math.floor(totalStudents / nGroups);
        const extra = gIdx < totalStudents % nGroups ? 1 : 0;
        cap = Math.max(1, baseCap + extra);
      }

      newGroups.push({
        id: gIdx + 1,
        name: `Nhóm ${gIdx + 1}`,
        capacity: cap,
        slots: Array.from({ length: cap }, () => ({
          studentName: null,
          isVolunteer: false,
          isLocked: false,
        })),
      });
    }

    setGroups(newGroups);
  };

  const handleNumGroupsChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(10, newCount));
    setNumGroups(validCount);
    if (selectedClass && studentsList.length > 0) {
      setGroupRegistrations({});
      initGroups(studentsList, validCount);
    }
  };

  const handleGroupCapacityChange = (gIdx: number, newCap: number) => {
    const validCap = Math.max(1, newCap);
    const updated = groups.map((g, idx) => {
      if (idx !== gIdx) return g;
      const newSlots = Array.from({ length: validCap }, (_, sIdx) => {
        return g.slots[sIdx] || { studentName: null, isVolunteer: false, isLocked: false };
      });
      return { ...g, capacity: validCap, slots: newSlots };
    });
    setGroups(updated);
  };

  const toggleAbsentStudent = (name: string) => {
    setAbsentStudents((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Combobox helper: Update selected student for group slot "gIdx-sIdx"
  const updateCandidateInGroupSlot = (key: string, studentName: string) => {
    setGroupRegistrations((prev) => ({
      ...prev,
      [key]: studentName,
    }));
  };

  // Phase 1: Lock voluntary group slots with confirmation & random pick for competing candidates
  const handleLockVoluntarySlots = () => {
    if (studentsList.length < 3) {
      showToast("Cần ít nhất 3 học viên trong lớp để chia nhóm!", "error");
      return;
    }

    const confirmLock = window.confirm(
      "Bạn có chắc chắn muốn chốt các vị trí nhóm đã đăng ký không?\n\n- Các vị trí được chọn sẽ được chốt trực tiếp cho học viên."
    );
    if (!confirmLock) return;

    const newGroups = groups.map((g) => ({ ...g, slots: [...g.slots] }));
    const assignedStudents = new Set<string>();

    // Keep existing locked students
    newGroups.forEach((g) => {
      g.slots.forEach((s) => {
        if (s.isLocked && s.studentName) {
          assignedStudents.add(s.studentName);
        }
      });
    });

    let lockedCount = 0;

    newGroups.forEach((g, gIdx) => {
      g.slots.forEach((slot, sIdx) => {
        if (slot.isLocked) return;

        const key = `${gIdx}-${sIdx}`;
        const chosen = groupRegistrations[key];

        if (chosen && !assignedStudents.has(chosen)) {
          g.slots[sIdx] = { studentName: chosen, isVolunteer: true, isLocked: true };
          assignedStudents.add(chosen);
          lockedCount++;
        }
      });
    });

    setGroups(newGroups);

    // Save to localStorage
    const storageKey = `group_arrangement_${selectedClass}`;
    localStorage.setItem(storageKey, JSON.stringify({ groups: newGroups, groupRegistrations, numGroups, groupMode, absentStudents }));

    if (lockedCount > 0) {
      showToast(`Đã chốt thành công ${lockedCount} vị trí nhóm tự nguyện!`, "success");
    } else {
      showToast("Chưa có vị trí mới nào được đăng ký để chốt.", "info");
    }
  };

  // Phase 2: Fill remaining unassigned group slots randomly
  const handleFillRemainingSlots = () => {
    if (studentsList.length < 3) {
      showToast("Cần ít nhất 3 học viên trong lớp để chia nhóm!", "error");
      return;
    }

    const lockedStudents = new Set<string>();
    groups.forEach((g) => {
      g.slots.forEach((s) => {
        if (s.isLocked && s.studentName) {
          lockedStudents.add(s.studentName);
        }
      });
    });

    const unassignedStudents = studentsList.filter((name) => !lockedStudents.has(name));

    if (unassignedStudents.length === 0) {
      showToast("Tất cả thành viên đã được phân bổ vào các nhóm!", "info");
      return;
    }

    // Sort or group unassigned students if Absent mode is active
    let sortedUnassigned: string[] = [];
    if (groupMode === "absent") {
      const presentList = unassignedStudents.filter((n) => !absentStudents.includes(n)).sort(() => Math.random() - 0.5);
      const absentList = unassignedStudents.filter((n) => absentStudents.includes(n)).sort(() => Math.random() - 0.5);
      // Put present students first, absent students at the end
      sortedUnassigned = [...presentList, ...absentList];
    } else {
      sortedUnassigned = [...unassignedStudents].sort(() => Math.random() - 0.5);
    }

    const newGroups = groups.map((g) => ({ ...g, slots: [...g.slots] }));
    let fillIndex = 0;

    newGroups.forEach((g) => {
      g.slots.forEach((slot, sIdx) => {
        if (!slot.isLocked && fillIndex < sortedUnassigned.length) {
          g.slots[sIdx] = {
            studentName: sortedUnassigned[fillIndex],
            isVolunteer: false,
            isLocked: true,
          };
          fillIndex++;
        }
      });
    });

    setGroups(newGroups);

    // Save to localStorage
    const storageKey = `group_arrangement_${selectedClass}`;
    localStorage.setItem(storageKey, JSON.stringify({ groups: newGroups, groupRegistrations, numGroups, groupMode, absentStudents }));

    showToast(
      groupMode === "absent"
        ? `Đã bốc thăm lấp đầy ${fillIndex} vị trí (đã xếp riêng ${absentStudents.length} học viên vắng mặt)!`
        : `Đã bốc thăm ngẫu nhiên lấp đầy ${fillIndex} vị trí nhóm còn dư!`,
      "success"
    );
  };

  // Reset functionality (Làm lại từ đầu)
  const handleResetArrangement = () => {
    if (!selectedClass) return;

    const confirmReset = window.confirm(
      "Bạn có chắc chắn muốn xóa danh sách nhóm đã chia và làm lại từ đầu không?"
    );
    if (!confirmReset) return;

    setGroupRegistrations({});
    setAbsentStudents([]);
    initGroups(studentsList, numGroups);

    const storageKey = `group_arrangement_${selectedClass}`;
    localStorage.removeItem(storageKey);

    showToast("Đã xóa kết quả chia nhóm và làm lại từ đầu!", "info");
  };

  // Compute stats
  const totalStudents = studentsList.length;
  const isEligible = totalStudents >= 3;
  let lockedCount = 0;
  groups.forEach((g) => {
    g.slots.forEach((s) => {
      if (s.isLocked) lockedCount++;
    });
  });
  const isFullyLocked = totalStudents > 0 && lockedCount === totalStudents;

  // Collect all currently selected student names across all group comboboxes
  const allSelectedComboboxNames = Object.values(groupRegistrations).filter(Boolean);

  // Check if at least 1 non-empty candidate has been selected in any unlocked group slot
  const hasAnyVoluntarySelection = groups.some((g, gIdx) =>
    g.slots.some((s, sIdx) => {
      if (s.isLocked) return false;
      const key = `${gIdx}-${sIdx}`;
      const val = groupRegistrations[key];
      return Boolean(val && val.trim());
    })
  );

  return (
    <div className="space-y-8 py-4 pb-28">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Users className="w-3.5 h-3.5" /> Công Cụ Chia Nhóm Học Tập
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Chia Nhóm Học Tập Tự Động
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tùy Chỉnh Số Nhóm, Chọn Phương Thức Vắng Mặt & Combobox Cố Định Chuẩn Dung Lượng
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end font-semibold">
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              1. Chọn Lớp Học
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

          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              2. Phương Thức Chia Nhóm
            </label>
            <select
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-primary"
            >
              <option value="normal">🔵 Chia bình thường (Ngẫu nhiên công bằng)</option>
              <option value="absent">🟡 Chia theo học viên VẮNG MẶT trong buổi</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block">
              3. Số Lượng Nhóm Muốn Chia
            </label>
            <input
              type="number"
              min={1}
              max={totalStudents || 10}
              value={numGroups}
              onChange={(e) => handleNumGroupsChange(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold font-mono"
            />
          </div>
        </div>

        {/* Absent Student Checklist Panel (If Absent Mode is Selected) */}
        {selectedClass && isEligible && groupMode === "absent" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <UserX className="w-4 h-4" />
                <span>Đánh Dấu Học Viên Vắng Mặt Trong Buổi ({absentStudents.length} vắng)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Học viên vắng mặt sẽ được bốc thăm xếp riêng vào cuối danh sách nhóm
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {studentsList.map((name) => {
                const isAbsent = absentStudents.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAbsentStudent(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isAbsent
                        ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{name}</span>
                    {isAbsent && <span className="text-[10px] bg-amber-500 text-white px-1 rounded font-bold">Vắng</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Toolbar Header (Progress Only) */}
        {selectedClass && isEligible && (
          <div className="p-4 rounded-xl bg-input/20 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                Tiến độ: Chốt <strong className="text-primary">{lockedCount}/{totalStudents}</strong> vị trí ({groups.length} nhóm)
              </span>
            </div>

            <div className="hidden sm:flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLockVoluntarySlots}
                disabled={isFullyLocked}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>Chốt Slot Nhóm Đã Đăng Ký</span>
              </button>

              <button
                type="button"
                onClick={handleFillRemainingSlots}
                disabled={isFullyLocked}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                <span>Chốt & Xếp Ngẫu Nhiên Slot Dư</span>
              </button>

              <button
                type="button"
                onClick={handleResetArrangement}
                className="px-3.5 py-2.5 rounded-xl bg-destructive/15 text-destructive font-bold text-xs border border-destructive/30 hover:bg-destructive/25 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Làm Lại</span>
              </button>
            </div>
          </div>
        )}

        {/* Eligibility Check Warning */}
        {selectedClass && !isEligible && !isLoading && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Lớp học "{selectedClass}" hiện có {totalStudents} học viên. Cần ít nhất 3 học viên để thực hiện chia nhóm.</span>
          </div>
        )}

        {/* Groups & Fixed Combobox Slots Rendering */}
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Đang tải danh sách học viên...</p>
          </div>
        ) : selectedClass && isEligible && groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group, gIdx) => (
              <div
                key={group.id}
                className="p-5 rounded-2xl bg-card border border-border shadow-md hover:border-primary/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-extrabold text-foreground font-heading flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{group.name}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Sức chứa:</label>
                    <input
                      type="number"
                      min={1}
                      max={totalStudents}
                      value={group.capacity}
                      onChange={(e) => handleGroupCapacityChange(gIdx, parseInt(e.target.value) || 1)}
                      className="w-12 px-1.5 py-0.5 rounded-lg bg-input/50 border border-border text-center font-mono font-bold text-xs text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {group.slots.map((slot, sIdx) => {
                    const key = `${gIdx}-${sIdx}`;
                    const currentVal = groupRegistrations[key] || "";

                    return (
                      <div
                        key={sIdx}
                        className={`p-3 rounded-xl border transition-all space-y-2 ${
                          slot.isLocked
                            ? slot.isVolunteer
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-primary/10 border-primary/30"
                            : "bg-input/20 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-muted-foreground font-mono">
                            Vị Trí #{sIdx + 1}:
                          </span>
                          {slot.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                              <Lock className="w-3 h-3" /> Đã chốt
                            </span>
                          ) : currentVal ? (
                            <span className="text-[10px] font-bold text-amber-500">
                              Đã chọn học viên
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Trống</span>
                          )}
                        </div>

                        {slot.isLocked ? (
                          <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <span>👨‍🎓</span>
                              <span>{slot.studentName}</span>
                              {absentStudents.includes(slot.studentName!) && (
                                <span className="text-[9px] bg-amber-500 text-white px-1 rounded">Vắng</span>
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {slot.isVolunteer ? "🌟 Tự nguyện" : "🎲 Bốc thăm"}
                              </span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            </div>
                          </div>
                        ) : (
                          /* Fixed Combobox for this Group Slot */
                          <div>
                            <select
                              value={currentVal}
                              onChange={(e) => updateCandidateInGroupSlot(key, e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">-- Chọn Thành Viên --</option>
                              {studentsList.map((name) => {
                                // Exclude students locked in any group
                                const isLockedInAnyGroup = groups.some((g) =>
                                  g.slots.some((s) => s.isLocked && s.studentName === name)
                                );
                                // Exclude students chosen in OTHER group comboboxes
                                const isChosenInOtherCombobox = allSelectedComboboxNames.includes(name) && name !== currentVal;

                                if (isLockedInAnyGroup || isChosenInOtherCombobox) return null;

                                return (
                                  <option key={name} value={name}>
                                    👨‍🎓 {name} {absentStudents.includes(name) ? "(Vắng)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">Vui lòng chọn lớp học để tiến hành chia nhóm học tập</p>
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
            <span>Chốt Slot Nhóm Đã Đăng Ký</span>
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
            <span>Làm Lại</span>
          </button>
        </div>
      )}
    </div>
  );
}
