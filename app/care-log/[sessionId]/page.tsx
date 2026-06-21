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

type CareWorkspaceTab = "plan" | "added" | "photos" | "notes" | "happened";

type CareHappenedItem = {
  id: string;
  time: string | null;
  label: string;
  type: CareEventType | "start" | "end";
};

const careWorkspaceTabs: { id: CareWorkspaceTab; label: string }[] = [
  { id: "plan", label: "Today's Plan" },
  { id: "added", label: "Added During Care" },
  { id: "photos", label: "Photos" },
  { id: "notes", label: "Care Notes" },
  { id: "happened", label: "What Happened" },
];

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

function formatPhotoTime(event: CareEvent) {
  return formatCompletedTime(event.completed_at || event.created_at);
}

function getEventTime(event: CareEvent) {
  return event.completed_at || event.created_at;
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

function getStoragePathFromPublicUrl(photoUrl: string | null) {
  if (!photoUrl) return null;

  const marker = "/storage/v1/object/public/care-photos/";
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(photoUrl.slice(markerIndex + marker.length));
}

function sortCareEvents(first: CareEvent, second: CareEvent) {
  return new Date(getEventTime(first)).getTime() - new Date(getEventTime(second)).getTime();
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
  const [activeTab, setActiveTab] = useState<CareWorkspaceTab>("plan");
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
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
  const addedEvents = useMemo(
    () => events.filter((event) => event.source === "added" && event.event_type !== "note" && event.event_type !== "photo"),
    [events],
  );
  const photoEvents = useMemo(() => events.filter((event) => event.event_type === "photo" && event.photo_url).sort(sortCareEvents), [events]);
  const noteEvents = useMemo(() => events.filter((event) => event.event_type === "note").sort(sortCareEvents), [events]);
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
  const summaryProgress = totalCareActions > 0 ? Math.round((completedCareActions / totalCareActions) * 100) : 0;
  const summaryRingRadius = 45;
  const summaryRingCircumference = 2 * Math.PI * summaryRingRadius;
  const summaryRingOffset = summaryRingCircumference * (1 - summaryProgress / 100);
  const summaryChecklist = useMemo(() => {
    const plannedItems = plannedActions.map((action) => {
      const event = plannedEventsByActionId[action.id];
      return {
        id: `planned-${action.id}`,
        type: action.type,
        label: action.label,
        completedAt: event?.completed_at || null,
      };
    });

    const addedItems = addedEvents.map((event) => ({
      id: `added-${event.id}`,
      type: toPlannedActionIconType(event.event_type),
      label: event.label,
      completedAt: event.completed_at,
    }));

    return [...plannedItems, ...addedItems];
  }, [addedEvents, plannedActions, plannedEventsByActionId]);
  const whatHappenedItems = useMemo<CareHappenedItem[]>(() => {
    const items: CareHappenedItem[] = [];

    if (session?.actual_started_at) {
      items.push({
        id: "care-started",
        time: session.actual_started_at,
        label: "Care started",
        type: "start",
      });
    }

    events
      .filter((event) => event.completed_at)
      .forEach((event) => {
        items.push({
          id: event.id,
          time: event.completed_at,
          label:
            event.event_type === "note"
              ? "Note added"
              : event.event_type === "photo"
                ? "Photo added"
                : `${event.label} completed`,
          type: event.event_type,
        });
      });

    if (session?.actual_ended_at) {
      items.push({
        id: "care-ended",
        time: session.actual_ended_at,
        label: "Care ended",
        type: "end",
      });
    }

    return items.sort((first, second) => {
      const firstTime = first.time ? new Date(first.time).getTime() : 0;
      const secondTime = second.time ? new Date(second.time).getTime() : 0;
      return firstTime - secondTime;
    });
  }, [events, session?.actual_ended_at, session?.actual_started_at]);

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
          .select(eventSelect)
          .maybeSingle()
      : await supabase
          .from("care_events")
          .insert({
            family_id: family.id,
            session_id: session.id,
            dependent_id: dependent.id,
            source: "planned",
            planned_action_id: action.id,
            event_type: action.type,
            label: action.label,
            notes: action.notes || null,
            completed_at: now,
          })
          .select(eventSelect)
          .maybeSingle();

    setSavingActionId(null);

    if (result.error) {
      setMessage(result.error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${action.label} completed.`);
    setMessageType("success");
    if (result.data) {
      const savedEvent = result.data as CareEvent;
      setEvents((current) => {
        const exists = current.some((event) => event.id === savedEvent.id);
        return exists
          ? current.map((event) => (event.id === savedEvent.id ? savedEvent : event)).sort(sortCareEvents)
          : [...current, savedEvent].sort(sortCareEvents);
      });
    }
  }

  async function completeAddedEvent(event: CareEvent) {
    if (!family) return;

    const now = new Date().toISOString();
    setSavingActionId(`added-${event.id}`);
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_events")
      .update({ completed_at: now, updated_at: now })
      .eq("id", event.id)
      .eq("family_id", family.id)
      .select(eventSelect)
      .maybeSingle();

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${event.label} completed.`);
    setMessageType("success");
    if (data) {
      const savedEvent = data as CareEvent;
      setEvents((current) => current.map((item) => (item.id === savedEvent.id ? savedEvent : item)).sort(sortCareEvents));
    }
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

    const { data, error } = await supabase
      .from("care_events")
      .insert({
        family_id: family.id,
        session_id: session.id,
        dependent_id: dependent.id,
        source: "added",
        planned_action_id: null,
        event_type: addedForm.event_type,
        label,
        notes: notes || null,
        completed_at: null,
      })
      .select(eventSelect)
      .maybeSingle();

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
    if (data) {
      const savedEvent = data as CareEvent;
      setEvents((current) => [...current, savedEvent].sort(sortCareEvents));
    }
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

    const { data, error } = await supabase
      .from("care_events")
      .insert({
        family_id: family.id,
        session_id: session.id,
        dependent_id: dependent.id,
        source: "added",
        planned_action_id: null,
        event_type: "note",
        label: "Care Note",
        notes,
        completed_at: new Date().toISOString(),
      })
      .select(eventSelect)
      .maybeSingle();

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care note could not be added.");
      setMessageType("error");
      return;
    }

    setCareNote("");
    setMessage("Care note added.");
    setMessageType("success");
    if (data) {
      const savedEvent = data as CareEvent;
      setEvents((current) => [...current, savedEvent].sort(sortCareEvents));
    }
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

    const { data, error } = await supabase
      .from("care_events")
      .insert({
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
      })
      .select(eventSelect)
      .maybeSingle();

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
    if (data) {
      const savedEvent = data as CareEvent;
      setEvents((current) => [...current, savedEvent].sort(sortCareEvents));
    }
  }

  async function deletePhotoEvent(event: CareEvent) {
    if (!family || event.event_type !== "photo") return;

    const confirmed = window.confirm("Remove this photo from Care Log?");
    if (!confirmed) return;

    setSavingActionId(`delete-photo-${event.id}`);
    setMessage(null);
    setMessageType(null);

    const storagePath = getStoragePathFromPublicUrl(event.photo_url);
    if (storagePath) {
      await supabase.storage.from("care-photos").remove([storagePath]);
    }

    const { error } = await supabase
      .from("care_events")
      .delete()
      .eq("id", event.id)
      .eq("family_id", family.id)
      .eq("event_type", "photo");

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Photo could not be removed.");
      setMessageType("error");
      return;
    }

    setPhotoViewerIndex(null);
    setMessage("Photo removed.");
    setMessageType("success");
    setEvents((current) => current.filter((item) => item.id !== event.id));
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
  const caregiverName = session.caregiver_name || "Caregiver";
  const caregiverInitial = caregiverName.slice(0, 1).toUpperCase();

  function openPhotoFromEvent(eventId: string) {
    const photoIndex = photoEvents.findIndex((event) => event.id === eventId);
    if (photoIndex >= 0) {
      setPhotoViewerIndex(photoIndex);
    }
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
                  {profileInitial}
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="min-w-0 rounded-[36px] border border-blue-100 bg-white shadow-xl shadow-blue-100/45">
            <div className="border-b border-blue-100 px-4 pt-4 sm:px-6">
              <div className="flex gap-1 overflow-x-auto">
                {careWorkspaceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black transition ${
                      activeTab === tab.id
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-[#64748B] hover:text-[#2563EB]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "plan" && (
                <section>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-[#0F172A]">Today&apos;s Plan</h2>
                      <p className="mt-1 text-sm leading-6 text-[#64748B]">Complete planned care as it happens.</p>
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
              )}

              {activeTab === "added" && (
                <section>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-[#0F172A]">Added During Care</h2>
                      <p className="mt-1 text-sm leading-6 text-[#64748B]">Add extra care actions when the day changes.</p>
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
              )}

              {activeTab === "photos" && (
                <section>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-[#0F172A]">Photos</h2>
                      <p className="mt-1 text-sm leading-6 text-[#64748B]">Share visual moments from today&apos;s care.</p>
                    </div>
                    <label className="cursor-pointer rounded-[20px] bg-blue-50 px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white">
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <form onSubmit={addCarePhoto} className="mt-6 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Caption optional</span>
                        <input
                          value={photoCaption}
                          onChange={(event) => setPhotoCaption(event.target.value)}
                          placeholder={photoFile ? photoFile.name : "Choose a photo, then add a caption"}
                          className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={Boolean(savingActionId) || !photoFile}
                        className="rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      >
                        {savingActionId === "add-care-photo" ? "Adding..." : "Share Photo"}
                      </button>
                    </div>
                  </form>

                  {photoEvents.length === 0 ? (
                    <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                      <p className="font-semibold text-[#0F172A]">No photos yet</p>
                      <p className="mt-2 text-sm text-[#64748B]">Photos shared during care will appear here.</p>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {photoEvents.map((event, index) => (
                        <article
                          key={event.id}
                          className="group relative overflow-hidden rounded-[24px] bg-[#F8FAFC] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60"
                        >
                          <button type="button" onClick={() => setPhotoViewerIndex(index)} className="block w-full text-left">
                            <img src={event.photo_url || ""} alt={event.notes || "Care photo"} className="h-48 w-full object-cover" />
                            <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-black text-white">
                              {formatPhotoTime(event)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoViewerIndex(index)}
                            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-sm font-black text-[#0F172A] shadow-sm"
                            aria-label="Expand photo"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePhotoEvent(event)}
                            disabled={savingActionId === `delete-photo-${event.id}`}
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-sm font-black text-[#EF4444] shadow-sm disabled:opacity-60"
                            aria-label="Remove photo"
                          >
                            x
                          </button>
                          {event.notes && <p className="p-3 text-sm font-semibold leading-6 text-[#0F172A]">{event.notes}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "notes" && (
                <section>
                  <div>
                    <h2 className="text-2xl font-black text-[#0F172A]">Care Notes</h2>
                    <p className="mt-1 text-sm leading-6 text-[#64748B]">Add helpful context for the family.</p>
                  </div>

                  <form onSubmit={addCareNote} className="mt-6 flex flex-col gap-3 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-4 sm:flex-row">
                    <textarea
                      value={careNote}
                      onChange={(event) => setCareNote(event.target.value)}
                      className="min-h-12 flex-1 resize-none rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="Add a care note..."
                    />
                    <button
                      type="submit"
                      disabled={Boolean(savingActionId)}
                      className="rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {savingActionId === "add-care-note" ? "Adding..." : "Send"}
                    </button>
                  </form>

                  {noteEvents.length === 0 ? (
                    <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                      <p className="font-semibold text-[#0F172A]">No care notes yet</p>
                      <p className="mt-2 text-sm text-[#64748B]">Add updates so the family stays connected.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {noteEvents.map((event) => (
                        <article
                          key={event.id}
                          className="rounded-[24px] bg-[#F8FAFC] p-4 shadow-sm transition duration-300 hover:shadow-md hover:shadow-blue-100/60"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-black text-white">
                              {caregiverInitial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-sm font-black text-[#0F172A]">{caregiverName}</p>
                                <p className="text-xs font-semibold text-[#64748B]">{formatCompletedTime(getEventTime(event))}</p>
                              </div>
                              {event.notes && <p className="mt-2 text-sm leading-6 text-[#334155]">{event.notes}</p>}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "happened" && (
                <section>
                  <div>
                    <h2 className="text-2xl font-black text-[#0F172A]">What Happened</h2>
                    <p className="mt-1 text-sm leading-6 text-[#64748B]">A clear view of care as it unfolds.</p>
                  </div>

                  {completedEvents.length === 0 ? (
                    <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                      <p className="font-semibold text-[#0F172A]">No care activity yet</p>
                      <p className="mt-2 text-sm text-[#64748B]">Start care or complete an activity to begin the Care Story.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {completedEvents.map((event) => (
                        <article key={event.id} className="rounded-[24px] bg-[#F8FAFC] p-4 transition duration-300 hover:shadow-md hover:shadow-blue-100/60">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
                              <PlannedActionIcon type={toPlannedActionIconType(event.event_type)} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-black text-[#0F172A]">
                                  {event.event_type === "note"
                                    ? "Note added"
                                    : event.event_type === "photo"
                                      ? "Photo added"
                                      : `${event.label} completed`}
                                </p>
                                <span className="text-xs font-semibold text-[#64748B]">{formatCompletedTime(getEventTime(event))}</span>
                              </div>
                              {event.notes && <p className="mt-2 text-sm leading-6 text-[#64748B]">{event.notes}</p>}
                              {event.photo_url && (
                                <button type="button" onClick={() => openPhotoFromEvent(event.id)} className="mt-3 block w-full text-left">
                                  <img src={event.photo_url} alt={event.notes || "Care photo"} className="h-40 w-full rounded-[20px] object-cover" />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <h2 className="text-2xl font-black text-[#0F172A]">Care Summary</h2>
              <div className="mt-6 flex items-center gap-5">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                  <svg aria-hidden="true" viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                    <circle cx="60" cy="60" r={summaryRingRadius} fill="none" stroke="#EAF2FF" strokeWidth="12" />
                    <circle
                      cx="60"
                      cy="60"
                      r={summaryRingRadius}
                      fill="none"
                      stroke="url(#care-summary-ring)"
                      strokeLinecap="round"
                      strokeWidth="12"
                      strokeDasharray={summaryRingCircumference}
                      strokeDashoffset={summaryRingOffset}
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="care-summary-ring" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#22C55E" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-black text-[#2563EB] shadow-sm">
                    {summaryProgress}%
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#0F172A]">
                    {completedCareActions} of {totalCareActions}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">care actions completed</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-blue-100 pt-5">
                {summaryChecklist.length === 0 ? (
                  <p className="text-sm leading-6 text-[#64748B]">Care actions will appear here once planned or added.</p>
                ) : (
                  summaryChecklist.map((item) => (
                    <article
                      key={item.id}
                      className={`flex items-center gap-3 rounded-[22px] p-2 transition duration-300 ${
                        item.completedAt ? "bg-emerald-50/70" : "bg-[#F8FAFC]"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
                        <PlannedActionIcon type={item.type} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#0F172A]">{item.label}</p>
                        <p className="text-xs font-semibold text-[#64748B]">
                          {item.completedAt ? `Completed ${formatCompletedTime(item.completedAt)}` : "Pending"}
                        </p>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black transition duration-300 ${
                          item.completedAt ? "border-[#22C55E] bg-[#22C55E] text-white" : "border-[#94A3B8] text-[#94A3B8]"
                        }`}
                      >
                        {item.completedAt && (
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        )}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <h2 className="text-2xl font-black text-[#0F172A]">What Actually Happened</h2>
              {whatHappenedItems.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-5">
                  <p className="font-semibold text-[#0F172A]">No care activity yet</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">Start care or complete an activity to begin the Care Story.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {whatHappenedItems.map((item) => (
                    <article key={item.id} className="grid grid-cols-[72px_14px_1fr] items-start gap-3 rounded-2xl p-1 transition duration-300 hover:bg-[#F8FAFC]">
                      <span className="text-xs font-semibold text-[#64748B]">{formatCompletedTime(item.time)}</span>
                      <span
                        className={`mt-1.5 h-3 w-3 rounded-full ${
                          item.type === "start" || item.type === "meal"
                            ? "bg-[#22C55E]"
                            : item.type === "end"
                              ? "bg-[#64748B]"
                              : item.type === "photo"
                                ? "bg-[#F59E0B]"
                                : "bg-[#2563EB]"
                        }`}
                      />
                      {item.type === "photo" ? (
                        <button
                          type="button"
                          onClick={() => openPhotoFromEvent(item.id)}
                          className="text-left text-sm font-semibold text-[#334155] transition hover:text-[#2563EB]"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <p className={`text-sm font-semibold ${item.type === "meal" ? "text-[#16A34A]" : "text-[#334155]"}`}>
                          {item.label}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </section>

      {photoViewerIndex !== null && photoEvents[photoViewerIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 p-5">
          <button
            type="button"
            onClick={() => setPhotoViewerIndex(null)}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-black text-[#0F172A] shadow-lg"
            aria-label="Close photo viewer"
          >
            x
          </button>

          {photoEvents.length > 1 && (
            <button
              type="button"
              onClick={() => setPhotoViewerIndex((current) => (current === null ? 0 : (current - 1 + photoEvents.length) % photoEvents.length))}
              className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-black text-[#0F172A] shadow-lg"
              aria-label="Previous photo"
            >
              &lt;
            </button>
          )}

          <div className="max-h-[88vh] w-full max-w-5xl">
            <img
              src={photoEvents[photoViewerIndex].photo_url || ""}
              alt={photoEvents[photoViewerIndex].notes || "Care photo"}
              className="max-h-[78vh] w-full rounded-[28px] object-contain"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white px-5 py-4">
              <div>
                <p className="text-sm font-black text-[#0F172A]">
                  {photoViewerIndex + 1} / {photoEvents.length}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">{formatPhotoTime(photoEvents[photoViewerIndex])}</p>
              </div>
              {photoEvents[photoViewerIndex].notes && (
                <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[#334155]">{photoEvents[photoViewerIndex].notes}</p>
              )}
              <button
                type="button"
                onClick={() => deletePhotoEvent(photoEvents[photoViewerIndex])}
                disabled={savingActionId === `delete-photo-${photoEvents[photoViewerIndex].id}`}
                className="rounded-[18px] bg-red-50 px-4 py-2 text-sm font-black text-[#EF4444] transition hover:bg-[#EF4444] hover:text-white disabled:opacity-60"
              >
                Remove Photo
              </button>
            </div>
          </div>

          {photoEvents.length > 1 && (
            <button
              type="button"
              onClick={() => setPhotoViewerIndex((current) => (current === null ? 0 : (current + 1) % photoEvents.length))}
              className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-black text-[#0F172A] shadow-lg"
              aria-label="Next photo"
            >
              &gt;
            </button>
          )}
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
