"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";
import { PlannedActionBadge, PlannedActionIcon, plannedActionOptions, type PlannedActionType } from "@/lib/plannedActions";

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
  actual_started_at: string | null;
  actual_ended_at: string | null;
  planned_actions: PlannedAction[];
  notes: string | null;
  instructions: string | null;
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
  updated_at: string;
};

type AddedActionForm = {
  event_type: PlannedActionType;
  label: string;
  notes: string;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const sessionSelect =
  "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, actual_started_at, actual_ended_at, planned_actions, notes, instructions, created_at";

const eventSelect =
  "id, family_id, session_id, dependent_id, source, planned_action_id, event_type, label, notes, photo_url, completed_at, created_at, updated_at";

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

function formatTimeRange(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return "Time to be confirmed";

  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

function formatCompletedTime(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatClockDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => `${value}`.padStart(2, "0")).join(":");
}

function getDurationSeconds(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return 0;
  return Math.max(0, Math.floor((new Date(endValue).getTime() - new Date(startValue).getTime()) / 1000));
}

function getDefaultAddedLabel(type: PlannedActionType) {
  if (type === "custom") return "Custom care action";

  return plannedActionOptions.find((option) => option.type === type)?.label || "Care action";
}

function toPlannedActionIconType(type: CareEventType): PlannedActionType {
  if (type === "note" || type === "photo") return "custom";
  return type;
}

export default function SessionCareLogPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();

  const sessionId = params.sessionId;
  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [session, setSession] = useState<CareSession | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [careNote, setCareNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [addedForm, setAddedForm] = useState<AddedActionForm>({
    event_type: "meal",
    label: "Meal",
    notes: "",
  });

  async function loadCareLog() {
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
      setFamily(null);
      setSession(null);
      setDependent(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setFamily(familyData as Family);

    const { data: sessionData } = await supabase
      .from("care_sessions")
      .select(sessionSelect)
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
    loadedSession.planned_actions = Array.isArray(loadedSession.planned_actions)
      ? loadedSession.planned_actions
      : [];
    setSession(loadedSession);

    const { data: dependentData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("id", loadedSession.dependent_id)
      .eq("family_id", familyData.id)
      .maybeSingle();

    setDependent((dependentData || null) as Dependent | null);

    const { data: eventsData } = await supabase
      .from("care_events")
      .select(eventSelect)
      .eq("session_id", loadedSession.id)
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: true });

    setEvents((eventsData || []) as CareEvent[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCareLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!session?.actual_started_at || session.status !== "active") {
      setElapsedSeconds(getDurationSeconds(session?.actual_started_at || null, session?.actual_ended_at || null));
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(getDurationSeconds(session.actual_started_at, new Date().toISOString()));
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(interval);
  }, [session?.actual_ended_at, session?.actual_started_at, session?.status]);

  const plannedActions = Array.isArray(session?.planned_actions) ? session.planned_actions : [];
  const plannedEventsByActionId = useMemo(() => {
    return events.reduce<Record<string, CareEvent>>((acc, event) => {
      if (event.source === "planned" && event.planned_action_id) {
        acc[event.planned_action_id] = event;
      }
      return acc;
    }, {});
  }, [events]);
  const addedEvents = useMemo(() => events.filter((event) => event.source === "added"), [events]);
  const photoEvents = useMemo(() => events.filter((event) => event.event_type === "photo" && event.photo_url), [events]);
  const noteEvents = useMemo(() => events.filter((event) => event.event_type === "note"), [events]);
  const completedPlannedCount = plannedActions.filter((action) => plannedEventsByActionId[action.id]?.completed_at).length;
  const completedAddedCount = addedEvents.filter((event) => event.completed_at).length;
  const totalCareActions = plannedActions.length + addedEvents.length;
  const completedCareActions = completedPlannedCount + completedAddedCount;
  const completedEvents = useMemo(() => {
    return events
      .filter((event) => event.completed_at)
      .sort((first, second) => {
        const firstTime = first.completed_at ? new Date(first.completed_at).getTime() : 0;
        const secondTime = second.completed_at ? new Date(second.completed_at).getTime() : 0;
        return firstTime - secondTime;
      });
  }, [events]);

  const actualDurationSeconds =
    session?.status === "active"
      ? elapsedSeconds
      : getDurationSeconds(session?.actual_started_at || null, session?.actual_ended_at || null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function startCare() {
    if (!family || !session || session.status === "cancelled") return;

    const now = new Date().toISOString();
    setSavingActionId("start-care");
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_sessions")
      .update({
        status: "active",
        actual_started_at: session.actual_started_at || now,
      })
      .eq("id", session.id)
      .eq("family_id", family.id)
      .select(sessionSelect)
      .maybeSingle();

    setSavingActionId(null);

    if (error || !data) {
      setMessage(error?.message || "Care could not be started.");
      setMessageType("error");
      return;
    }

    const updatedSession = data as CareSession;
    updatedSession.planned_actions = Array.isArray(updatedSession.planned_actions)
      ? updatedSession.planned_actions
      : [];
    setSession(updatedSession);
    setMessage("Care started.");
    setMessageType("success");
  }

  async function endCare() {
    if (!family || !session || session.status !== "active") return;

    const now = new Date().toISOString();
    setSavingActionId("end-care");
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_sessions")
      .update({
        status: "completed",
        actual_ended_at: session.actual_ended_at || now,
      })
      .eq("id", session.id)
      .eq("family_id", family.id)
      .select(sessionSelect)
      .maybeSingle();

    setSavingActionId(null);

    if (error || !data) {
      setMessage(error?.message || "Care could not be ended.");
      setMessageType("error");
      return;
    }

    const updatedSession = data as CareSession;
    updatedSession.planned_actions = Array.isArray(updatedSession.planned_actions)
      ? updatedSession.planned_actions
      : [];
    setSession(updatedSession);
    setMessage("Care completed.");
    setMessageType("success");
  }

  async function completePlannedAction(action: PlannedAction) {
    if (!family || !session || !dependent) return;

    const existingEvent = plannedEventsByActionId[action.id];
    const now = new Date().toISOString();
    setSavingActionId(`planned-${action.id}`);
    setMessage(null);
    setMessageType(null);

    const result = existingEvent
      ? await supabase
          .from("care_events")
          .update({ completed_at: now, updated_at: now })
          .eq("id", existingEvent.id)
          .eq("family_id", family.id)
      : await supabase.from("care_events").insert({
          family_id: family.id,
          session_id: session.id,
          dependent_id: dependent.id,
          source: "planned",
          planned_action_id: action.id,
          event_type: action.type,
          label: action.label,
          notes: action.notes || null,
          completed_at: now,
        });

    setSavingActionId(null);

    if (result.error) {
      setMessage(result.error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${action.label} completed.`);
    setMessageType("success");
    await loadCareLog();
  }

  async function completeAddedEvent(event: CareEvent) {
    if (!family) return;

    const now = new Date().toISOString();
    setSavingActionId(`added-${event.id}`);
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase
      .from("care_events")
      .update({ completed_at: now, updated_at: now })
      .eq("id", event.id)
      .eq("family_id", family.id);

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${event.label} completed.`);
    setMessageType("success");
    await loadCareLog();
  }

  function changeAddedType(type: PlannedActionType) {
    setAddedForm({
      event_type: type,
      label: getDefaultAddedLabel(type),
      notes: "",
    });
  }

  async function addCareAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!family || !session || !dependent) return;

    const label = addedForm.label.trim();
    const notes = addedForm.notes.trim();

    if (!label) {
      setMessage("Please name the care action before adding it.");
      setMessageType("error");
      return;
    }

    setSavingActionId("add-care-action");
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase.from("care_events").insert({
      family_id: family.id,
      session_id: session.id,
      dependent_id: dependent.id,
      source: "added",
      planned_action_id: null,
      event_type: addedForm.event_type,
      label,
      notes: notes || null,
      completed_at: null,
    });

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care action could not be added.");
      setMessageType("error");
      return;
    }

    setMessage(`${label} added to Care Log.`);
    setMessageType("success");
    setAddedForm({ event_type: "meal", label: "Meal", notes: "" });
    setShowAddForm(false);
    await loadCareLog();
  }

  async function addCareNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!family || !session || !dependent) return;

    const notes = careNote.trim();
    if (!notes) {
      setMessage("Please add a care note first.");
      setMessageType("error");
      return;
    }

    setSavingActionId("add-care-note");
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase.from("care_events").insert({
      family_id: family.id,
      session_id: session.id,
      dependent_id: dependent.id,
      source: "added",
      planned_action_id: null,
      event_type: "note",
      label: "Care Note",
      notes,
      completed_at: new Date().toISOString(),
    });

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care note could not be added.");
      setMessageType("error");
      return;
    }

    setCareNote("");
    setMessage("Care note added.");
    setMessageType("success");
    await loadCareLog();
  }

  async function addCarePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!family || !session || !dependent || !photoFile) {
      setMessage("Please choose a photo first.");
      setMessageType("error");
      return;
    }

    if (!photoFile.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      setMessageType("error");
      return;
    }

    setSavingActionId("add-care-photo");
    setMessage(null);
    setMessageType(null);

    const safeName = photoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const storagePath = `${family.id}/${dependent.id}/${session.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("care-photos")
      .upload(storagePath, photoFile, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setSavingActionId(null);
      setMessage(uploadError.message || "Photo could not be uploaded.");
      setMessageType("error");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("care-photos").getPublicUrl(storagePath);
    const photoUrl = publicUrlData.publicUrl;
    const notes = photoCaption.trim();

    const { error } = await supabase.from("care_events").insert({
      family_id: family.id,
      session_id: session.id,
      dependent_id: dependent.id,
      source: "added",
      planned_action_id: null,
      event_type: "photo",
      label: "Photo",
      notes: notes || null,
      photo_url: photoUrl,
      completed_at: new Date().toISOString(),
    });

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Photo could not be added to Care Log.");
      setMessageType("error");
      return;
    }

    setPhotoFile(null);
    setPhotoCaption("");
    setMessage("Photo added.");
    setMessageType("success");
    await loadCareLog();
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

  if (!session || !dependent) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-5 py-12 text-[#0F172A]">
        <section className="mx-auto max-w-2xl rounded-[36px] border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-100/45">
          <button
            onClick={() => router.push("/schedule")}
            className="mx-auto mb-6 rounded-2xl bg-[#F8FAFC] px-5 py-3 text-sm font-black text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
          >
            Back to Schedule
          </button>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Care Log not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This care session may have been removed or is no longer available.
          </p>
        </section>
      </main>
    );
  }

  const typeStyle = typeConfig[dependent.type];
  const statusStyle = statusConfig[session.status] || statusConfig.scheduled;
  const initial = dependent.name.slice(0, 1).toUpperCase();
  const profileInitial = displayName.slice(0, 1).toUpperCase();

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
                  {profileInitial}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                <p className="max-w-[190px] truncate text-xs text-[#64748B]">{email}</p>
              </div>
              <span className="text-xs text-[#64748B]">v</span>
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

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-10">
        <button
          onClick={() => router.push("/care-log")}
          className="mb-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          Back to Care Log
        </button>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#64748B]">Care Log</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care Log</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748B]">
            Track what actually happens during this care session.
          </p>
        </div>

        <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {dependent.photo_url ? (
              <img src={dependent.photo_url} alt={dependent.name} className="h-20 w-20 rounded-[26px] object-cover" />
            ) : (
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] text-2xl font-black ${typeStyle.avatarClass}`}>
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-[#0F172A]">{dependent.name}</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClass}`}>
                      <DependentTypeIcon type={dependent.type} />
                      {typeStyle.label}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-black text-[#0F172A]">{session.title || "Care Session"}</p>
                </div>

                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                  <span className={`h-2 w-2 rounded-full ${statusStyle.dotClass}`} />
                  {statusStyle.label}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Caregiver</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{session.caregiver_name || "Caregiver"}</p>
                </div>
                <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Care time</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[30px] bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
              {session.status === "active" && session.actual_started_at ? (
                <>
                  <p className="text-4xl font-black text-[#0F172A]">{formatClockDuration(actualDurationSeconds)}</p>
                  <p className="mt-2 text-sm font-semibold text-[#64748B]">elapsed care time</p>
                </>
              ) : session.status === "completed" ? (
                <>
                  <p className="text-4xl font-black text-[#0F172A]">{formatClockDuration(actualDurationSeconds)}</p>
                  <p className="mt-2 text-sm font-semibold text-[#64748B]">actual care duration</p>
                </>
              ) : session.status === "cancelled" ? (
                <>
                  <p className="text-2xl font-black text-[#0F172A]">This care session was cancelled.</p>
                  <p className="mt-2 text-sm font-semibold text-[#64748B]">Care cannot be started for this session.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-[#0F172A]">Care has not started yet</p>
                  <p className="mt-2 text-sm font-semibold text-[#64748B]">Start care when the caregiver begins.</p>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Scheduled</p>
                <p className="mt-1 text-sm font-black text-[#0F172A]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
              </div>
              <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Actual</p>
                <p className="mt-1 text-sm font-black text-[#0F172A]">
                  {session.actual_started_at
                    ? `${formatCompletedTime(session.actual_started_at)} - ${
                        session.actual_ended_at ? formatCompletedTime(session.actual_ended_at) : "in progress"
                      }`
                    : "Not started yet"}
                </p>
              </div>
              <div className="sm:col-span-2">
                {session.status === "scheduled" && (
                  <button
                    onClick={startCare}
                    disabled={Boolean(savingActionId)}
                    className="w-full rounded-[22px] bg-[#2563EB] px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {savingActionId === "start-care" ? "Starting..." : "Start Care"}
                  </button>
                )}
                {session.status === "active" && (
                  <button
                    onClick={endCare}
                    disabled={Boolean(savingActionId)}
                    className="w-full rounded-[22px] border border-red-100 bg-red-50 px-6 py-4 text-sm font-black text-[#EF4444] transition hover:bg-[#EF4444] hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {savingActionId === "end-care" ? "Ending..." : "End Care"}
                  </button>
                )}
                {session.status === "completed" && (
                  <div className="rounded-[22px] bg-emerald-50 px-6 py-4 text-center text-sm font-black text-[#16A34A]">
                    Care completed
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`mt-5 rounded-[24px] px-5 py-4 text-sm font-semibold ${
              messageType === "error" ? "bg-red-50 text-[#EF4444]" : "bg-emerald-50 text-[#16A34A]"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Planned Care</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Today&apos;s Plan</h2>
                </div>
              </div>

              {plannedActions.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No planned care actions</p>
                  <p className="mt-2 text-sm text-[#64748B]">You can still add care actions during care.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {plannedActions.map((action) => {
                    const event = plannedEventsByActionId[action.id];
                    const completed = Boolean(event?.completed_at);
                    const saving = savingActionId === `planned-${action.id}`;

                    return (
                      <article key={action.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <PlannedActionBadge type={action.type} label={action.label} notes={action.notes} selected={completed} />
                          <div className="flex flex-wrap items-center gap-3">
                            {completed ? (
                              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-[#16A34A]">
                                Completed {formatCompletedTime(event?.completed_at || null)}
                              </span>
                            ) : (
                              <button
                                onClick={() => completePlannedAction(action)}
                                disabled={Boolean(savingActionId)}
                                className="rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                              >
                                {saving ? "Completing..." : "Complete"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">Photos</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Photos</h2>
              </div>

              <form onSubmit={addCarePhoto} className="mt-6 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Caption optional</span>
                    <input
                      value={photoCaption}
                      onChange={(event) => setPhotoCaption(event.target.value)}
                      placeholder="What is happening?"
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={Boolean(savingActionId)}
                  className="mt-5 rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {savingActionId === "add-care-photo" ? "Adding..." : "Add Photo"}
                </button>
              </form>

              {photoEvents.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {photoEvents.map((event) => (
                    <article key={event.id} className="rounded-[24px] bg-[#F8FAFC] p-3">
                      <img src={event.photo_url || ""} alt={event.notes || "Care photo"} className="h-40 w-full rounded-[20px] object-cover" />
                      {event.notes && <p className="mt-3 text-sm font-semibold text-[#0F172A]">{event.notes}</p>}
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">{formatCompletedTime(event.completed_at)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">Care Notes</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Care Notes</h2>
              </div>

              <form onSubmit={addCareNote} className="mt-6 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Add a care note...</span>
                  <textarea
                    value={careNote}
                    onChange={(event) => setCareNote(event.target.value)}
                    className="mt-2 min-h-28 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    placeholder="Add a care note..."
                  />
                </label>
                <button
                  type="submit"
                  disabled={Boolean(savingActionId)}
                  className="mt-5 rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {savingActionId === "add-care-note" ? "Adding..." : "Add Note"}
                </button>
              </form>

              {noteEvents.length > 0 && (
                <div className="mt-6 space-y-3">
                  {noteEvents.map((event) => (
                    <article key={event.id} className="rounded-[24px] bg-[#F8FAFC] p-4">
                      <p className="text-sm font-black text-[#0F172A]">{event.label}</p>
                      {event.notes && <p className="mt-2 text-sm leading-6 text-[#64748B]">{event.notes}</p>}
                      <p className="mt-2 text-xs font-semibold text-[#64748B]">{formatCompletedTime(event.completed_at)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Care Event</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Added During Care</h2>
                </div>
                <button
                  onClick={() => setShowAddForm((open) => !open)}
                  className="rounded-[20px] bg-blue-50 px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                >
                  {showAddForm ? "Cancel" : "Add Care Action"}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={addCareAction} className="mt-6 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Action type</span>
                      <select
                        value={addedForm.event_type}
                        onChange={(event) => changeAddedType(event.target.value as PlannedActionType)}
                        className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      >
                        {[...plannedActionOptions, { type: "custom" as const, label: "Custom" }].map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Label</span>
                      <input
                        value={addedForm.label}
                        onChange={(event) => setAddedForm((current) => ({ ...current, label: event.target.value }))}
                        className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        required
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Notes optional</span>
                      <textarea
                        value={addedForm.notes}
                        onChange={(event) => setAddedForm((current) => ({ ...current, notes: event.target.value }))}
                        className="mt-2 min-h-24 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        placeholder="What changed during care?"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={Boolean(savingActionId)}
                    className="mt-5 rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {savingActionId === "add-care-action" ? "Adding..." : "Add Care Action"}
                  </button>
                </form>
              )}

              {addedEvents.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No extra care actions added yet</p>
                  <p className="mt-2 text-sm text-[#64748B]">Add one if care changes during the session.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {addedEvents.map((event) => {
                    const completed = Boolean(event.completed_at);
                    const saving = savingActionId === `added-${event.id}`;

                    return (
                      <article key={event.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="inline-flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
                              <PlannedActionIcon type={toPlannedActionIconType(event.event_type)} />
                            </span>
                            <span>
                              <span className="block text-sm font-black text-[#0F172A]">{event.label}</span>
                              {event.notes && <span className="mt-1 block text-sm leading-6 text-[#64748B]">{event.notes}</span>}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {completed ? (
                              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-[#16A34A]">
                                Completed {formatCompletedTime(event.completed_at)}
                              </span>
                            ) : (
                              <button
                                onClick={() => completeAddedEvent(event)}
                                disabled={Boolean(savingActionId)}
                                className="rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                              >
                                {saving ? "Completing..." : "Complete"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <p className="text-sm font-semibold text-[#64748B]">Care Story</p>
            <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Care Summary</h2>
            <div className="mt-6 rounded-[30px] bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
              <p className="text-4xl font-black text-[#0F172A]">
                {completedCareActions} of {totalCareActions}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">care actions completed</p>
            </div>
            <div className="mt-5 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-black text-[#0F172A]">What Actually Happened</p>
              {completedEvents.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Completed care actions will appear here as care happens.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {completedEvents.map((event) => (
                    <article key={event.id} className="rounded-[22px] bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
                          <PlannedActionIcon type={toPlannedActionIconType(event.event_type)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#0F172A]">{event.label}</p>
                            <span className="text-xs font-semibold text-[#64748B]">{formatCompletedTime(event.completed_at)}</span>
                          </div>
                          {event.notes && <p className="mt-2 text-sm leading-6 text-[#64748B]">{event.notes}</p>}
                          {event.photo_url && (
                            <img src={event.photo_url} alt={event.notes || "Care photo"} className="mt-3 h-36 w-full rounded-[20px] object-cover" />
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
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
