"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

type Family = { id: string; name: string };
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
  status: SessionStatus;
  starts_at: string | null;
  ends_at: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  instructions: string | null;
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

type CareMessage = {
  id: string;
  family_id: string;
  dependent_id: string | null;
  care_session_id: string | null;
  sender_role: "parent" | "caregiver" | "support" | "system";
  sender_name: string | null;
  body: string;
  message_type: string;
  created_at: string | null;
};

type TimelineItem = {
  id: string;
  time: string | null;
  icon: string;
  title: string;
  note: string;
  detail?: string;
  identity?: string;
  photoUrls?: string[];
  photoAlt?: string;
  kind: "system" | "log" | "photo";
  color: "sleep" | "meal" | "medicine" | "mood" | "photo" | "session";
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const quickEvents = [
  {
    type: "meal",
    title: "Meal",
    icon: "🍽️",
    note: "Meal completed.",
    mode: "input",
    prompt: "What did they eat?",
  },
  {
    type: "medicine",
    title: "Medicine",
    icon: "💊",
    note: "Medicine given.",
    mode: "input",
    prompt: "What was given?",
  },
  {
    type: "sleep_start",
    title: "Start Sleep",
    icon: "🌙",
    note: "Sleep started.",
    mode: "instant",
  },
  {
    type: "sleep_end",
    title: "End Sleep",
    icon: "☀️",
    note: "Sleep ended.",
    mode: "instant",
  },
  {
    type: "mood",
    title: "Mood",
    icon: "😊",
    note: "Mood checked.",
    mode: "select",
    options: ["Happy", "Calm", "Tired", "Upset", "Sick"],
  },
  {
    type: "activity",
    title: "Activity",
    icon: "🌳",
    note: "Activity completed.",
    mode: "instant",
  },
  {
    type: "note",
    title: "Note",
    icon: "📝",
    note: "Care note added.",
    mode: "instant",
  },
] as const;

const typeConfig: Record<
  DependentType,
  {
    label: string;
    icon: string;
    avatar: string;
    defaultTitle: string;
    caregiver: string;
  }
> = {
  child: {
    label: "Child",
    icon: "👶",
    avatar: "bg-blue-50 text-[#2563EB]",
    defaultTitle: "Nanny Visit",
    caregiver: "Anna Johnson",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22C55E]",
    defaultTitle: "Dog Walk",
    caregiver: "Mike Walker",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    defaultTitle: "Care Visit",
    caregiver: "Sophie Martin",
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

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatClockTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDatetimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatCareStoryDuration(start: string | null, end: string | null) {
  if (!start || !end) return "";
  const totalMilliseconds = Math.max(
    0,
    new Date(end).getTime() - new Date(start).getTime(),
  );
  if (totalMilliseconds < 60000) return "Less than 1 min";

  const totalMinutes = Math.round(totalMilliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatCareStoryTimeRange(start: string | null, end: string | null) {
  if (!start || !end) return formatClockTime(start || end);
  return `${formatClockTime(start)} – ${formatClockTime(end)}`;
}

function getDurationSeconds(session: CareSession | null, nowMs: number) {
  if (!session || session.status !== "active" || !session.check_in_at) return 0;
  return Math.max(
    0,
    Math.floor((nowMs - new Date(session.check_in_at).getTime()) / 1000),
  );
}

function getPlannedDurationSeconds(session: CareSession | null) {
  if (!session?.starts_at || !session?.ends_at) return 0;
  return Math.max(
    0,
    Math.floor(
      (new Date(session.ends_at).getTime() -
        new Date(session.starts_at).getTime()) /
        1000,
    ),
  );
}

function getRemainingSeconds(session: CareSession | null, nowMs: number) {
  if (
    !session ||
    session.status === "completed" ||
    session.status === "cancelled"
  )
    return 0;
  const planned = getPlannedDurationSeconds(session);
  if (planned <= 0) return 0;
  if (session.status === "active" && session.check_in_at) {
    const elapsed = Math.max(
      0,
      Math.floor((nowMs - new Date(session.check_in_at).getTime()) / 1000),
    );
    return Math.max(0, planned - elapsed);
  }
  return planned;
}

const careStoryColorStyles: Record<
  TimelineItem["color"],
  { icon: string; card: string; time: string; connector: string }
> = {
  sleep: {
    icon: "bg-violet-50 ring-violet-100",
    card: "border-violet-100 bg-violet-50/75",
    time: "bg-white text-violet-700",
    connector: "from-violet-100 to-violet-100",
  },
  meal: {
    icon: "bg-emerald-50 ring-emerald-100",
    card: "border-emerald-100 bg-emerald-50/75",
    time: "bg-white text-[#22C55E]",
    connector: "from-emerald-100 to-emerald-100",
  },
  medicine: {
    icon: "bg-orange-50 ring-orange-100",
    card: "border-orange-100 bg-orange-50/75",
    time: "bg-white text-orange-700",
    connector: "from-orange-100 to-orange-100",
  },
  mood: {
    icon: "bg-blue-50 ring-blue-100",
    card: "border-blue-100 bg-blue-50/75",
    time: "bg-white text-[#2563EB]",
    connector: "from-blue-100 to-blue-100",
  },
  photo: {
    icon: "bg-cyan-50 ring-cyan-100",
    card: "border-cyan-100 bg-cyan-50/75",
    time: "bg-white text-cyan-700",
    connector: "from-cyan-100 to-cyan-100",
  },
  session: {
    icon: "bg-slate-50 ring-slate-200",
    card: "border-slate-200 bg-slate-50/90",
    time: "bg-white text-slate-600",
    connector: "from-slate-200 to-slate-200",
  },
};

function getCareStoryLogDetails(
  log: CareLog,
): Pick<TimelineItem, "icon" | "title" | "note" | "color"> {
  const value = log.value?.trim();
  const note = log.note?.trim();

  if (log.type === "sleep") {
    if (value === "start")
      return {
        icon: "😴",
        title: "Sleep",
        note: note || "Rest time began.",
        color: "sleep",
      };
    if (value === "end")
      return {
        icon: "😴",
        title: "Sleep",
        note: note || "Rest time ended.",
        color: "sleep",
      };
    return {
      icon: "😴",
      title: "Sleep",
      note: note || (value ? `Sleep: ${value}` : "Sleep update added."),
      color: "sleep",
    };
  }

  if (log.type === "meal")
    return {
      icon: "🍽",
      title: "Meal",
      note: value ? `Ate: ${value}` : note || "Meal update added.",
      color: "meal",
    };
  if (log.type === "medicine")
    return {
      icon: "💊",
      title: "Medicine",
      note: value ? `Given: ${value}` : note || "Medicine update added.",
      color: "medicine",
    };
  if (log.type === "mood")
    return {
      icon: "😊",
      title: "Mood",
      note: value || note?.replace(/^Mood:\s*/i, "") || "Mood update added.",
      color: "mood",
    };

  const event = quickEvents.find((quickEvent) => quickEvent.type === log.type);
  return {
    icon: event?.icon || "📝",
    title: log.title || event?.title || "Care update",
    note: note || value || "Care update added.",
    color: "session",
  };
}

function getCareStoryIdentity(kind: TimelineItem["kind"], caregiverName: string) {
  if (kind === "photo") return `Shared by ${caregiverName}`;
  if (kind === "system") return `Care by ${caregiverName}`;
  return `Added by ${caregiverName}`;
}

function joinWarmList(items: string[]) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);

  if (cleanItems.length === 0) return "";
  if (cleanItems.length === 1) return cleanItems[0];
  if (cleanItems.length === 2) return `${cleanItems[0]} and ${cleanItems[1]}`;

  return `${cleanItems.slice(0, -1).join(", ")}, and ${cleanItems[cleanItems.length - 1]}`;
}

function getCareLogValue(log: CareLog) {
  const value = log.value?.trim();
  const note = log.note?.trim();
  const detail = value || note || "";
  const genericDetails = [
    "Meal completed.",
    "Medicine given.",
    "Mood checked.",
    "Activity completed.",
    "Care note added.",
    "Sleep started.",
    "Sleep ended.",
  ];

  if (genericDetails.includes(detail)) return "";
  return detail.replace(/^Mood:\s*/i, "");
}

function getSleepStory(logs: CareLog[], dependentName: string) {
  const sleepLogs = logs
    .filter((log) => log.type === "sleep")
    .sort(
      (a, b) =>
        (a.created_at ? new Date(a.created_at).getTime() : 0) -
        (b.created_at ? new Date(b.created_at).getTime() : 0),
    );

  if (sleepLogs.length === 0) return "";

  const pendingStarts: CareLog[] = [];
  let totalSleepMs = 0;

  sleepLogs.forEach((log) => {
    const value = log.value?.trim();

    if (value === "start") {
      pendingStarts.push(log);
      return;
    }

    if (value === "end") {
      const startedLog = pendingStarts.shift();

      if (startedLog?.created_at && log.created_at) {
        totalSleepMs += Math.max(
          0,
          new Date(log.created_at).getTime() - new Date(startedLog.created_at).getTime(),
        );
      }
    }
  });

  if (totalSleepMs > 0) {
    return `${dependentName} rested for ${formatCareStoryDuration(
      new Date(0).toISOString(),
      new Date(totalSleepMs).toISOString(),
    )}.`;
  }

  return `${dependentName} had a rest during care.`;
}

function buildSessionSummaryText({
  session,
  dependent,
  logs,
  photos,
  messages,
}: {
  session: CareSession;
  dependent: Dependent | null;
  logs: CareLog[];
  photos: Photo[];
  messages: CareMessage[];
}) {
  const dependentName = dependent?.name || "your loved one";
  const caregiverName = session.caregiver_name?.trim() || "Caregiver";
  const storyParts: string[] = [];

  const careTimeText =
    session.check_in_at && session.check_out_at
      ? ` for ${formatCareStoryDuration(session.check_in_at, session.check_out_at)}`
      : session.starts_at && session.ends_at
        ? ` for ${formatCareStoryDuration(session.starts_at, session.ends_at)}`
        : "";
  const timeDetail =
    session.check_in_at && session.check_out_at
      ? `Care time was ${formatClockTime(session.check_in_at)} to ${formatClockTime(session.check_out_at)}.`
      : session.check_in_at
        ? `Care started at ${formatClockTime(session.check_in_at)} and is still unfolding.`
        : session.starts_at
          ? `Care was planned for ${formatDateTime(session.starts_at)}.`
          : "";

  storyParts.push(`Today ${caregiverName} cared for ${dependentName}${careTimeText}.`);
  if (timeDetail) storyParts.push(timeDetail);

  const sleepStory = getSleepStory(logs, dependentName);
  if (sleepStory) storyParts.push(sleepStory);

  const mealLogs = logs.filter((log) => log.type === "meal");
  const mealDetails = mealLogs
    .map(getCareLogValue)
    .filter(Boolean);
  if (mealDetails.length > 0) {
    storyParts.push(`${dependentName} ate ${joinWarmList(mealDetails.slice(0, 3))}.`);
  } else if (mealLogs.length > 0) {
    storyParts.push(`${dependentName} had meal care during the day.`);
  }

  const medicineLogs = logs.filter((log) => log.type === "medicine");
  const medicineDetails = medicineLogs
    .map(getCareLogValue)
    .filter(Boolean);
  if (medicineDetails.length > 0) {
    storyParts.push(`${caregiverName} gave ${joinWarmList(medicineDetails.slice(0, 3))}.`);
  } else if (medicineLogs.length > 0) {
    storyParts.push(`${caregiverName} took care of medicine for ${dependentName}.`);
  }

  const moodLogs = logs.filter((log) => log.type === "mood");
  const moodDetails = moodLogs
    .map(getCareLogValue)
    .filter(Boolean);
  if (moodDetails.length > 0) {
    storyParts.push(`${dependentName} seemed ${joinWarmList(moodDetails.slice(0, 3).map((mood) => mood.toLowerCase()))}.`);
  } else if (moodLogs.length > 0) {
    storyParts.push(`${caregiverName} checked in on how ${dependentName} was feeling.`);
  }

  storyParts.push(
    photos.length === 1
      ? `${caregiverName} also shared 1 moment with the family.`
      : `${caregiverName} also shared ${photos.length} moments with the family.`,
  );

  if (messages.length > 0) {
    storyParts.push(
      `The family stayed connected with ${messages.length} message${messages.length === 1 ? "" : "s"} during care.`,
    );
  }

  storyParts.push(
    session.status === "completed"
      ? `Everything was wrapped up with care, so the family can feel close to ${dependentName}'s day.`
      : `This story will keep growing as ${caregiverName} shares more care moments.`,
  );

  return storyParts.join(" ");
}

export default function CareSessionsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [newDependentId, setNewDependentId] = useState("");
  const [newStartsAt, setNewStartsAt] = useState(
    toDatetimeLocalValue(new Date()),
  );
  const [newEndsAt, setNewEndsAt] = useState(
    toDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  );
  const [newCaregiver, setNewCaregiver] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [activeActionType, setActiveActionType] = useState<string | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [careSessionsExpanded, setCareSessionsExpanded] = useState(false);

  async function loadSessions() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const profile = getProfileFromUser(userData.user);
    setUserId(userData.user.id);
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
    const loadedDependents = ((dependentsData || []) as Dependent[]).filter(
      (item) => ["child", "pet", "elder"].includes(item.type),
    );
    setDependents(loadedDependents);
    if (loadedDependents.length > 0)
      setNewDependentId((current) => current || loadedDependents[0].id);

    const { data: sessionsData } = await supabase
      .from("care_sessions")
      .select(
        "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at",
      )
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false });
    const loadedSessions = (sessionsData || []) as CareSession[];
    setSessions(loadedSessions);

    const activeSession =
      loadedSessions.find((session) => session.status === "active") ||
      loadedSessions[0] ||
      null;
    if (activeSession)
      setSelectedSessionId((current) => current || activeSession.id);

    const sessionIds = loadedSessions.map((item) => item.id);
    if (sessionIds.length > 0) {
      const { data: logsData } = await supabase
        .from("care_logs")
        .select(
          "id, family_id, dependent_id, care_session_id, type, title, note, value, created_at",
        )
        .in("care_session_id", sessionIds)
        .order("created_at", { ascending: false });
      setCareLogs((logsData || []) as CareLog[]);

      const { data: photosData } = await supabase
        .from("photos")
        .select(
          "id, family_id, dependent_id, care_session_id, url, storage_path, caption, created_at, created_by",
        )
        .in("care_session_id", sessionIds)
        .order("created_at", { ascending: false });
      setPhotos((photosData || []) as Photo[]);

      const { data: messagesData } = await supabase
        .from("care_messages")
        .select(
          "id, family_id, dependent_id, care_session_id, sender_role, sender_name, body, message_type, created_at",
        )
        .in("care_session_id", sessionIds)
        .order("created_at", { ascending: true });
      setCareMessages((messagesData || []) as CareMessage[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setActiveActionType(null);
    setActionValue("");
  }, [selectedSessionId]);

  const initials = displayName.slice(0, 1).toUpperCase();
  const selectedSession = useMemo(
    () =>
      sessions.find((session) => session.id === selectedSessionId) ||
      sessions[0] ||
      null,
    [selectedSessionId, sessions],
  );
  const selectedDependent = useMemo(
    () =>
      selectedSession
        ? dependents.find(
            (dependent) => dependent.id === selectedSession.dependent_id,
          ) || null
        : null,
    [dependents, selectedSession],
  );
  const selectedLogs = useMemo(
    () =>
      selectedSession
        ? careLogs.filter((log) => log.care_session_id === selectedSession.id)
        : [],
    [careLogs, selectedSession],
  );
  const selectedPhotos = useMemo(
    () =>
      selectedSession
        ? photos.filter((photo) => photo.care_session_id === selectedSession.id)
        : [],
    [photos, selectedSession],
  );
  const selectedMessages = useMemo(
    () =>
      selectedSession
        ? careMessages.filter(
            (item) => item.care_session_id === selectedSession.id,
          )
        : [],
    [careMessages, selectedSession],
  );

  const sessionTimeline = useMemo(() => {
    if (!selectedSession) return [];
    const items: TimelineItem[] = [];
    const caregiverName = selectedSession.caregiver_name?.trim() || "Caregiver";
    const sortedLogs = [...selectedLogs].sort(
      (a, b) =>
        (a.created_at ? new Date(a.created_at).getTime() : 0) -
        (b.created_at ? new Date(b.created_at).getTime() : 0),
    );
    const pendingSleepStarts: CareLog[] = [];

    if (selectedSession.check_in_at)
      items.push({
        id: "session-started",
        time: selectedSession.check_in_at,
        icon: "💚",
        title: "Care started",
        note: `${caregiverName} checked in and began caring for ${selectedDependent?.name || "your loved one"}.`,
        identity: getCareStoryIdentity("system", caregiverName),
        kind: "system",
        color: "session",
      });

    sortedLogs.forEach((log) => {
      const value = log.value?.trim();

      if (log.type === "sleep" && value === "start") {
        pendingSleepStarts.push(log);
        return;
      }

      if (log.type === "sleep" && value === "end") {
        const startedLog = pendingSleepStarts.shift();
        if (startedLog) {
          items.push({
            id: `${startedLog.id}-${log.id}`,
            time: startedLog.created_at,
            icon: "😴",
            title: "Sleep",
            note: formatCareStoryTimeRange(
              startedLog.created_at,
              log.created_at,
            ),
            detail: formatCareStoryDuration(
              startedLog.created_at,
              log.created_at,
            ),
            identity: getCareStoryIdentity("log", caregiverName),
            kind: "log",
            color: "sleep",
          });
          return;
        }
      }

      items.push({
        id: log.id,
        time: log.created_at,
        ...getCareStoryLogDetails(log),
        identity: getCareStoryIdentity("log", caregiverName),
        kind: "log",
      });
    });

    pendingSleepStarts.forEach((log) =>
      items.push({
        id: log.id,
        time: log.created_at,
        ...getCareStoryLogDetails(log),
        identity: getCareStoryIdentity("log", caregiverName),
        kind: "log",
      }),
    );
    const photoReports = selectedPhotos.reduce<
      Record<
        string,
        { id: string; time: string | null; caption: string; urls: string[] }
      >
    >((reports, photo) => {
      const caption = photo.caption?.trim() || "A new moment was shared.";
      const reportMinute = photo.created_at
        ? new Date(photo.created_at).toISOString().slice(0, 16)
        : "unknown-time";
      const key = `${caption}-${reportMinute}`;
      const current = reports[key] || {
        id: photo.id,
        time: photo.created_at,
        caption,
        urls: [],
      };
      if (photo.url) current.urls.push(photo.url);
      reports[key] = current;
      return reports;
    }, {});

    Object.values(photoReports).forEach((report) =>
      items.push({
        id: report.id,
        time: report.time,
        icon: "📷",
        title: "Moment",
        note: report.caption,
        detail:
          report.urls.length > 1
            ? `${report.urls.length} moments shared`
            : undefined,
        identity: getCareStoryIdentity("photo", caregiverName),
        photoUrls: report.urls,
        photoAlt: report.caption,
        kind: "photo",
        color: "photo",
      }),
    );
    if (selectedSession.check_out_at)
      items.push({
        id: "session-ended",
        time: selectedSession.check_out_at,
        icon: "🏡",
        title: "Care ended",
        note: "Care session was completed and everyone is all set.",
        identity: getCareStoryIdentity("system", caregiverName),
        kind: "system",
        color: "session",
      });
    return items.sort(
      (a, b) =>
        (a.time ? new Date(a.time).getTime() : 0) -
        (b.time ? new Date(b.time).getTime() : 0),
    );
  }, [selectedDependent?.name, selectedLogs, selectedPhotos, selectedSession]);
  const careSessionsPreviewLimit = 3;
  const visibleCareSessions = careSessionsExpanded
    ? sessions
    : sessions.slice(0, careSessionsPreviewLimit);
  const hasHiddenCareSessions = sessions.length > careSessionsPreviewLimit;

  const activeSessions = sessions.filter(
    (session) => session.status === "active",
  ).length;
  const scheduledSessions = sessions.filter(
    (session) => session.status === "scheduled",
  ).length;
  const completedSessions = sessions.filter(
    (session) => session.status === "completed",
  ).length;
  const selectedDuration = getDurationSeconds(selectedSession, nowMs);
  const selectedRemaining = getRemainingSeconds(selectedSession, nowMs);

  function getDependent(dependentId: string) {
    return dependents.find((dependent) => dependent.id === dependentId) || null;
  }

  function getSessionStats(sessionId: string) {
    return {
      logs: careLogs.filter((log) => log.care_session_id === sessionId).length,
      photos: photos.filter((photo) => photo.care_session_id === sessionId)
        .length,
    };
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function createSession() {
    setMessage("");
    if (!family) return setMessage("Family workspace not found.");
    const dependent = dependents.find((item) => item.id === newDependentId);
    if (!dependent) return setMessage("Please select a dependent.");
    const config = typeConfig[dependent.type];

    const { data, error } = await supabase
      .from("care_sessions")
      .insert({
        family_id: family.id,
        dependent_id: dependent.id,
        title: config.defaultTitle,
        care_type:
          dependent.type === "child"
            ? "child_care"
            : dependent.type === "pet"
              ? "pet_care"
              : "elder_care",
        caregiver_name: newCaregiver.trim() || config.caregiver,
        status: "scheduled",
        starts_at: newStartsAt ? new Date(newStartsAt).toISOString() : null,
        ends_at: newEndsAt ? new Date(newEndsAt).toISOString() : null,
        instructions: newInstructions.trim() || null,
        created_by: userId || null,
      })
      .select(
        "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at",
      )
      .single();

    if (error) return setMessage(error.message);
    const newSession = data as CareSession;
    setSessions([newSession, ...sessions]);
    setSelectedSessionId(newSession.id);
    setNewInstructions("");
    setNewCaregiver("");
    setMessage("Care session created.");
  }

  async function updateSessionStatus(
    session: CareSession,
    nextStatus: SessionStatus,
  ) {
    setMessage("");
    const updates: Partial<CareSession> = { status: nextStatus };
    if (nextStatus === "active") {
      updates.check_in_at = new Date().toISOString();
      updates.check_out_at = null;
    }
    if (nextStatus === "completed")
      updates.check_out_at = new Date().toISOString();
    if (nextStatus === "scheduled") {
      updates.check_in_at = null;
      updates.check_out_at = null;
    }

    const { data, error } = await supabase
      .from("care_sessions")
      .update(updates)
      .eq("id", session.id)
      .select(
        "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at",
      )
      .single();
    if (error) return setMessage(error.message);
    const updated = data as CareSession;
    setSessions(
      sessions.map((item) => (item.id === updated.id ? updated : item)),
    );
    setSelectedSessionId(updated.id);
    setMessage(
      nextStatus === "active"
        ? "Session started. Timer is running."
        : nextStatus === "completed"
          ? "Session ended. Timer stopped."
          : `Session marked as ${nextStatus}.`,
    );
  }

  async function handleSessionPhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setMessage("");
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (!family || !selectedSession || !selectedDependent)
      return setMessage("Select a care session first.");
    if (
      selectedSession.status === "completed" ||
      selectedSession.status === "cancelled"
    ) {
      setMessage(
        "This session is completed. Start a new session to share moments.",
      );
      event.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    const caption = photoCaption.trim() || "Moment update";
    const uploadedPhotos: Array<{ url: string; storage_path: string }> = [];

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${family.id}/${selectedDependent.id}/${selectedSession.id}/${Date.now()}-${uploadedPhotos.length}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("care-photos")
        .upload(storagePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setUploadingPhoto(false);
        setMessage(uploadError.message);
        event.target.value = "";
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("care-photos")
        .getPublicUrl(storagePath);
      uploadedPhotos.push({
        url: publicUrlData.publicUrl,
        storage_path: storagePath,
      });
    }

    const { data: photoData, error: photoError } = await supabase
      .from("photos")
      .insert(
        uploadedPhotos.map((photo) => ({
          family_id: family.id,
          dependent_id: selectedDependent.id,
          care_session_id: selectedSession.id,
          url: photo.url,
          storage_path: photo.storage_path,
          caption,
          created_by: userId || null,
        })),
      )
      .select(
        "id, family_id, dependent_id, care_session_id, url, storage_path, caption, created_at, created_by",
      );

    setUploadingPhoto(false);
    event.target.value = "";
    if (photoError) return setMessage(photoError.message);
    const newPhotos = (photoData || []) as Photo[];
    setPhotos([...newPhotos, ...photos]);
    setPhotoCaption("");
    setMessage(
      newPhotos.length === 1
        ? "Moment added to Today's Care Story."
        : `${newPhotos.length} moments added to Today's Care Story.`,
    );
  }

  async function saveSessionAction(
    event: (typeof quickEvents)[number],
    value = "",
  ) {
    setMessage("");
    if (!family || !selectedSession || !selectedDependent)
      return setMessage("Select a care session first.");
    if (
      selectedSession.status === "completed" ||
      selectedSession.status === "cancelled"
    )
      return setMessage(
        "This session is completed. Start a new session to add updates.",
      );

    const trimmedValue = value.trim();
    if ((event.mode === "input" || event.mode === "select") && !trimmedValue)
      return setMessage("Please add a value before saving this update.");

    const logType =
      event.type === "sleep_start" || event.type === "sleep_end"
        ? "sleep"
        : event.type;
    const note =
      event.type === "meal" && trimmedValue
        ? `Ate: ${trimmedValue}`
        : event.type === "medicine" && trimmedValue
          ? `Given: ${trimmedValue}`
          : event.type === "mood" && trimmedValue
            ? `Mood: ${trimmedValue}`
            : event.note;
    const logValue =
      event.type === "sleep_start"
        ? "start"
        : event.type === "sleep_end"
          ? "end"
          : trimmedValue || null;

    const { data, error } = await supabase
      .from("care_logs")
      .insert({
        family_id: family.id,
        dependent_id: selectedDependent.id,
        care_session_id: selectedSession.id,
        child_id:
          selectedDependent.type === "child" ? selectedDependent.id : null,
        type: logType,
        title: event.title,
        note,
        value: logValue,
        created_by: userId || null,
      })
      .select(
        "id, family_id, dependent_id, care_session_id, type, title, note, value, created_at",
      )
      .single();

    if (error) return setMessage(error.message);
    setCareLogs([data as CareLog, ...careLogs]);
    setActiveActionType(null);
    setActionValue("");
    setMessage(`${event.title} added to Care Story.`);
  }

  function handleSessionAction(event: (typeof quickEvents)[number]) {
    if (event.mode === "input" || event.mode === "select") {
      setMessage("");
      setActiveActionType((current) =>
        current === event.type ? null : event.type,
      );
      setActionValue("");
      return;
    }

    void saveSessionAction(event);
  }

  async function generateSessionSummary() {
    setMessage("");
    if (!selectedSession) return setMessage("Select a care session first.");
    setGeneratingSummary(true);
    const summaryText = buildSessionSummaryText({
      session: selectedSession,
      dependent: selectedDependent,
      logs: selectedLogs,
      photos: selectedPhotos,
      messages: selectedMessages,
    });
    const { data, error } = await supabase
      .from("care_sessions")
      .update({ summary: summaryText })
      .eq("id", selectedSession.id)
      .select(
        "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at",
      )
      .single();
    setGeneratingSummary(false);
    if (error) return setMessage(error.message);
    const updated = data as CareSession;
    setSessions(
      sessions.map((item) => (item.id === updated.id ? updated : item)),
    );
    setSelectedSessionId(updated.id);
    setMessage("AI Daily Story generated and saved.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">
            Loading care...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-28 text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-left"
          >
            <CareOSLogo />
          </button>
          <div className="hidden items-center gap-2 rounded-full bg-[#F8FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-white hover:text-[#2563EB]"
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
                <p className="max-w-[180px] truncate text-sm font-semibold text-[#0F172A]">
                  {displayName}
                </p>
              </div>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition hover:bg-red-50"
                >
                  Sign Out<span>↗</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
            >
              ←
            </button>
            <p className="text-sm font-semibold text-[#64748B]">
              Live Session
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">
              Live Session
            </h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              Start care, share updates, and keep the family close to every
              moment.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-emerald-50 p-4">
                <p className="text-3xl font-black text-[#22C55E]">
                  {activeSessions}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  Active
                </p>
              </div>
              <div className="rounded-[24px] bg-blue-50 p-4">
                <p className="text-3xl font-black text-[#2563EB]">
                  {scheduledSessions}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  Scheduled
                </p>
              </div>
              <div className="rounded-[24px] bg-slate-100 p-4">
                <p className="text-3xl font-black text-slate-600">
                  {completedSessions}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">
                  Completed
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-semibold text-[#64748B]">
                Plan care
              </p>
              <div className="mt-4 grid gap-3">
                <select
                  value={newDependentId}
                  onChange={(event) => setNewDependentId(event.target.value)}
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold outline-none transition focus:border-[#2563EB]"
                >
                  {dependents.map((dependent) => (
                    <option key={dependent.id} value={dependent.id}>
                      {dependent.name} · {typeConfig[dependent.type].label}
                    </option>
                  ))}
                </select>
                <input
                  value={newCaregiver}
                  onChange={(event) => setNewCaregiver(event.target.value)}
                  placeholder="Caregiver name"
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="datetime-local"
                    value={newStartsAt}
                    onChange={(event) => setNewStartsAt(event.target.value)}
                    className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                  />
                  <input
                    type="datetime-local"
                    value={newEndsAt}
                    onChange={(event) => setNewEndsAt(event.target.value)}
                    className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                  />
                </div>
                <textarea
                  value={newInstructions}
                  onChange={(event) => setNewInstructions(event.target.value)}
                  placeholder="Instructions: medicine, feeding, routines, emergency notes..."
                  className="min-h-24 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                />
                <button
                  onClick={createSession}
                  className="rounded-2xl bg-[#2563EB] p-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
                >
                  Create Care Session
                </button>
                {message && (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22C55E]">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">
                    Sessions
                  </p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">
                    Today&apos;s care
                  </h2>
                </div>
                <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                  {family?.name || "Family"}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                  <div className="text-5xl">🫶</div>
                  <p className="mt-4 font-semibold text-[#0F172A]">
                    No care planned yet.
                  </p>
                  <p className="mt-2 text-sm text-[#64748B]">
                    Create the first session to share care updates and build
                    today&apos;s story.
                  </p>
                </div>
              ) : (
                <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    {visibleCareSessions.map((session) => {
                      const dependent = getDependent(session.dependent_id);
                      const config = dependent
                        ? typeConfig[dependent.type]
                        : null;
                      const stats = getSessionStats(session.id);
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`w-full rounded-[28px] border p-4 text-left transition ${selectedSessionId === session.id ? "border-blue-200 bg-blue-50/70 shadow-sm" : "border-blue-100 bg-[#FFFFFF] hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"}`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] text-2xl ${config?.avatar || "bg-blue-50"}`}
                            >
                              {config?.icon || "🫶"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="truncate text-sm font-black text-[#0F172A]">
                                  {session.title || "Care Session"}
                                </p>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[session.status]}`}
                                >
                                  {session.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-[#2563EB]">
                                {dependent?.name || "Dependent"}
                              </p>
                              <p className="mt-1 text-xs text-[#64748B]">
                                {formatDateTime(session.starts_at)}
                              </p>
                              <p className="mt-2 text-xs text-[#64748B]">
                                {stats.logs} updates · {stats.photos} moments
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {hasHiddenCareSessions && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCareSessionsExpanded((expanded) => !expanded)
                          }
                          className="rounded-full border border-blue-100 bg-white px-5 py-2 text-xs font-black text-[#2563EB] shadow-sm shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                        >
                          {careSessionsExpanded
                            ? "Show less"
                            : "View all care sessions"}
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedSession && selectedDependent && (
                    <div className="rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedSession.status]}`}
                          >
                            {selectedSession.status === "active" && (
                              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                            )}
                            {selectedSession.status}
                          </span>
                          <h3 className="mt-4 text-3xl font-black text-[#0F172A]">
                            {selectedSession.title || "Care Session"}
                          </h3>
                          <p className="mt-2 text-sm text-[#64748B]">
                            {selectedSession.caregiver_name || "Caregiver"} with{" "}
                            {selectedDependent.name}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            router.push(`/dependent/${selectedDependent.id}`)
                          }
                          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#64748B] shadow-sm transition hover:text-[#2563EB]"
                        >
                          Profile
                        </button>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                          <p className="text-xs font-semibold text-[#64748B]">
                            Start Time
                          </p>
                          <p className="mt-1 text-sm font-black text-[#0F172A]">
                            {formatClockTime(selectedSession.starts_at)}
                          </p>
                        </div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                          <p className="text-xs font-semibold text-[#64748B]">
                            End Time
                          </p>
                          <p className="mt-1 text-sm font-black text-[#0F172A]">
                            {formatClockTime(selectedSession.ends_at)}
                          </p>
                        </div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                          <p className="text-xs font-semibold text-[#64748B]">
                            Actual Start
                          </p>
                          <p className="mt-1 text-sm font-black text-[#0F172A]">
                            {formatClockTime(selectedSession.check_in_at)}
                          </p>
                        </div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm">
                          <p className="text-xs font-semibold text-[#64748B]">
                            Actual End
                          </p>
                          <p className="mt-1 text-sm font-black text-[#0F172A]">
                            {formatClockTime(selectedSession.check_out_at)}
                          </p>
                        </div>
                      </div>
                      {selectedSession.instructions && (
                        <div className="mt-5 rounded-[24px] bg-white/90 p-5 shadow-sm">
                          <p className="text-sm font-black text-[#0F172A]">
                            Instructions
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#64748B]">
                            {selectedSession.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-[#0F172A]">
                    Session Timer
                  </h2>
                  {selectedSession.status === "active" && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#22C55E]">
                      <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                      LIVE
                    </span>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <div className="text-6xl font-black tracking-tight text-[#0F172A] md:text-7xl">
                    {formatDuration(selectedDuration)}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#64748B]">
                    elapsed time
                  </p>
                  <div className="mt-6 text-2xl font-black tracking-wide text-slate-400 md:text-3xl">
                    {formatDuration(selectedRemaining)}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-400">
                    remaining time
                  </p>
                </div>

                {selectedSession.status === "active" ? (
                  <button
                    onClick={() =>
                      updateSessionStatus(selectedSession, "completed")
                    }
                    className="mt-8 w-full rounded-[22px] bg-[#EF4444] p-5 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600"
                  >
                    ■ End Session
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateSessionStatus(selectedSession, "active")
                    }
                    disabled={
                      selectedSession.status === "completed" ||
                      selectedSession.status === "cancelled"
                    }
                    className={`mt-8 w-full rounded-[22px] p-5 text-sm font-black text-white shadow-lg transition ${selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed bg-slate-300 shadow-none" : "bg-[#22C55E] shadow-emerald-100 hover:bg-[#22C55E]"}`}
                  >
                    ▶ Start Session
                  </button>
                )}

                <div className="mt-6 rounded-[24px] bg-blue-50 p-5">
                  <p className="text-sm font-bold text-[#0F172A]">
                    {selectedSession.status === "active"
                      ? `This session started at ${formatClockTime(selectedSession.check_in_at)}.`
                      : selectedSession.status === "completed"
                        ? `This session ended at ${formatClockTime(selectedSession.check_out_at)}.`
                        : "Start the session when the caregiver begins care."}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {selectedSession.status === "active"
                      ? "Use quick actions below to add care updates while the session is live."
                      : selectedSession.status === "completed"
                        ? "Timer is reset after session completion."
                        : "CareOS will save actual start and end times."}
                  </p>
                </div>

                <div className="mt-6 rounded-[28px] border border-blue-100 bg-[#FFFFFF] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">
                        Care Actions
                      </p>
                      <h3 className="mt-1 text-xl font-black text-[#0F172A]">
                        Add updates during care
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#64748B]">
                      {selectedLogs.length} updates
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {quickEvents.map((event) => (
                      <button
                        key={event.type}
                        onClick={() => handleSessionAction(event)}
                        disabled={
                          selectedSession.status === "completed" ||
                          selectedSession.status === "cancelled"
                        }
                        className={`rounded-[22px] border p-4 text-left transition ${selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : activeActionType === event.type ? "border-blue-200 bg-blue-50 shadow-sm" : "border-blue-100 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/40"}`}
                      >
                        <div className="text-2xl">{event.icon}</div>
                        <p className="mt-3 text-sm font-black text-[#0F172A]">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {event.mode === "instant" ? "Add now" : "Add details"}
                        </p>
                      </button>
                    ))}
                    <label
                      className={`rounded-[22px] border p-4 text-left transition ${uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : "cursor-pointer border-blue-100 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/40"}`}
                    >
                      <div className="text-2xl">📷</div>
                      <p className="mt-3 text-sm font-black text-[#0F172A]">
                        Moment
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Share Moment
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={
                          uploadingPhoto ||
                          selectedSession.status === "completed" ||
                          selectedSession.status === "cancelled"
                        }
                        onChange={handleSessionPhotoUpload}
                        multiple
                        className="hidden"
                      />
                    </label>
                  </div>
                  {quickEvents.map((event) => {
                    if (
                      activeActionType !== event.type ||
                      event.mode === "instant"
                    )
                      return null;
                    return (
                      <div
                        key={`${event.type}-inline`}
                        className="mt-4 rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm"
                      >
                        {event.mode === "input" ? (
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <input
                              value={actionValue}
                              onChange={(inputEvent) =>
                                setActionValue(inputEvent.target.value)
                              }
                              placeholder={event.prompt}
                              className="rounded-2xl border border-blue-100 bg-[#FFFFFF] p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                            />
                            <button
                              onClick={() =>
                                saveSessionAction(event, actionValue)
                              }
                              className="rounded-2xl bg-[#2563EB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">
                              Select mood
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {event.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() =>
                                    saveSessionAction(event, option)
                                  }
                                  className="rounded-full border border-blue-100 bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#0F172A] transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <button
                    onClick={() => router.push("/messages")}
                    className="rounded-[22px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:bg-white"
                  >
                    <div className="text-2xl">💬</div>
                    <p className="mt-3 text-sm font-black text-[#0F172A]">
                      Message
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Chat with caregiver
                    </p>
                  </button>
                  <button
                    onClick={() => router.push("/care-log")}
                    className="rounded-[22px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:bg-white"
                  >
                    <div className="text-2xl">📝</div>
                    <p className="mt-3 text-sm font-black text-[#0F172A]">
                      Care Log
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Care updates
                    </p>
                  </button>
                  <button
                    onClick={() => router.push("/photos")}
                    className="rounded-[22px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:bg-white"
                  >
                    <div className="text-2xl">📷</div>
                    <p className="mt-3 text-sm font-black text-[#0F172A]">
                      Moments
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {getSessionStats(selectedSession.id).photos} moments
                    </p>
                  </button>
                  <button
                    onClick={generateSessionSummary}
                    className="rounded-[22px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:bg-white"
                  >
                    <div className="text-2xl">🤖</div>
                    <p className="mt-3 text-sm font-black text-[#0F172A]">
                      Daily Story
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Warm recap
                    </p>
                  </button>
                </div>
              </section>
            )}

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">
                      AI Daily Story
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">
                      Today&apos;s story draft
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      Creates a warm, family-facing story from care moments,
                      updates and messages.
                    </p>
                  </div>
                  <button
                    onClick={generateSessionSummary}
                    disabled={generatingSummary}
                    className={`rounded-full px-5 py-3 text-xs font-bold text-white shadow-sm transition ${generatingSummary ? "cursor-not-allowed bg-slate-300" : "bg-[#2563EB] shadow-blue-100 hover:bg-[#1D4ED8]"}`}
                  >
                    {generatingSummary ? "Generating..." : "Generate Story"}
                  </button>
                </div>
                <div className="mt-6 rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-blue-100">
                  {selectedSession.summary ? (
                    <p className="text-sm leading-7 text-[#0F172A]">
                      {selectedSession.summary}
                    </p>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl">🤖</div>
                      <p className="mt-3 text-sm font-bold text-[#0F172A]">
                        No story yet.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#64748B]">
                        Add care moments, updates or messages, then
                        create the first Daily Story.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] bg-white/80 p-4 shadow-sm">
                    <p className="text-2xl font-black text-[#2563EB]">
                      {selectedLogs.length}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#64748B]">
                      Care updates
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/80 p-4 shadow-sm">
                    <p className="text-2xl font-black text-[#22C55E]">
                      {selectedPhotos.length}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#64748B]">
                      Moments
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/80 p-4 shadow-sm">
                    <p className="text-2xl font-black text-violet-700">
                      {selectedMessages.length}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#64748B]">
                      Messages
                    </p>
                  </div>
                </div>
              </section>
            )}

            {selectedSession && selectedDependent && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">
                      Moments
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">
                      Share a Moment
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                    {selectedPhotos.length} moments
                  </span>
                </div>
                <div className="mt-6 rounded-[28px] bg-[#F8FAFC] p-5">
                  <p className="text-sm font-semibold text-[#64748B]">
                    Share a photo and a short update with the family.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <textarea
                      value={photoCaption}
                      onChange={(event) => setPhotoCaption(event.target.value)}
                      placeholder="What's happening right now?"
                      className="min-h-24 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                    />
                    <label
                      className={`cursor-pointer rounded-2xl px-5 py-4 text-center text-sm font-black text-white shadow-lg transition ${uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed bg-slate-300 shadow-none" : "bg-[#2563EB] shadow-blue-200 hover:bg-[#1D4ED8]"}`}
                    >
                      {uploadingPhoto ? "Uploading..." : "Add Photo Update"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={
                          uploadingPhoto ||
                          selectedSession.status === "completed" ||
                          selectedSession.status === "cancelled"
                        }
                        onChange={handleSessionPhotoUpload}
                        multiple
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {selectedPhotos.length === 0 ? (
                  <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                    <div className="text-5xl">📷</div>
                    <p className="mt-4 font-semibold text-[#0F172A]">
                      No moments shared yet
                    </p>
                    <p className="mt-2 text-sm text-[#64748B]">
                      Share photos and updates from the care session.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedPhotos.slice(0, 6).map((photo) => (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-[26px] border border-blue-100 bg-[#FFFFFF] shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"
                      >
                        <a
                          href={photo.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={photo.url || ""}
                            alt={photo.caption || "Moment photo"}
                            className="h-40 w-full object-cover"
                          />
                        </a>
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-black text-[#0F172A]">
                              {photo.caption || "Moment update"}
                            </p>
                            <p className="shrink-0 text-xs font-semibold text-[#64748B]">
                              {formatClockTime(photo.created_at)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-[#64748B]">
                            Moment
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">
                      Today&apos;s Care Story
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">
                      Today&apos;s care story
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      A warm, simple recap of each moment shared during this
                      session.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/ai-summary")}
                    className="rounded-full bg-[#2563EB] px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-100"
                  >
                    AI Summary
                  </button>
                </div>
                {sessionTimeline.length === 0 ? (
                  <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                    <div className="text-5xl">🫶</div>
                    <p className="mt-4 text-lg font-black text-[#0F172A]">
                      No care updates yet.
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">
                      As updates are shared, today&apos;s story will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-7 rounded-[30px] bg-gradient-to-b from-blue-50/80 to-emerald-50/70 p-4 sm:p-5">
                    <div className="space-y-5">
                      {sessionTimeline.map((item, index) => {
                        const styles = careStoryColorStyles[item.color];
                        return (
                          <article
                            key={`${item.kind}-${item.id}`}
                            className="relative flex gap-4"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`z-10 flex h-14 w-14 items-center justify-center rounded-[22px] text-2xl shadow-sm ring-1 ${styles.icon}`}
                              >
                                {item.icon}
                              </div>
                              {index < sessionTimeline.length - 1 && (
                                <div
                                  className={`mt-2 h-full min-h-10 w-1 rounded-full bg-gradient-to-b ${styles.connector}`}
                                />
                              )}
                            </div>
                            <div
                              className={`relative flex-1 rounded-[30px] border p-5 shadow-sm ${styles.card} sm:p-6`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <p className="text-lg font-black text-[#0F172A]">
                                  {item.title}
                                </p>
                                <time
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${styles.time}`}
                                >
                                  {formatClockTime(item.time)}
                                </time>
                              </div>
                              <div className="mt-3">
                                {item.photoUrls && item.photoUrls.length > 0 && (
                                  <a
                                    href={item.photoUrls[0]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-[26px] border border-white bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                  >
                                    <img
                                      src={item.photoUrls[0]}
                                      alt={item.photoAlt || "Moment"}
                                      className="h-44 w-full object-cover sm:h-56"
                                    />
                                  </a>
                                )}
                                <p
                                  className={`leading-6 text-[#0F172A] ${
                                    item.photoUrls && item.photoUrls.length > 0
                                      ? "mt-4 text-base font-black"
                                      : "text-sm font-semibold"
                                  }`}
                                >
                                  {item.note}
                                </p>
                                {item.detail && (
                                  <p className="mt-2 text-sm font-black text-[#64748B]">
                                    {item.detail}
                                  </p>
                                )}
                                {item.identity && (
                                  <p className="mt-4 inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-[#64748B] ring-1 ring-white/80">
                                    {item.identity}
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
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
              className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-[#64748B]"
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
