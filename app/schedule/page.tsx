"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";
import { PlannedActionBadge, plannedActionOptions, type PlannedActionType } from "@/lib/plannedActions";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

type PlannedAction = {
  id: string;
  type: PlannedActionType;
  label: string;
  notes?: string;
};

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
};

type Family = {
  id: string;
  name: string;
};

type CareSession = {
  id: string;
  family_id: string;
  dependent_id: string;
  title: string | null;
  care_type: string | null;
  caregiver_name: string | null;
  status: SessionStatus;
  starts_at: string | null;
  ends_at: string | null;
  planned_actions: PlannedAction[];
  created_at: string;
};

type ScheduleFilter = "all" | "child" | "pet" | "elder";

type SessionForm = {
  dependent_id: string;
  title: string;
  caregiver_name: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  planned_action_types: PlannedActionType[];
  custom_instruction: string;
};

const filters: Array<{ value: ScheduleFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "child", label: "Kids" },
  { value: "pet", label: "Pets" },
  { value: "elder", label: "Elders" },
];

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  {
    label: string;
    avatarClass: string;
    badgeClass: string;
  }
> = {
  child: {
    label: "Child",
    avatarClass: "bg-violet-50 text-violet-700",
    badgeClass: "bg-violet-50 text-violet-700",
  },
  pet: {
    label: "Pet",
    avatarClass: "bg-emerald-50 text-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    avatarClass: "bg-blue-50 text-[#2563EB]",
    badgeClass: "bg-blue-50 text-[#2563EB]",
  },
};

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    dotClass: string;
    badgeClass: string;
  }
> = {
  active: {
    label: "Active",
    dotClass: "bg-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#16A34A]",
  },
  scheduled: {
    label: "Confirmed",
    dotClass: "bg-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#16A34A]",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-slate-300",
    badgeClass: "bg-slate-50 text-[#64748B]",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-slate-300",
    badgeClass: "bg-slate-50 text-[#64748B]",
  },
};

function DependentTypeIcon({ type }: { type: DependentType }) {
  if (type === "pet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.5 10.5c1.1 0 2-1.2 2-2.7s-.9-2.8-2-2.8-2 1.2-2 2.8.9 2.7 2 2.7Z" />
        <path d="M15.5 10.5c1.1 0 2-1.2 2-2.7S16.6 5 15.5 5s-2 1.2-2 2.8.9 2.7 2 2.7Z" />
        <path d="M5.8 14.5c.9 0 1.7-1 1.7-2.2S6.7 10 5.8 10s-1.7 1-1.7 2.3.8 2.2 1.7 2.2Z" />
        <path d="M18.2 14.5c.9 0 1.7-1 1.7-2.2s-.8-2.3-1.7-2.3-1.7 1-1.7 2.3.8 2.2 1.7 2.2Z" />
        <path d="M7.8 17.5c0-2.1 1.9-3.7 4.2-3.7s4.2 1.6 4.2 3.7c0 1.2-.8 2-1.9 2-.9 0-1.4-.5-2.3-.5s-1.4.5-2.3.5c-1.1 0-1.9-.8-1.9-2Z" />
      </svg>
    );
  }

  if (type === "elder") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20c1.4-3.2 4-5 7.5-5s6.1 1.8 7.5 5" />
        <path d="M17.5 14.5 19 20" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 20c1.2-3.5 3.5-5.2 7-5.2s5.8 1.7 7 5.2" />
      <path d="M8 12.5c.9 1 2.2 1.5 4 1.5s3.1-.5 4-1.5" />
    </svg>
  );
}

function CareOSLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border-[4px] border-[#2563EB] bg-white shadow-lg shadow-blue-100">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E] text-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M12 20.2 5.9 14.7C2.5 11.6 2.3 7.1 5.4 4.8 7.2 3.5 9.8 3.8 12 6c2.2-2.2 4.8-2.5 6.6-1.2 3.1 2.3 2.9 6.8-.5 9.9L12 20.2Z" />
          </svg>
        </div>
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-[#0F172A]">CareOS</div>
        <div className="hidden text-xs font-medium text-[#64748B] sm:block">
          Trusted care for kids, pets and home
        </div>
      </div>
    </div>
  );
}

function startOfLocalDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfLocalMonth(date: Date) {
  const start = startOfLocalDay(date);
  start.setDate(1);
  return start;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDate(first: Date, second: Date) {
  return getLocalDateKey(first) === getLocalDateKey(second);
}

function getMonthDays(baseDate = new Date()) {
  const today = startOfLocalDay(new Date());
  const monthStart = startOfLocalMonth(baseDate);
  const gridStart = startOfLocalDay(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      date,
      dateKey: getLocalDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: isSameLocalDate(date, today),
    };
  });
}

function getVisibleMonthRange(monthDate: Date) {
  const start = startOfLocalMonth(monthDate);
  const end = startOfLocalMonth(monthDate);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

function getDependentTypeDotClass(type: string | undefined) {
  switch (type?.toLowerCase()) {
    case "child":
      return "bg-violet-500";
    case "pet":
      return "bg-emerald-500";
    case "elder":
      return "bg-blue-500";
    default:
      return "bg-slate-300";
  }
}

function getSelectedCarePlanHeading(selectedDate: Date) {
  const today = startOfLocalDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameLocalDate(selectedDate, today)) return "Today's Care Plan";
  if (isSameLocalDate(selectedDate, tomorrow)) return "Tomorrow's Care Plan";

  return `${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(selectedDate)} Care Plan`;
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function addOneHourToDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  date.setHours(date.getHours() + 1);
  return toDateTimeLocalValue(date);
}

function isEndBeforeOrEqualStart(startValue: string, endValue: string) {
  if (!startValue || !endValue) return false;

  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  return end <= start;
}

function ensureEndAfterStart(startValue: string, endValue: string) {
  if (!startValue || !endValue) return endValue || (startValue ? addOneHourToDateTimeLocal(startValue) : "");

  return isEndBeforeOrEqualStart(startValue, endValue) ? addOneHourToDateTimeLocal(startValue) : endValue;
}

function getDefaultForm(dependentId = "", selectedDate = new Date()): SessionForm {
  const now = new Date();
  const start = new Date(selectedDate);
  if (isSameLocalDate(start, now)) {
    start.setHours(now.getHours(), now.getMinutes(), 0, 0);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }

  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  return {
    dependent_id: dependentId,
    title: "",
    caregiver_name: "",
    starts_at: toDateTimeLocalValue(start),
    ends_at: toDateTimeLocalValue(end),
    notes: "",
    planned_action_types: [],
    custom_instruction: "",
  };
}

function buildPlannedActions(actionTypes: PlannedActionType[], customInstruction: string): PlannedAction[] {
  const actions: PlannedAction[] = actionTypes
    .filter((type): type is Exclude<PlannedActionType, "custom"> => type !== "custom")
    .map((type) => {
      const option = plannedActionOptions.find((item) => item.type === type);
      return {
        id: type,
        type,
        label: option?.label || type,
      };
    });

  const trimmedCustomInstruction = customInstruction.trim();
  if (trimmedCustomInstruction) {
    actions.push({
      id: `custom-${Date.now()}`,
      type: "custom",
      label: "Custom care instruction",
      notes: trimmedCustomInstruction,
    });
  }

  return actions;
}

