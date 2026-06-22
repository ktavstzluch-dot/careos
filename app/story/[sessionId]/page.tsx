"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

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

function getDurationMinutes(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return 0;

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;

  return Math.round((end - start) / 60000);
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
            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  {dependent.photo_url ? (
                    <img src={dependent.photo_url} alt={dependent.name} className="h-24 w-24 rounded-[30px] object-cover" />
                  ) : (
                    <div
                      className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] text-3xl font-black ${
                        typeStyle?.avatarClass || "bg-blue-50 text-[#2563EB]"
                      }`}
                    >
                      {dependentInitial}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-4xl font-black leading-tight text-[#0F172A]">{dependent.name}</h1>
                      {typeStyle && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClass}`}>
                          <DependentTypeIcon type={dependent.type} />
                          {typeStyle.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-bold text-[#0F172A]">{session.title || "Care Session"}</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">
                      Care by {session.caregiver_name || "Caregiver"}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] bg-[#F8FAFC] p-5 md:min-w-[260px]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Session date</p>
                  <p className="mt-2 text-sm font-black text-[#0F172A]">{formatDate(session.starts_at)}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
                  {family?.name && (
                    <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#64748B]">
                      {family.name}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-[36px] border border-blue-100 bg-white p-10 text-center shadow-sm lg:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50 text-[#2563EB]">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20" />
                  <path d="M8 12h8" />
                  <path d="M8 15h6" />
                </svg>
              </div>
              <h2 className="mt-6 text-4xl font-black text-[#0F172A]">Care Story</h2>
              <p className="mx-auto mt-3 max-w-xl text-base font-semibold text-[#64748B]">
                A beautiful summary of today&apos;s care is being prepared.
              </p>
              <p className="mt-6 rounded-[24px] bg-emerald-50 px-5 py-4 text-sm font-black text-[#16A34A]">
                Care Story is coming soon.
              </p>
            </section>

            <section className="mt-8 rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-[#0F172A]">Story Data Ready</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Completed Actions</p>
                  <p className="mt-2 text-3xl font-black text-[#0F172A]">{completedActionsCount}</p>
                </div>
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Photos</p>
                  <p className="mt-2 text-3xl font-black text-[#0F172A]">{photoCount}</p>
                </div>
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Notes</p>
                  <p className="mt-2 text-3xl font-black text-[#0F172A]">{noteCount}</p>
                </div>
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Duration</p>
                  <p className="mt-2 text-3xl font-black text-[#0F172A]">{durationMinutes} minutes</p>
                </div>
              </div>
            </section>
          </>
        )}
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
