"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

type DependentType = "child" | "pet" | "elder";

type Family = {
  id: string;
  name: string;
};

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url?: string | null;
};

type CareSession = {
  id: string;
  family_id: string;
  dependent_id: string;
  title: string | null;
  caregiver_name: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
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

type Photo = {
  id: string;
  family_id: string | null;
  dependent_id: string | null;
  care_session_id: string | null;
  url?: string | null;
  caption?: string | null;
  created_at: string | null;
};

type TimelineItem = {
  id: string;
  time: string | null;
  icon: string;
  color: string;
  title: string;
  note: string;
  kind: "system" | "log" | "photo";
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const quickEvents = [
  { type: "meal", icon: "🍽️", title: "Meal", note: "Meal completed.", color: "text-emerald-600", bg: "bg-emerald-50" },
  { type: "nap", icon: "🌙", title: "Nap", note: "Rest completed.", color: "text-violet-600", bg: "bg-violet-50" },
  { type: "medicine", icon: "💊", title: "Medicine", note: "Medicine given.", color: "text-blue-600", bg: "bg-blue-50" },
  { type: "activity", icon: "🌳", title: "Activity", note: "Activity completed.", color: "text-[#22C55E]", bg: "bg-emerald-50" },
  { type: "photo", icon: "📷", title: "Moment", note: "Photo update added.", color: "text-sky-600", bg: "bg-sky-50" },
  { type: "note", icon: "📝", title: "Note", note: "Care note added.", color: "text-slate-600", bg: "bg-slate-100" },
];

const typeConfig: Record<DependentType, { label: string; icon: string; chip: string }> = {
  child: { label: "Child", icon: "👶", chip: "bg-blue-50 text-[#2563EB]" },
  pet: { label: "Pet", icon: "🐾", chip: "bg-emerald-50 text-[#22C55E]" },
  elder: { label: "Elder", icon: "🧓", chip: "bg-violet-50 text-violet-700" },
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

function formatTime(value: string | null) {
  if (!value) return "Now";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSessionTime(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLogIcon(type: string) {
  return quickEvents.find((event) => event.type === type)?.icon || "📝";
}

function getLogColor(type: string) {
  return quickEvents.find((event) => event.type === type)?.color || "text-slate-600";
}

function getLogBg(type: string) {
  return quickEvents.find((event) => event.type === type)?.bg || "bg-slate-100";
}

export default function CareLogPage() {
  const router = useRouter();

  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedQuickType, setSelectedQuickType] = useState("note");
  const [customNote, setCustomNote] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
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
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    const { data: sessionsData } = await supabase
      .from("care_sessions")
      .select("id, family_id, dependent_id, title, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const loadedSessions = (sessionsData || []) as CareSession[];
    setSessions(loadedSessions);

    const activeSession = loadedSessions.find((session) => session.status === "active") || loadedSessions[0] || null;

    if (activeSession) {
      setSelectedSessionId((current) => current || activeSession.id);
    }

    const sessionIds = loadedSessions.map((session) => session.id);

    if (sessionIds.length > 0) {
      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, family_id, dependent_id, care_session_id, type, title, note, value, created_at")
        .in("care_session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(200);

      setLogs((logsData || []) as CareLog[]);

      const { data: photosData } = await supabase
        .from("photos")
        .select("id, family_id, dependent_id, care_session_id, url, caption, created_at")
        .in("care_session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(200);

      setPhotos((photosData || []) as Photo[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!family) return;

    const channel = supabase
      .channel(`care-log-realtime-${family.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "care_logs",
          filter: `family_id=eq.${family.id}`,
        },
        (payload) => {
          const newLog = payload.new as CareLog;

          if (!newLog?.care_session_id) return;

          setLogs((currentLogs) => {
            if (currentLogs.some((log) => log.id === newLog.id)) return currentLogs;
            return [newLog, ...currentLogs];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `family_id=eq.${family.id}`,
        },
        (payload) => {
          const newPhoto = payload.new as Photo;

          if (!newPhoto?.care_session_id) return;

          setPhotos((currentPhotos) => {
            if (currentPhotos.some((photo) => photo.id === newPhoto.id)) return currentPhotos;
            return [newPhoto, ...currentPhotos];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [family]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  const selectedDependent = useMemo(() => {
    if (!selectedSession) return null;
    return dependents.find((dependent) => dependent.id === selectedSession.dependent_id) || null;
  }, [dependents, selectedSession]);

  const selectedLogs = useMemo(() => {
    if (!selectedSession) return [];
    return logs.filter((log) => log.care_session_id === selectedSession.id);
  }, [logs, selectedSession]);

  const selectedPhotos = useMemo(() => {
    if (!selectedSession) return [];
    return photos.filter((photo) => photo.care_session_id === selectedSession.id);
  }, [photos, selectedSession]);

  const upcomingToday = useMemo(() => {
    return sessions
      .filter((session) => session.status === "scheduled")
      .slice(0, 3);
  }, [sessions]);

  const initials = displayName.slice(0, 1).toUpperCase();

  const careStory = useMemo(() => {
    if (!selectedSession) return [];

    const items: TimelineItem[] = [];

    if (selectedSession.check_in_at) {
      items.push({
        id: "session-started",
        time: selectedSession.check_in_at,
        icon: "▶",
        color: "text-[#22C55E]",
        title: "Session Started",
        note: `${selectedSession.caregiver_name || "Caregiver"} checked in.`,
        kind: "system",
      });
    }

    selectedLogs.forEach((log) => {
      items.push({
        id: log.id,
        time: log.created_at,
        icon: getLogIcon(log.type),
        color: getLogColor(log.type),
        title: log.title || log.type,
        note: log.note || "Care update added.",
        kind: "log",
      });
    });

    selectedPhotos.forEach((photo) => {
      items.push({
        id: photo.id,
        time: photo.created_at,
        icon: "📷",
        color: "text-sky-600",
        title: "Moment",
        note: photo.caption || "Photo update uploaded.",
        kind: "photo",
      });
    });

    if (selectedSession.check_out_at) {
      items.push({
        id: "session-ended",
        time: selectedSession.check_out_at,
        icon: "■",
        color: "text-[#EF4444]",
        title: "Session Ended",
        note: "Care session completed.",
        kind: "system",
      });
    }

    return items.sort((a, b) => {
      const first = a.time ? new Date(a.time).getTime() : 0;
      const second = b.time ? new Date(b.time).getTime() : 0;
      return first - second;
    });
  }, [selectedLogs, selectedPhotos, selectedSession]);

  async function addQuickEvent(type: string, note?: string) {
    setMessage("");

    if (!family || !selectedSession || !selectedDependent) {
      setMessage("Select an active care session first.");
      return;
    }

    if (selectedSession.status === "completed" || selectedSession.status === "cancelled") {
      setMessage("This session is completed. Start a new session to add updates.");
      return;
    }

    const quickEvent = quickEvents.find((event) => event.type === type);
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("care_logs")
      .insert({
        family_id: family.id,
        dependent_id: selectedDependent.id,
        care_session_id: selectedSession.id,
        type,
        title: quickEvent?.title || type,
        note: note?.trim() || quickEvent?.note || "Care update added.",
        created_by: userData.user?.id || null,
      })
      .select("id, family_id, dependent_id, care_session_id, type, title, note, value, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setLogs((currentLogs) => {
      if (currentLogs.some((log) => log.id === data.id)) return currentLogs;
      return [data as CareLog, ...currentLogs];
    });

    setCustomNote("");
    setMessage(`${quickEvent?.title || "Care update"} added to the care story.`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Care Log...</p>
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
                  item.label === "Care Log"
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
                <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                <p className="max-w-[190px] truncate text-xs text-[#64748B]">{email}</p>
              </div>
              <span className="text-xs text-[#64748B]">⌄</span>
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
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
            >
              ←
            </button>

            <p className="text-sm font-semibold text-[#64748B]">Care Log</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Session updates</h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              Add meals, walks, medicine, activities, moments and notes directly into the active care session.
            </p>

            <div className="mt-7 rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Active Session</p>
                  {selectedSession && selectedDependent ? (
                    <>
                      <h2 className="mt-1 text-2xl font-black text-[#0F172A]">{selectedSession.title || "Care Session"}</h2>
                      <p className="mt-2 text-sm text-[#64748B]">
                        {selectedSession.caregiver_name || "Caregiver"} with {selectedDependent.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-1 text-2xl font-black text-[#0F172A]">No session selected</h2>
                      <p className="mt-2 text-sm text-[#64748B]">Create or select a care session to attach updates.</p>
                    </>
                  )}
                </div>

                {selectedSession && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E]">
                    {selectedSession.status}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-[#64748B]">Start</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{formatSessionTime(selectedSession?.starts_at || null)}</p>
                </div>
                <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-[#64748B]">End</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{formatSessionTime(selectedSession?.ends_at || null)}</p>
                </div>
              </div>

              <button
                onClick={() => router.push("/sessions")}
                className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-100"
              >
                Manage Sessions
              </button>
            </div>

            <div className="mt-6 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-semibold text-[#64748B]">Attach to session</p>

              <div className="mt-4 grid gap-3">
                <select
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold outline-none transition focus:border-[#2563EB]"
                >
                  {sessions.length === 0 && <option value="">No sessions</option>}
                  {sessions.map((session) => {
                    const dependent = dependents.find((item) => item.id === session.dependent_id);

                    return (
                      <option key={session.id} value={session.id}>
                        {session.title || "Care Session"} · {dependent?.name || "Dependent"} · {session.status}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={selectedQuickType}
                  onChange={(event) => setSelectedQuickType(event.target.value)}
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold outline-none transition focus:border-[#2563EB]"
                >
                  {quickEvents.map((event) => (
                    <option key={event.type} value={event.type}>
                      {event.icon} {event.title}
                    </option>
                  ))}
                </select>

                <textarea
                  value={customNote}
                  onChange={(event) => setCustomNote(event.target.value)}
                  placeholder="Example: Lunch completed, medicine given, outdoor activity..."
                  className="min-h-28 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                />

                <button
                  onClick={() => addQuickEvent(selectedQuickType, customNote)}
                  className="rounded-2xl bg-[#22C55E] p-4 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-[#22C55E]"
                >
                  Add to Care Story
                </button>

                {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22C55E]">{message}</p>}
              </div>
            </div>

            <div className="mt-6 rounded-[36px] border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#64748B]">Quick Actions</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {quickEvents.map((event) => (
                  <button
                    key={event.type}
                    onClick={() => addQuickEvent(event.type)}
                    className="rounded-[22px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-blue-100/40"
                  >
                    <div className="text-2xl">{event.icon}</div>
                    <p className="mt-3 text-sm font-black text-[#0F172A]">{event.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">Add instantly</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Upcoming Today</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Next sessions</h2>
                </div>
                <button
                  onClick={() => router.push("/schedule")}
                  className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB]"
                >
                  Schedule
                </button>
              </div>

              {upcomingToday.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">No upcoming scheduled sessions.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {upcomingToday.map((session) => {
                    const dependent = dependents.find((item) => item.id === session.dependent_id);
                    const config = dependent ? typeConfig[dependent.type] : null;

                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className="flex w-full items-center gap-4 rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:bg-white"
                      >
                        <div className="text-2xl">{config?.icon || "🫶"}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#0F172A]">{session.title || "Care Session"}</p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            {dependent?.name || "Dependent"} · {formatSessionTime(session.starts_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Today</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Today’s Care Story</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E]">
                  {careStory.length} updates
                </span>
              </div>

              {careStory.length === 0 ? (
                <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                  <div className="text-5xl">📝</div>
                  <p className="mt-4 font-semibold text-[#0F172A]">No session updates yet.</p>
                  <p className="mt-2 text-sm text-[#64748B]">Add the first care update for this session.</p>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {careStory.map((item, index) => (
                    <div key={`${item.kind}-${item.id}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.kind === "photo" ? "bg-sky-50" : getLogBg(item.kind === "log" ? selectedLogs.find((log) => log.id === item.id)?.type || "note" : "note")} text-xl ${item.color}`}>
                          {item.icon}
                        </div>
                        {index < careStory.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-blue-100" />}
                      </div>

                      <article className="flex-1 rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-4 transition hover:bg-white hover:shadow-lg hover:shadow-blue-100/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#0F172A]">{item.title}</p>
                          <p className="text-xs font-semibold text-[#64748B]">{formatTime(item.time)}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#64748B]">{item.note}</p>
                      </article>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🤖</div>
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">AI Summary</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Generate Daily Story</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Next step: CareOS will turn this care story, moments and messages into a clean Daily Story.
                  </p>
                  <button
                    onClick={() => router.push("/ai-summary")}
                    className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-100"
                  >
                    Open AI Summary
                  </button>
                </div>
              </div>
            </section>
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
                item.label === "Care Log" ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"
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
