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

type Photo = {
  id: string;
  family_id: string | null;
  dependent_id: string | null;
  care_session_id: string | null;
  url: string | null;
  storage_path: string | null;
  caption: string | null;
  created_at: string | null;
  created_by: string | null;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Photos", icon: "\u25CD", href: "/photos" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  { label: string; icon: string; chip: string; avatar: string }
> = {
  child: {
    label: "Child",
    icon: "C",
    chip: "bg-blue-50 text-[#2563EB]",
    avatar: "bg-blue-50 text-[#2563EB]",
  },
  pet: {
    label: "Pet",
    icon: "P",
    chip: "bg-emerald-50 text-[#22C55E]",
    avatar: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    icon: "E",
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

function formatDateTime(value: string | null) {
  if (!value) return "Time to be set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSessionTime(session: CareSession) {
  const start = session.check_in_at || session.starts_at;
  const end = session.check_out_at || session.ends_at;

  if (!start && !end) return "Time to be set";
  if (!end) return formatDateTime(start);
  return `${formatTime(start)} - ${formatTime(end)}`;
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
  const [photos, setPhotos] = useState<Photo[]>([]);
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

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, family_id, dependent_id, care_session_id, url, storage_path, caption, created_at, created_by")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setPhotos((photosData || []) as Photo[]);
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

  const sessionById = useMemo(() => {
    return sessions.reduce<Record<string, CareSession>>((acc, session) => {
      acc[session.id] = session;
      return acc;
    }, {});
  }, [sessions]);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions],
  );

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((session) => session.status === "scheduled" && (!session.starts_at || new Date(session.starts_at).getTime() >= now))
      .sort((a, b) => getSessionTimeValue(a) - getSessionTimeValue(b));
  }, [sessions]);

  const todaySessions = useMemo(() => {
    const careNow = [...activeSessions, ...upcomingSessions]
      .filter(
        (session) =>
          session.status === "active" ||
          isToday(session.starts_at) ||
          isToday(session.check_in_at),
      )
      .sort((a, b) => getSessionTimeValue(a) - getSessionTimeValue(b));

    return careNow.slice(0, 4);
  }, [activeSessions, upcomingSessions]);

  const momentsToday = useMemo(
    () => photos.filter((photo) => isToday(photo.created_at)),
    [photos],
  );

  const completedToday = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "completed" &&
          (isToday(session.check_out_at) || isToday(session.ends_at) || isToday(session.starts_at)),
      ),
    [sessions],
  );

  const latestMoments = photos.slice(0, 4);

  const latestStorySession = useMemo(() => {
    return [...sessions]
      .filter((session) => session.summary?.trim())
      .sort((a, b) => getStoryTimeValue(b) - getStoryTimeValue(a))[0] || null;
  }, [sessions]);

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
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-[#22C55E] shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                    Everything is under control
                  </div>
                  <p className="mt-6 text-base font-semibold text-[#64748B]">{greeting}, {displayName}</p>
                  <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-tight text-[#0F172A] md:text-5xl">
                    Your family care is on track today
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
                    A calm view of care happening now, what is coming next, and the moments shared with your family.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/sessions")}
                  className="w-fit rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
                >
                  Open care sessions
                </button>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">Today&apos;s Care</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Care happening now</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E]">
                    {activeSessions.length > 0 ? "In progress" : "On track"}
                  </span>
                </div>

                {todaySessions.length === 0 ? (
                  <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-xl font-black text-[#2563EB] shadow-sm">
                      OK
                    </div>
                    <p className="mt-4 font-semibold text-[#0F172A]">No active care right now.</p>
                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      Upcoming care will appear here as soon as it is scheduled.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {todaySessions.map((session) => {
                      const dependent = dependentById[session.dependent_id];
                      const config = dependent ? typeConfig[dependent.type] : null;
                      const caregiverName = session.caregiver_name?.trim() || "Caregiver";

                      return (
                        <article
                          key={session.id}
                          className="rounded-[28px] border border-blue-100 bg-[#FFFFFF] p-4 shadow-sm transition hover:shadow-lg hover:shadow-blue-100/50"
                        >
                          <div className="flex items-start gap-4">
                            {dependent?.photo_url ? (
                              <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-blue-50" />
                            ) : (
                              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] text-lg font-black ${config?.avatar || "bg-blue-50 text-[#2563EB]"}`}>
                                {config?.icon || "C"}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-black text-[#0F172A]">
                                  {dependent?.name || "Loved one"}
                                </h3>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[session.status]}`}>
                                  {session.status}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-[#64748B]">
                                Care by {caregiverName}
                              </p>
                              <p className="mt-1 text-sm text-[#64748B]">{formatSessionTime(session)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push("/sessions")}
                            className="mt-4 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-blue-100"
                          >
                            Open session
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <p className="text-sm font-semibold text-[#64748B]">Live Status</p>
                <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Is everything okay?</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Active now", value: activeSessions.length, color: "text-[#22C55E]" },
                    { label: "Upcoming", value: upcomingSessions.length, color: "text-[#2563EB]" },
                    { label: "Moments today", value: momentsToday.length, color: "text-cyan-700" },
                    { label: "Completed", value: completedToday.length, color: "text-slate-700" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[24px] bg-[#F8FAFC] p-4 shadow-sm ring-1 ring-blue-100/70">
                      <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">Latest Moments</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Shared with the family</h2>
                  </div>
                  <button
                    onClick={() => router.push("/photos")}
                    className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-blue-50"
                  >
                    View moments
                  </button>
                </div>

                {latestMoments.length === 0 ? (
                  <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-lg font-black text-[#2563EB] shadow-sm">
                      M
                    </div>
                    <p className="mt-4 font-semibold text-[#0F172A]">No moments shared yet.</p>
                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      When caregivers share photos, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {latestMoments.map((photo) => {
                      const dependent = photo.dependent_id ? dependentById[photo.dependent_id] : null;
                      const session = photo.care_session_id ? sessionById[photo.care_session_id] : null;
                      const caregiverName = session?.caregiver_name?.trim() || "Caregiver";

                      return (
                        <article key={photo.id} className="overflow-hidden rounded-[28px] border border-blue-100 bg-[#FFFFFF] shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100/50">
                          <button
                            onClick={() => router.push("/photos")}
                            className="block w-full text-left"
                          >
                            <div className="relative h-44 overflow-hidden bg-blue-50">
                              {photo.url ? (
                                <img src={photo.url} alt={photo.caption || "Care moment"} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-blue-50 text-sm font-bold text-[#2563EB]">
                                  Moment
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F172A]/70 to-transparent p-4 pt-10">
                                <p className="text-xs font-bold text-white">
                                  Shared by {caregiverName}
                                </p>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <p className="line-clamp-2 text-base font-black leading-6 text-[#0F172A]">
                                  {photo.caption || "A care moment was shared."}
                                </p>
                                <p className="shrink-0 text-xs font-semibold text-[#64748B]">
                                  {formatTime(photo.created_at)}
                                </p>
                              </div>
                              <p className="mt-3 text-xs font-bold text-[#22C55E]">
                                Shared by {caregiverName}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-[#64748B]">
                                {dependent?.name || "Family care"}{session?.title ? ` - ${session.title}` : ""}
                              </p>
                            </div>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-lg shadow-blue-100/40">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white text-lg font-black text-[#2563EB] shadow-sm">
                    AI
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#64748B]">AI Daily Story Preview</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Today&apos;s story</h2>
                    {latestStorySession?.summary ? (
                      <>
                        <p className="mt-3 text-sm leading-7 text-[#0F172A]">
                          {latestStorySession.summary}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-[#64748B]">
                          {dependentById[latestStorySession.dependent_id]?.name || "Family care"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-[#64748B]">
                        Your daily story will appear here after care updates are added.
                      </p>
                    )}
                    <button
                      onClick={() => router.push("/sessions")}
                      className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-100"
                    >
                      Open Daily Story
                    </button>
                  </div>
                </div>
              </section>
            </div>
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