function formatTimeRange(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return "Time to be confirmed";

  const formatter = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

export default function SchedulePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfLocalMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [form, setForm] = useState<SessionForm>(() => getDefaultForm());
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth);

  async function loadSchedule() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const profile = getProfileFromUser(userData.user);
    setEmail(profile.email);
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl);

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!familyData) {
      router.push("/dashboard");
      return;
    }

    setFamily(familyData);

    const { data: dependentsData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type),
    );

    setDependents(loadedDependents);
    setForm((current) => ({
      ...current,
      dependent_id: current.dependent_id || loadedDependents[0]?.id || "",
    }));

    const { start, end } = getVisibleMonthRange(visibleMonth);
    const { data: sessionsData } = await supabase
      .from("care_sessions")
      .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, planned_actions, created_at")
      .eq("family_id", familyData.id)
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at", { ascending: true });

    setSessions((sessionsData || []) as CareSession[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMonth]);

  const initials = displayName.slice(0, 1).toUpperCase();

  const dependentById = useMemo(() => {
    return dependents.reduce<Record<string, Dependent>>((acc, dependent) => {
      acc[dependent.id] = dependent;
      return acc;
    }, {});
  }, [dependents]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => {
      const startsAt = session.starts_at ? new Date(session.starts_at) : null;
      const matchesDate = startsAt ? isSameLocalDate(startsAt, selectedDate) : false;
      const matchesFilter = activeFilter === "all" || dependentById[session.dependent_id]?.type === activeFilter;
      return matchesDate && matchesFilter;
    });
  }, [activeFilter, dependentById, selectedDate, sessions]);

  const sessionTypesByDate = useMemo(() => {
    return sessions.reduce<Record<string, DependentType[]>>((acc, session) => {
      if (!session.starts_at) return acc;
      const dependentType = dependentById[session.dependent_id]?.type;
      if (!dependentType) return acc;

      const key = getLocalDateKey(new Date(session.starts_at));
      const current = acc[key] || [];
      acc[key] = current.includes(dependentType) ? current : [...current, dependentType];
      return acc;
    }, {});
  }, [dependentById, sessions]);

  const selectedCarePlanHeading = getSelectedCarePlanHeading(selectedDate);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  function updateForm(field: keyof SessionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateStartDateTime(value: string) {
    setForm((current) => ({
      ...current,
      starts_at: value,
      ends_at: ensureEndAfterStart(value, current.ends_at),
    }));
  }

  function updateEndDateTime(value: string) {
    if (isEndBeforeOrEqualStart(form.starts_at, value)) {
      setForm((current) => ({
        ...current,
        ends_at: addOneHourToDateTimeLocal(current.starts_at),
      }));
      setMessage("End time must be after start time.");
      setMessageType("error");
      return;
    }

    setForm((current) => ({ ...current, ends_at: value }));
  }

  function togglePlannedAction(type: PlannedActionType) {
    setForm((current) => {
      const isSelected = current.planned_action_types.includes(type);
      return {
        ...current,
        planned_action_types: isSelected
          ? current.planned_action_types.filter((item) => item !== type)
          : [...current.planned_action_types, type],
      };
    });
  }

  function openCreateForm() {
    setForm(getDefaultForm(form.dependent_id || dependents[0]?.id || "", selectedDate));
    setMessage(null);
    setMessageType(null);
    setShowDiscardConfirm(false);
    setShowCreateForm(true);
  }

  function resetCreateForm() {
    setForm(getDefaultForm(dependents[0]?.id || "", selectedDate));
    setMessage(null);
    setMessageType(null);
    setShowDiscardConfirm(false);
    setShowCreateForm(false);
  }

  function requestCancelCreateForm() {
    setShowDiscardConfirm(true);
  }

  function changeMonth(direction: -1 | 1) {
    const nextMonth = startOfLocalMonth(visibleMonth);
    nextMonth.setMonth(nextMonth.getMonth() + direction);
    setVisibleMonth(nextMonth);
    setSelectedDate(startOfLocalDay(nextMonth));
    setShowCreateForm(false);
    setShowDiscardConfirm(false);
    setMessage(null);
    setMessageType(null);
  }

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const caregiverName = form.caregiver_name.trim();
    const notes = form.notes.trim();
    const customInstruction = form.custom_instruction.trim();
    const startsAt = form.starts_at ? new Date(form.starts_at) : null;
    const endsAt = form.ends_at ? new Date(form.ends_at) : null;

    if (!family || !form.dependent_id || !title || !caregiverName || !startsAt || !endsAt) {
      setMessage("Please complete the session details before saving.");
      setMessageType("error");
      return;
    }

    if (endsAt <= startsAt) {
      setMessage("End time must be after start time.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase.from("care_sessions").insert({
      family_id: family.id,
      dependent_id: form.dependent_id,
      title,
      care_type: title,
      caregiver_name: caregiverName,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "scheduled",
      notes: notes || null,
      instructions: notes || null,
      planned_actions: buildPlannedActions(form.planned_action_types, customInstruction),
    });

    setSaving(false);

    if (error) {
      setMessage(error.message || "Session could not be created.");
      setMessageType("error");
      return;
    }

    setMessage("Session created. Care Plan is updated.");
    setMessageType("success");
    setForm(getDefaultForm(form.dependent_id, selectedDate));
    setShowDiscardConfirm(false);
    setShowCreateForm(false);
    await loadSchedule();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Schedule...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-28 text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-left">
            <CareOSLogo />
          </button>

          <div className="hidden items-center gap-2 rounded-full bg-[#F8FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  item.label === "Schedule"
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "text-[#64748B] hover:bg-white hover:text-[#2563EB]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[22px] bg-white px-3 py-2 pr-4 shadow-sm ring-1 ring-blue-100"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                  {initials}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
              </div>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition hover:bg-red-50"
                >
                  Sign Out
                  <span>↗</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
                >
                  ←
                </button>
                <p className="text-sm font-semibold text-[#64748B]">Schedule</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care Plan</h1>
              </div>

              <button
                onClick={openCreateForm}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-2xl font-bold text-white shadow-lg shadow-blue-200"
                aria-label="Create Session"
              >
                +
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeFilter === filter.value
                      ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                      : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">This Month</p>
                  <h2 className="mt-1 text-lg font-black text-[#0F172A]">{monthTitle}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#64748B] shadow-sm ring-1 ring-blue-100 transition hover:text-[#2563EB]"
                    aria-label="Previous month"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#64748B] shadow-sm ring-1 ring-blue-100 transition hover:text-[#2563EB]"
                    aria-label="Next month"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {monthDays.map((item) => {
                  const selected = isSameLocalDate(item.date, selectedDate);
                  const sessionTypes = sessionTypesByDate[item.dateKey] || [];

                  return (
                    <button
                      key={item.dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(startOfLocalDay(item.date));
                        if (!item.isCurrentMonth) {
                          setVisibleMonth(startOfLocalMonth(item.date));
                        }
                      }}
                      className={`min-h-[48px] rounded-2xl px-1.5 py-2 text-center transition ${
                        selected
                          ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                          : item.isToday
                            ? "bg-white text-[#2563EB] ring-1 ring-blue-200"
                            : item.isCurrentMonth
                              ? "bg-white text-[#64748B] hover:bg-blue-50 hover:text-[#2563EB]"
                              : "bg-white/60 text-slate-300 hover:bg-blue-50 hover:text-[#2563EB]"
                      }`}
                    >
                      <div className="text-sm font-black leading-none">{item.dayNumber}</div>
                      <div className="mt-1.5 flex h-1.5 justify-center gap-1">
                        {sessionTypes.map((type) => (
                          <span key={type} className={`h-1.5 w-1.5 rounded-full ${getDependentTypeDotClass(type)}`} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">
                  {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(selectedDate)}
                </p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">{selectedCarePlanHeading}</h2>
              </div>
              <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                {family?.name}
              </span>
            </div>

            {message && (
              <div
                className={`mt-5 rounded-[22px] px-4 py-3 text-sm font-semibold ${
                  messageType === "error" ? "bg-red-50 text-[#EF4444]" : "bg-emerald-50 text-[#16A34A]"
                }`}
              >
                {message}
              </div>
            )}

            {showCreateForm && (
              <form onSubmit={handleCreateSession} className="mt-7 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-[#0F172A]">Create Session</h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Dependent</span>
                    <select
                      value={form.dependent_id}
                      onChange={(event) => updateForm("dependent_id", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    >
                      <option value="">Choose dependent</option>
                      {dependents.map((dependent) => (
                        <option key={dependent.id} value={dependent.id}>
                          {dependent.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Session title</span>
                    <input
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      placeholder="Nanny Visit"
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Caregiver name</span>
                    <input
                      value={form.caregiver_name}
                      onChange={(event) => updateForm("caregiver_name", event.target.value)}
                      placeholder="Anna Johnson"
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Start date/time</span>
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(event) => updateStartDateTime(event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">End date/time</span>
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      min={form.starts_at || undefined}
                      onChange={(event) => updateEndDateTime(event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Planned Care</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {plannedActionOptions.map((option) => {
                        const selected = form.planned_action_types.includes(option.type);

                        return (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => togglePlannedAction(option.type)}
                            className="text-left"
                          >
                            <PlannedActionBadge type={option.type} label={option.label} selected={selected} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="mt-3 inline-flex">
                      <PlannedActionBadge type="custom" label="Custom care instruction" selected={Boolean(form.custom_instruction.trim())} />
                    </span>
                    <input
                      value={form.custom_instruction}
                      onChange={(event) => updateForm("custom_instruction", event.target.value)}
                      placeholder="Example: Practice reading before bedtime"
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Notes optional</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Anything the caregiver should know?"
                      className="mt-2 min-h-24 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={requestCancelCreateForm}
                    disabled={saving}
                    className="rounded-[22px] border border-slate-200 bg-white px-6 py-3 text-sm font-black text-[#64748B] transition hover:border-blue-100 hover:bg-blue-50 hover:text-[#2563EB] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {saving ? "Creating..." : "Create Session"}
                  </button>
                </div>
              </form>
            )}

            {showDiscardConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/30 px-5 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl shadow-slate-900/15">
                  <h3 className="text-2xl font-black text-[#0F172A]">Discard session?</h3>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Your session has not been created yet.
                    <br />
                    Are you sure you want to leave this form?
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="rounded-[20px] border border-blue-100 bg-white px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-blue-50"
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="rounded-[20px] border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-[#EF4444] transition hover:bg-red-100"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {visibleSessions.length === 0 ? (
              <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#2563EB] shadow-sm">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <path d="M3.5 9.5h17" />
                    <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-[#0F172A]">No care planned for this day</p>
                <p className="mt-2 text-sm text-[#64748B]">Create a session to start building your Care Story.</p>
                <button
                  onClick={openCreateForm}
                  className="mt-5 rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
                >
                  Create Session
                </button>
              </div>
            ) : (
              <div className="mt-7 space-y-4">
                {visibleSessions.map((session) => {
                  const dependent = dependentById[session.dependent_id];
                  const config = dependent ? typeConfig[dependent.type] : null;
                  const status = statusConfig[session.status] || statusConfig.scheduled;

                  return (
                    <article
                      key={session.id}
                      className="rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        {dependent?.photo_url ? (
                          <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                        ) : (
                          <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] ${
                              config?.avatarClass || "bg-blue-50 text-[#2563EB]"
                            }`}
                          >
                            {dependent ? <DependentTypeIcon type={dependent.type} /> : "?"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-[#0F172A]">{dependent?.name || "Dependent"}</h3>
                                {dependent && config && (
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.badgeClass}`}>
                                    <DependentTypeIcon type={dependent.type} />
                                    {config.label}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">{session.title || "Care Session"}</p>
                            </div>

                            <div
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                              {status.label}
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Who is caring</p>
                              <p className="mt-1 text-sm font-black text-[#0F172A]">{session.caregiver_name || "Caregiver"}</p>
                            </div>
                            <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">When</p>
                              <p className="mt-1 text-sm font-black text-[#0F172A]">
                                {formatTimeRange(session.starts_at, session.ends_at)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/sessions/${session.id}`)}
                            className="mt-5 rounded-[20px] bg-blue-50 px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                          >
                            View Plan
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${
                item.label === "Schedule" ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"
              }`}
            >
              <div className="text-lg leading-5">{item.icon}</div>
              <div className="mt-1">{item.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
