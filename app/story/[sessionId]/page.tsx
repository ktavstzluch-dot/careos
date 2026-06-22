"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";
import { PlannedActionIcon, type PlannedActionType } from "@/lib/plannedActions";

type DependentType = "child" | "pet" | "elder";
type CareEventSource = "planned" | "added";
type CareEventType = "meal" | "nap" | "walk" | "medicine" | "activity" | "custom" | "note" | "photo";

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

type CareSession = {
  id: string;
  family_id: string;
  dependent_id: string;
  title: string | null;
  care_type: string | null;
  caregiver_name: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
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
  photo_url: string | null;
  completed_at: string | null;
  created_at: string;
};

type StoryPhoto = {
  url: string;
  created_at: string;
};

type StoryNote = {
  text: string;
  created_at: string;
};

type StoryData = {
  dependent: Dependent;
  session: CareSession;
  completedActions: CareEvent[];
  photos: StoryPhoto[];
  notes: StoryNote[];
  durationMinutes: number;
  caregiver: string;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

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

function formatDate(value: string | null) {
  if (!value) return "Date to be confirmed";

  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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

function formatEventTime(value: string | null) {
  if (!value) return "Time shared";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDurationMinutes(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return 0;

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;

  return Math.round((end - start) / 60000);
}

function formatDurationShort(totalMinutes: number) {
  if (totalMinutes <= 0) return "Time to be confirmed";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatDurationSentence(totalMinutes: number) {
  if (totalMinutes <= 0) return "Care time is still being confirmed";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return parts.join(" and ");
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function toPlannedActionIconType(type: CareEventType): PlannedActionType {
  if (type === "note" || type === "photo") return "custom";
  return type;
}

export default function CareStoryPlaceholderPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [session, setSession] = useState<CareSession | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCareStoryEntry() {
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

      const { data: sessionData } = await supabase
        .from("care_sessions")
        .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, actual_started_at, actual_ended_at, created_at")
        .eq("id", sessionId)
        .eq("family_id", familyData.id)
        .maybeSingle();

      if (!sessionData) {
        setSession(null);
        setDependent(null);
        setEvents([]);
        setLoading(false);
        return;
      }

      const loadedSession = sessionData as CareSession;
      setSession(loadedSession);

      const { data: dependentData } = await supabase
        .from("dependents")
        .select("id, family_id, type, name, photo_url")
        .eq("id", loadedSession.dependent_id)
        .eq("family_id", familyData.id)
        .maybeSingle();

      setDependent(dependentData as Dependent | null);

      const { data: eventsData } = await supabase
        .from("care_events")
        .select("id, family_id, session_id, dependent_id, source, planned_action_id, event_type, label, notes, photo_url, completed_at, created_at")
        .eq("family_id", familyData.id)
        .eq("session_id", loadedSession.id)
        .order("created_at", { ascending: true });

      setEvents((eventsData || []) as CareEvent[]);
      setLoading(false);
    }

    if (sessionId) {
      loadCareStoryEntry();
    }
  }, [router, sessionId]);

  const initials = displayName.slice(0, 1).toUpperCase();
  const dependentInitial = dependent?.name.slice(0, 1).toUpperCase() || "?";
  const typeStyle = dependent ? typeConfig[dependent.type] : null;
  const storyData = useMemo<StoryData | null>(() => {
    if (!session || !dependent) return null;

    const completedActions = events.filter(
      (event) => event.event_type !== "note" && event.event_type !== "photo" && Boolean(event.completed_at),
    );
    const photos = events
      .filter((event) => event.event_type === "photo" && Boolean(event.photo_url))
      .map((event) => ({
        url: event.photo_url || "",
        created_at: event.created_at,
      }));
    const notes = events
      .filter((event) => event.event_type === "note" && Boolean(event.notes?.trim()))
      .map((event) => ({
        text: event.notes?.trim() || "",
        created_at: event.created_at,
      }));
    const durationMinutes =
      getDurationMinutes(session.actual_started_at, session.actual_ended_at) ||
      getDurationMinutes(session.starts_at, session.ends_at);

    return {
      dependent,
      session,
      completedActions,
      photos,
      notes,
      durationMinutes,
      caregiver: session.caregiver_name || "Caregiver",
    };
  }, [dependent, events, session]);

  const completedActionsCount = storyData?.completedActions.length || 0;
  const photoCount = storyData?.photos.length || 0;
  const noteCount = storyData?.notes.length || 0;
  const durationMinutes = storyData?.durationMinutes || 0;
  const completedActions = storyData?.completedActions || [];
  const storyPhotos = storyData?.photos || [];
  const storyNotes = storyData?.notes || [];
  const storyCaregiver = storyData?.caregiver || "Caregiver";
  const durationShort = formatDurationShort(durationMinutes);
  const durationSentence = formatDurationSentence(durationMinutes);
  const completedStatus = session?.status === "completed" || Boolean(session?.actual_ended_at);

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A]">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <button onClick={() => router.push("/dashboard")} className="text-left">
            <CareOSLogo />
          </button>

          <nav className="hidden rounded-full bg-[#F8FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`rounded-full px-6 py-3 text-sm font-bold transition ${
                  item.label === "Care Log"
                    ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="relative hidden md:block">
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[24px] border border-blue-100 bg-white px-4 py-2 shadow-sm transition hover:shadow-md"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-12 w-12 rounded-[18px] object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-lg font-black text-white">
                  {initials}
                </div>
              )}
              <div className="text-left">
                <div className="font-bold text-[#0F172A]">{displayName}</div>
                <div className="text-xs text-[#64748B]">{email}</div>
              </div>
              <span className="text-xs text-[#64748B]">v</span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 rounded-[24px] border border-blue-100 bg-white p-3 shadow-xl shadow-blue-100">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/sign-in");
                  }}
                  className="w-full rounded-[18px] px-4 py-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <button
          onClick={() => router.push("/care-log")}
          className="inline-flex items-center gap-2 rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-black text-[#0F172A] shadow-sm transition hover:bg-blue-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to Care Log
        </button>

        {loading ? (
          <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#64748B]">Preparing Care Story...</p>
          </section>
        ) : !session || !dependent ? (
          <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-10 text-center shadow-sm">
            <h1 className="text-3xl font-black text-[#0F172A]">Care Story not found</h1>
            <p className="mt-3 text-sm font-semibold text-[#64748B]">
              Return to Care Log to choose another care session.
            </p>
            <button
              onClick={() => router.push("/care-log")}
              className="mt-6 rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
            >
              Back to Care Log
            </button>
          </section>
        ) : (
          <>
            <section className="mt-8 overflow-hidden rounded-[40px] border border-blue-100 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 lg:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    {dependent.photo_url ? (
                      <img src={dependent.photo_url} alt={dependent.name} className="h-28 w-28 rounded-[34px] object-cover ring-4 ring-white" />
                    ) : (
                      <div
                        className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-[34px] text-4xl font-black ring-4 ring-white ${
                          typeStyle?.avatarClass || "bg-blue-50 text-[#2563EB]"
                        }`}
                      >
                        {dependentInitial}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-4xl font-black leading-tight text-[#0F172A] lg:text-5xl">Care Story</h1>
                        {completedStatus && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-[#16A34A]">
                            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-base font-semibold text-[#64748B]">A calm summary of today&apos;s care.</p>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <span className="text-2xl font-black text-[#0F172A]">{dependent.name}</span>
                        {typeStyle && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClass}`}>
                            <DependentTypeIcon type={dependent.type} />
                            {typeStyle.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#0F172A]">{session.title || "Care Session"}</p>
                      <p className="mt-1 text-sm font-semibold text-[#64748B]">Care by {storyCaregiver}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-[24px] bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Session date</p>
                      <p className="mt-2 text-sm font-black text-[#0F172A]">{formatDate(session.starts_at)}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Care Duration</p>
                      <p className="mt-2 text-sm font-black text-[#0F172A]">{durationShort}</p>
                    </div>
                    <div className="rounded-[24px] bg-white/80 p-4 shadow-sm sm:col-span-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Scheduled care time</p>
                      <p className="mt-2 text-sm font-black text-[#0F172A]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
                      {family?.name && <p className="mt-1 text-xs font-semibold text-[#64748B]">{family.name}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-black text-[#0F172A]">{durationShort}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Care Duration</p>
              </div>
              <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-black text-[#0F172A]">{completedActionsCount}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Completed Actions</p>
              </div>
              <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-black text-[#0F172A]">{photoCount}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Photos Shared</p>
              </div>
              <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-black text-[#0F172A]">{noteCount}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Notes Added</p>
              </div>
            </section>

            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-7 shadow-sm lg:p-9">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">How did care go today?</p>
              <div className="mt-5 space-y-4 text-lg font-semibold leading-8 text-[#334155]">
                <p>
                  <span className="font-black text-[#0F172A]">{dependent.name}</span> was cared for by{" "}
                  <span className="font-black text-[#0F172A]">{storyCaregiver}</span> today.
                </p>
                <p>
                  Care lasted {durationSentence}. During the session, {completedActionsCount}{" "}
                  {pluralize(completedActionsCount, "care action was", "care actions were")} completed, {photoCount}{" "}
                  {pluralize(photoCount, "photo was", "photos were")} shared, and {noteCount}{" "}
                  {pluralize(noteCount, "care note was", "care notes were")} added.
                </p>
                {photoCount === 0 && <p>No photos were shared during this session.</p>}
                {noteCount === 0 && <p>No care notes were added during this session.</p>}
              </div>
            </section>

            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-7 shadow-sm lg:p-9">
              <h2 className="text-3xl font-black text-[#0F172A]">Completed Care</h2>
              {completedActions.length === 0 ? (
                <div className="mt-5 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No care actions were completed.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {completedActions.map((action) => (
                    <article key={action.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-violet-50 text-[#7C3AED]">
                          <PlannedActionIcon type={toPlannedActionIconType(action.event_type)} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-[#0F172A]">{action.label}</h3>
                          <p className="mt-1 text-sm font-semibold text-[#16A34A]">
                            Completed {formatEventTime(action.completed_at || action.created_at)}
                          </p>
                          {action.notes && <p className="mt-3 text-sm leading-6 text-[#64748B]">{action.notes}</p>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-7 shadow-sm lg:p-9">
              <h2 className="text-3xl font-black text-[#0F172A]">Photo Memories</h2>
              {storyPhotos.length === 0 ? (
                <div className="mt-5 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No photos were shared during this care session.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {storyPhotos.map((photo, index) => (
                    <button
                      key={`${photo.url}-${photo.created_at}`}
                      onClick={() => setPhotoViewerIndex(index)}
                      className="group relative overflow-hidden rounded-[28px] border border-blue-100 bg-[#F8FAFC] text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50"
                    >
                      <img src={photo.url} alt="Care memory" className="h-56 w-full object-cover transition group-hover:scale-105" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-[#0F172A] shadow-sm">
                        {formatEventTime(photo.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-7 shadow-sm lg:p-9">
              <h2 className="text-3xl font-black text-[#0F172A]">Care Notes</h2>
              {storyNotes.length === 0 ? (
                <div className="mt-5 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No care notes were added.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {storyNotes.map((note) => (
                    <article key={`${note.created_at}-${note.text}`} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-black text-white">
                          {storyCaregiver.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-[#0F172A]">{storyCaregiver}</p>
                            <p className="text-xs font-semibold text-[#64748B]">{formatEventTime(note.created_at)}</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#334155]">{note.text}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-[36px] border border-emerald-100 bg-emerald-50/80 p-8 text-center shadow-sm">
              <h2 className="text-3xl font-black text-[#0F172A]">Everything is under control.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#64748B]">
                This Care Story was built from the care actions, notes, and photos shared during the session.
              </p>
            </section>
          </>
        )}
      </section>

      {photoViewerIndex !== null && storyPhotos[photoViewerIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <button
              onClick={() => setPhotoViewerIndex(null)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl font-black text-[#0F172A] shadow-sm transition hover:bg-blue-50"
              aria-label="Close photo"
            >
              x
            </button>
            <img src={storyPhotos[photoViewerIndex].url} alt="Care memory" className="max-h-[80vh] w-full object-contain bg-[#0F172A]" />
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm font-bold text-[#0F172A]">Photo Memories</p>
              <p className="text-sm font-semibold text-[#64748B]">{formatEventTime(storyPhotos[photoViewerIndex].created_at)}</p>
            </div>
          </div>
        </div>
      )}

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
