"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

type Family = {
  id: string;
  name: string;
};

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
  legacy_child_id: string | null;
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
  check_in_at: string | null;
  check_out_at: string | null;
  summary: string | null;
  created_at: string;
};

type CareLog = {
  id: string;
  family_id: string | null;
  dependent_id: string | null;
  care_session_id: string | null;
  type: string;
  title: string | null;
  note: string | null;
  value: string | null;
  created_at: string | null;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  { label: string; icon: string; chip: string; avatar: string }
> = {
  child: {
    label: "Child",
    icon: "person",
    chip: "bg-violet-50 text-violet-700",
    avatar: "bg-violet-50 text-violet-700",
  },
  pet: {
    label: "Pet",
    icon: "paw",
    chip: "bg-emerald-50 text-[#22C55E]",
    avatar: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    icon: "elder",
    chip: "bg-violet-50 text-violet-700",
    avatar: "bg-violet-50 text-violet-700",
  },
};

const statusStyles: Record<SessionStatus, string> = {
  scheduled: "bg-blue-50 text-[#2563EB]",
  active: "bg-emerald-50 text-[#22C55E]",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-[#EF4444]",
};

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

function DependentTypeIcon({ type }: { type: DependentType }) {
  if (type === "pet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <circle cx="7" cy="8" r="2.2" />
        <circle cx="12" cy="6.5" r="2.2" />
        <circle cx="17" cy="8" r="2.2" />
        <circle cx="8.5" cy="13" r="2.2" />
        <circle cx="15.5" cy="13" r="2.2" />
        <path d="M12 12.2c3.1 0 5.4 2.3 5.4 5 0 1.3-.9 2.3-2.2 2.3-.9 0-1.8-.5-3.2-.5s-2.3.5-3.2.5c-1.3 0-2.2-1-2.2-2.3 0-2.7 2.3-5 5.4-5Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5.5 20c.8-4 3.2-6.2 6.5-6.2s5.7 2.2 6.5 6.2H5.5Z" />
    </svg>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getDisplayName(email?: string) {
  if (!email) return "Tigran";
  if (email.toLowerCase().includes("tigerkazaryan")) return "Tigran";
  const first = email.split("@")[0];
  if (first.toLowerCase() === "mail") return "Tigran";
  return first.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string | null) {
  if (!value) return "Time to be set";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function getCareTypeLabel(session: CareSession) {
  return session.title?.trim() || session.care_type?.trim() || "Care session";
}

function getCareUpdateTitle(update: CareLog) {
  if (update.title?.trim()) return update.title.trim();

  const titleByType: Record<string, string> = {
    meal: "Lunch",
    medicine: "Medicine",
    mood: "Mood",
    nap: "Nap",
    sleep: "Nap",
    sleep_start: "Nap",
    sleep_end: "Nap",
    activity: "Activity",
    note: "Care update",
  };

  return titleByType[update.type] || "Care update";
}

function getCareUpdateSubtitle(update: CareLog) {
  const detail = update.value?.trim() || update.note?.trim();

  if (update.type === "meal" && detail) return `Ate ${detail}`;
  if (update.type === "medicine" && detail) return `Given ${detail}`;
  if (update.type === "mood" && detail) return detail;
  if (update.type === "sleep_start") return "Rest started";
  if (update.type === "sleep_end") return "Rest ended";
  if (detail) return detail;

  return `Today at ${formatTime(update.created_at)}`;
}

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getSessionTimeValue(session: CareSession) {
  const value = session.check_in_at || session.starts_at || session.created_at;
  return value ? new Date(value).getTime() : 0;
}

function getStoryTimeValue(session: CareSession) {
  const value = session.check_out_at || session.ends_at || session.starts_at || session.created_at;
  return value ? new Date(value).getTime() : 0;
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setEmail(userData.user.email);

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!familyData) {
      setLoading(false);
      return;
    }

    setFamily(familyData);

    const { data: dependentsData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, created_at, legacy_child_id")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    const { data: sessionsData } = await supabase
      .from("care_sessions")
      .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, summary, created_at")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(40);

    setSessions((sessionsData || []) as CareSession[]);

    const { data: careLogsData } = await supabase
      .from("care_logs")
      .select("id, family_id, dependent_id, care_session_id, type, title, note, value, created_at")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(40);

    setCareLogs((careLogsData || []) as CareLog[]);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();
  const greeting = useMemo(() => getGreeting(), []);

  const dependentById = useMemo(() => {
    return dependents.reduce<Record<string, Dependent>>((acc, dependent) => {
      acc[dependent.id] = dependent;
      return acc;
    }, {});
  }, [dependents]);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions],
  );

  const todaySessions = useMemo(() => {
    const careNow = [...sessions]
      .filter(
        (session) =>
          session.status === "active" ||
          isToday(session.starts_at) ||
          isToday(session.check_in_at) ||
          isToday(session.ends_at) ||
          isToday(session.check_out_at),
      )
      .sort((a, b) => getSessionTimeValue(a) - getSessionTimeValue(b));

    return careNow.slice(0, 4);
  }, [sessions]);

  const completedToday = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "completed" &&
          (isToday(session.check_out_at) || isToday(session.ends_at) || isToday(session.starts_at)),
      ),
    [sessions],
  );

  const todayCareLogs = useMemo(
    () => careLogs.filter((update) => isToday(update.created_at)),
    [careLogs],
  );

  const liveStatusItems = useMemo(() => {
    const activeSessionIds = new Set(activeSessions.map((session) => session.id));
    const activeItems = activeSessions.map((session) => ({
      id: `active-${session.id}`,
      title: `${session.caregiver_name?.trim() || "Caregiver"} on duty`,
      subtitle: `Started at ${formatTime(session.check_in_at || session.starts_at)}`,
      active: true,
      time: getSessionTimeValue(session),
    }));

    const updateItems = todayCareLogs.slice(0, 5).map((update) => ({
      id: `update-${update.id}`,
      title: getCareUpdateTitle(update),
      subtitle: getCareUpdateSubtitle(update),
      active: update.care_session_id ? activeSessionIds.has(update.care_session_id) : false,
      time: update.created_at ? new Date(update.created_at).getTime() : 0,
    }));

    const completedItems = completedToday.map((session) => ({
      id: `completed-${session.id}`,
      title: `${getCareTypeLabel(session)} completed`,
      subtitle: `Today at ${formatTime(session.check_out_at || session.ends_at || session.starts_at)}`,
      active: false,
      time: getStoryTimeValue(session),
    }));

    return [...activeItems, ...updateItems, ...completedItems]
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);
  }, [activeSessions, completedToday, todayCareLogs]);

  const summarySession = useMemo(() => {
    const todayOrActive = [...activeSessions, ...todaySessions, ...completedToday]
      .filter((session) => session.summary?.trim())
      .sort((a, b) => getStoryTimeValue(b) - getStoryTimeValue(a))[0];

    return todayOrActive || null;
  }, [activeSessions, completedToday, todaySessions]);

  async function handleCreateFamily() {
    setMessage("");

    if (!familyName.trim()) {
      setMessage("Please enter a family name.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const { data, error } = await supabase
      .from("families")
      .insert({ owner_id: userData.user.id, name: familyName.trim() })
      .select("id, name")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setFamily(data);
    setFamilyName("");
    setMessage("Family workspace created.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading CareOS...</p>
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
                  item.label === "Home"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                <p className="max-w-[190px] truncate text-xs text-[#64748B]">{email}</p>
              </div>
              <span className="text-xs text-[#64748B]">v</span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]"
                >
                  Profile
                  <span>-&gt;</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition hover:bg-red-50"
                >
                  Sign Out
                  <span>-&gt;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        {!family ? (
          <div className="mx-auto max-w-xl rounded-[36px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/50">
            <CareOSLogo />
            <div className="mt-7 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-[#2563EB]">
              Welcome to CareOS
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0F172A]">
              Create your trusted care workspace
            </h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              A private place for your family to feel close to every day of care.
            </p>
            <input
              type="text"
              placeholder="Example: Hakobyan Family"
              className="mt-6 w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] p-4 text-sm font-medium outline-none transition focus:border-[#2563EB] focus:bg-white"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
            />
            <button
              onClick={handleCreateFamily}
              className="mt-4 w-full rounded-2xl bg-[#2563EB] p-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
            >
              Create CareOS Workspace
            </button>
            {message && <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-medium text-[#2563EB]">{message}</p>}
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-5 md:max-w-6xl">
            <section className="px-1 pt-2 md:rounded-[36px] md:border md:border-blue-100 md:bg-gradient-to-br md:from-white md:via-blue-50 md:to-emerald-50 md:p-8 md:shadow-xl md:shadow-blue-100/45">
              <h1 className="text-2xl font-black leading-tight text-[#0F172A] md:text-4xl lg:text-5xl">
                {greeting}, {displayName} 👋
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#64748B] md:text-base">Everything is under control</p>
            </section>

            <div className="grid gap-5 md:grid-cols-[1.08fr_0.92fr] md:items-start">
            <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/45 md:min-h-[360px] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#0F172A] md:text-xl">Today&apos;s Care</h2>
                <button
                  onClick={() => router.push("/sessions")}
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2563EB] transition hover:bg-blue-100"
                >
                  See all
                </button>
              </div>

              {todaySessions.length === 0 ? (
                <div className="mt-4 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center md:mt-6 md:p-10">
                  <p className="font-semibold text-[#0F172A]">No care scheduled today.</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">Scheduled care will appear here.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3 md:mt-6 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
                  {todaySessions.map((session) => {
                    const dependent = dependentById[session.dependent_id];
                    const config = dependent ? typeConfig[dependent.type] : null;
                    const caregiverName = session.caregiver_name?.trim() || "Caregiver";

                    return (
                      <article
                        key={session.id}
                        className="flex items-center gap-3 rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-3 shadow-sm md:p-4"
                      >
                        {dependent?.photo_url ? (
                          <img
                            src={dependent.photo_url}
                            alt={dependent.name}
                            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-blue-50"
                          />
                        ) : (
                          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${config?.avatar || "bg-blue-50 text-[#2563EB]"}`}>
                            {dependent ? <DependentTypeIcon type={dependent.type} /> : <span className="text-sm font-black">C</span>}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-black text-[#0F172A]">
                              {dependent?.name || "Loved one"}
                            </h3>
                            {dependent && (
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${typeConfig[dependent.type].chip}`}>
                                <DependentTypeIcon type={dependent.type} />
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">
                            {getCareTypeLabel(session)}
                          </p>
                          <p className="mt-1 truncate text-xs font-medium text-[#64748B]">
                            {caregiverName} · {formatTime(session.starts_at || session.check_in_at)}
                          </p>
                        </div>

                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[session.status]}`}>
                          {session.status}
                        </span>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/45 md:min-h-[360px] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#0F172A] md:text-xl">Live Status</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#22C55E]">
                  All good
                </span>
              </div>

              {liveStatusItems.length === 0 ? (
                <div className="mt-4 rounded-[24px] bg-[#F8FAFC] p-5 md:mt-6">
                  <p className="font-semibold text-[#0F172A]">Nothing active right now.</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Care updates will appear here as the day unfolds.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4 md:mt-6">
                  {liveStatusItems.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[20px] md:bg-[#F8FAFC] md:p-3">
                      <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${item.active ? "bg-[#22C55E]" : "bg-emerald-200"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0F172A]">{item.title}</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            </div>

            <section className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-5 shadow-lg shadow-blue-100/40 md:p-8">
              <div className="flex items-start gap-4 md:items-center md:gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-white text-sm font-black text-[#2563EB] shadow-sm md:h-16 md:w-16 md:rounded-[24px] md:text-base">
                  AI
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-[#0F172A] md:text-xl">AI Summary</h2>
                  <p className="mt-2 text-sm leading-6 text-[#64748B] md:max-w-3xl md:text-base md:leading-7">
                    {summarySession?.summary?.trim() || "AI will summarize today’s care once updates are added."}
                  </p>
                  <button
                    onClick={() => router.push("/ai-summary")}
                    className="mt-4 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-100 transition hover:bg-[#1D4ED8] md:px-6 md:py-3"
                  >
                    Open AI Summary
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${
                item.label === "Home" ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"
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
