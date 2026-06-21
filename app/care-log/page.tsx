"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";
import { PlannedActionBadge, type PlannedActionType } from "@/lib/plannedActions";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
type CareEventSource = "planned" | "added";
type CareEventType = PlannedActionType | "note" | "photo";

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
};

type PlannedAction = {
  id: string;
  type: PlannedActionType;
  label: string;
  notes?: string;
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

type CareEvent = {
  id: string;
  family_id: string;
  session_id: string;
  dependent_id: string;
  source: CareEventSource;
  planned_action_id: string | null;
  event_type: CareEventType;
  label: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const statusConfig: Record<SessionStatus, { label: string; dotClass: string; badgeClass: string }> = {
  scheduled: {
    label: "Confirmed",
    dotClass: "bg-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#16A34A]",
  },
  active: {
    label: "Active",
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

const typeConfig: Record<DependentType, { label: string; avatarClass: string; badgeClass: string }> = {
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

function getTodayStart() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDate(value: string | null) {
  if (!value) return "Date to be confirmed";

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTimeRange(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return "Time to be confirmed";

  const formatter = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

export default function CareLogOverviewPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadCareLogOverview() {
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

    setFamily(familyData as Family);

    const { data: dependentsData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    setDependents(((dependentsData || []) as Dependent[]).filter((item) => ["child", "pet", "elder"].includes(item.type)));

    const { data: sessionsData } = await supabase
      .from("care_sessions")
      .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, planned_actions, created_at")
      .eq("family_id", familyData.id)
      .gte("starts_at", getTodayStart().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    const loadedSessions = ((sessionsData || []) as CareSession[]).map((session) => ({
      ...session,
      planned_actions: Array.isArray(session.planned_actions) ? session.planned_actions : [],
    }));

    setSessions(loadedSessions);

    const sessionIds = loadedSessions.map((session) => session.id);
    if (sessionIds.length > 0) {
      const { data: eventsData } = await supabase
        .from("care_events")
        .select("id, family_id, session_id, dependent_id, source, planned_action_id, event_type, label, notes, completed_at, created_at")
        .eq("family_id", familyData.id)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      setEvents((eventsData || []) as CareEvent[]);
    } else {
      setEvents([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCareLogOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = displayName.slice(0, 1).toUpperCase();

  const dependentById = useMemo(() => {
    return dependents.reduce<Record<string, Dependent>>((acc, dependent) => {
      acc[dependent.id] = dependent;
      return acc;
    }, {});
  }, [dependents]);

  const eventsBySessionId = useMemo(() => {
    return events.reduce<Record<string, CareEvent[]>>((acc, event) => {
      acc[event.session_id] = [...(acc[event.session_id] || []), event];
      return acc;
    }, {});
  }, [events]);

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
                  <span>-&gt;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#64748B]">Care Log</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care Log</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748B]">
            Track care from your scheduled sessions.
          </p>
        </div>

        <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#64748B]">Care Event</p>
              <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Next Sessions</h2>
            </div>
            <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
              {family?.name}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#2563EB] shadow-sm">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <path d="M3.5 9.5h17" />
                  <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
              </div>
              <p className="mt-4 font-semibold text-[#0F172A]">No upcoming care sessions</p>
              <p className="mt-2 text-sm text-[#64748B]">Create a session from Schedule to start tracking care.</p>
              <button
                onClick={() => router.push("/schedule")}
                className="mt-5 rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
              >
                Go to Schedule
              </button>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {sessions.map((session) => {
                const dependent = dependentById[session.dependent_id];
                const typeStyle = dependent ? typeConfig[dependent.type] : null;
                const statusStyle = statusConfig[session.status] || statusConfig.scheduled;
                const sessionEvents = eventsBySessionId[session.id] || [];
                const plannedActions = Array.isArray(session.planned_actions) ? session.planned_actions : [];
                const addedCount = sessionEvents.filter((event) => event.source === "added").length;
                const totalCareActions = plannedActions.length + addedCount;
                const completedCareActions = sessionEvents.filter((event) => event.completed_at).length;

                return (
                  <article
                    key={session.id}
                    className="rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                      {dependent?.photo_url ? (
                        <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                      ) : (
                        <div
                          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] ${
                            typeStyle?.avatarClass || "bg-blue-50 text-[#2563EB]"
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
                              {dependent && typeStyle && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyle.badgeClass}`}>
                                  <DependentTypeIcon type={dependent.type} />
                                  {typeStyle.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{session.title || "Care Session"}</p>
                          </div>

                          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                            <span className={`h-2 w-2 rounded-full ${statusStyle.dotClass}`} />
                            {statusStyle.label}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Who is caring</p>
                            <p className="mt-1 text-sm font-black text-[#0F172A]">{session.caregiver_name || "Caregiver"}</p>
                          </div>
                          <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">When</p>
                            <p className="mt-1 text-sm font-black text-[#0F172A]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
                            <p className="mt-1 text-xs font-semibold text-[#64748B]">{formatDate(session.starts_at)}</p>
                          </div>
                          <div className="rounded-[22px] bg-emerald-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#16A34A]">Progress</p>
                            <p className="mt-1 text-sm font-black text-[#0F172A]">
                              {completedCareActions} of {totalCareActions} completed
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Planned Care</p>
                          {plannedActions.length === 0 ? (
                            <p className="mt-2 text-sm font-semibold text-[#64748B]">No planned care actions</p>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {plannedActions.map((action) => (
                                <PlannedActionBadge key={action.id} type={action.type} label={action.label} notes={action.notes} />
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => router.push(`/care-log/${session.id}`)}
                          className="mt-5 rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
                        >
                          Open Care Log
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
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
