"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

type Family = { id: string; name: string };
type Dependent = { id: string; family_id: string; type: DependentType; name: string; photo_url: string | null };

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
  kind: "system" | "log" | "photo";
};

const navItems = [
  { label: "Home", icon: "⌂", href: "/dashboard" },
  { label: "Schedule", icon: "▣", href: "/schedule" },
  { label: "Care Log", icon: "□", href: "/care-log" },
  { label: "AI Summary", icon: "✦", href: "/ai-summary" },
  { label: "Profile", icon: "♙", href: "/profile" },
];

const quickEvents = [
  { type: "meal", title: "Meal", icon: "🍽️", note: "Meal completed.", mode: "input", prompt: "What did they eat?" },
  { type: "medicine", title: "Medicine", icon: "💊", note: "Medicine given.", mode: "input", prompt: "What was given?" },
  { type: "sleep_start", title: "Start Sleep", icon: "🌙", note: "Sleep started.", mode: "instant" },
  { type: "sleep_end", title: "End Sleep", icon: "☀️", note: "Sleep ended.", mode: "instant" },
  { type: "mood", title: "Mood", icon: "😊", note: "Mood checked.", mode: "select", options: ["Happy", "Calm", "Tired", "Upset", "Sick"] },
  { type: "activity", title: "Activity", icon: "🌳", note: "Activity completed.", mode: "instant" },
  { type: "note", title: "Note", icon: "📝", note: "Care note added.", mode: "instant" },
] as const;

const typeConfig: Record<DependentType, { label: string; icon: string; avatar: string; defaultTitle: string; caregiver: string }> = {
  child: { label: "Child", icon: "👶", avatar: "bg-blue-50 text-[#1E5BFF]", defaultTitle: "Nanny Visit", caregiver: "Anna Johnson" },
  pet: { label: "Pet", icon: "🐾", avatar: "bg-emerald-50 text-[#22A06B]", defaultTitle: "Dog Walk", caregiver: "Mike Walker" },
  elder: { label: "Elder", icon: "🧓", avatar: "bg-violet-50 text-violet-700", defaultTitle: "Care Visit", caregiver: "Sophie Martin" },
};

const statusStyles: Record<SessionStatus, string> = {
  scheduled: "bg-blue-50 text-[#1E5BFF]",
  active: "bg-emerald-50 text-[#22A06B]",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-[#E5484D]",
};

function CareOSLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1E5BFF] to-[#35B779] text-[34px] font-black leading-none text-white shadow-lg shadow-blue-100">∞</div>
      <div>
        <div className="text-xl font-black tracking-tight text-[#102033]">CareOS</div>
        <div className="hidden text-xs font-medium text-[#6B7A90] sm:block">Connected care for your family</div>
      </div>
    </div>
  );
}

function getDisplayName(email?: string) {
  if (!email) return "Tigran";
  if (email.toLowerCase().includes("tigerkazaryan")) return "Tigran";
  const first = email.split("@")[0];
  if (first.toLowerCase() === "mail") return "Tigran";
  return first.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatClockTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
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

function getDurationSeconds(session: CareSession | null, nowMs: number) {
  if (!session || session.status !== "active" || !session.check_in_at) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(session.check_in_at).getTime()) / 1000));
}

function getPlannedDurationSeconds(session: CareSession | null) {
  if (!session?.starts_at || !session?.ends_at) return 0;
  return Math.max(0, Math.floor((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 1000));
}

function getRemainingSeconds(session: CareSession | null, nowMs: number) {
  if (!session || session.status === "completed" || session.status === "cancelled") return 0;
  const planned = getPlannedDurationSeconds(session);
  if (planned <= 0) return 0;
  if (session.status === "active" && session.check_in_at) {
    const elapsed = Math.max(0, Math.floor((nowMs - new Date(session.check_in_at).getTime()) / 1000));
    return Math.max(0, planned - elapsed);
  }
  return planned;
}

function getCareStoryLogDetails(log: CareLog): Pick<TimelineItem, "icon" | "title" | "note"> {
  const value = log.value?.trim();
  const note = log.note?.trim();

  if (log.type === "sleep") {
    if (value === "start") return { icon: "🌙", title: "Sleep started", note: note || "Rest time began." };
    if (value === "end") return { icon: "☀️", title: "Sleep ended", note: note || "Rest time ended." };
    return { icon: "🌙", title: "Sleep", note: note || (value ? `Sleep: ${value}` : "Sleep update added.") };
  }

  if (log.type === "meal") return { icon: "🍽️", title: "Meal", note: note || (value ? `Ate: ${value}` : "Meal update added.") };
  if (log.type === "medicine") return { icon: "💊", title: "Medicine", note: note || (value ? `Given: ${value}` : "Medicine update added.") };
  if (log.type === "mood") return { icon: "😊", title: "Mood", note: note || (value ? `Mood: ${value}` : "Mood update added.") };

  const event = quickEvents.find((quickEvent) => quickEvent.type === log.type);
  return { icon: event?.icon || "📝", title: log.title || event?.title || "Care update", note: note || value || "Care update added." };
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
  const dependentName = dependent?.name || "The dependent";
  const caregiverName = session.caregiver_name || "The caregiver";
  const sessionTitle = session.title || "care session";
  const completedText = session.status === "completed" ? "The session was completed successfully." : "The session is still in progress.";
  const logTitles = logs.map((log) => log.title || log.type).filter(Boolean);
  const importantLogs = logTitles.length > 0 ? `${dependentName} had updates for ${logTitles.slice(0, 6).join(", ").toLowerCase()}.` : `${dependentName} did not have detailed care log updates yet.`;
  const photoText = photos.length === 1 ? "One photo report was uploaded during the session." : photos.length > 1 ? `${photos.length} photo reports were uploaded during the session.` : "No photo reports were uploaded yet.";
  const messageText = messages.length > 0 ? `${messages.length} chat message${messages.length === 1 ? " was" : "s were"} exchanged during this care session.` : "No session messages were exchanged yet.";
  const timingText = session.check_in_at && session.check_out_at ? `Actual care time was from ${formatClockTime(session.check_in_at)} to ${formatClockTime(session.check_out_at)}.` : session.check_in_at ? `Care started at ${formatClockTime(session.check_in_at)}.` : `The session is scheduled for ${formatDateTime(session.starts_at)}.`;
  return `${sessionTitle} summary: ${caregiverName} cared for ${dependentName}. ${timingText} ${importantLogs} ${photoText} ${messageText} ${completedText}`;
}

export default function CareSessionsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | undefined>("");
  const [userId, setUserId] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [newDependentId, setNewDependentId] = useState("");
  const [newStartsAt, setNewStartsAt] = useState(toDatetimeLocalValue(new Date()));
  const [newEndsAt, setNewEndsAt] = useState(toDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
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

  async function loadSessions() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setUserId(userData.user.id);
    setEmail(userData.user.email);

    const { data: familyData } = await supabase.from("families").select("id, name").eq("owner_id", userData.user.id).maybeSingle();
    if (!familyData) {
      router.push("/dashboard");
      return;
    }

    setFamily(familyData);

    const { data: dependentsData } = await supabase.from("dependents").select("id, family_id, type, name, photo_url").eq("family_id", familyData.id).in("type", ["child", "pet", "elder"]).order("created_at", { ascending: false });
    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) => ["child", "pet", "elder"].includes(item.type));
    setDependents(loadedDependents);
    if (loadedDependents.length > 0) setNewDependentId((current) => current || loadedDependents[0].id);

    const { data: sessionsData } = await supabase.from("care_sessions").select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at").eq("family_id", familyData.id).order("created_at", { ascending: false });
    const loadedSessions = (sessionsData || []) as CareSession[];
    setSessions(loadedSessions);

    const activeSession = loadedSessions.find((session) => session.status === "active") || loadedSessions[0] || null;
    if (activeSession) setSelectedSessionId((current) => current || activeSession.id);

    const sessionIds = loadedSessions.map((item) => item.id);
    if (sessionIds.length > 0) {
      const { data: logsData } = await supabase.from("care_logs").select("id, family_id, dependent_id, care_session_id, type, title, note, value, created_at").in("care_session_id", sessionIds).order("created_at", { ascending: false });
      setCareLogs((logsData || []) as CareLog[]);

      const { data: photosData } = await supabase.from("photos").select("id, family_id, dependent_id, care_session_id, url, storage_path, caption, created_at, created_by").in("care_session_id", sessionIds).order("created_at", { ascending: false });
      setPhotos((photosData || []) as Photo[]);

      const { data: messagesData } = await supabase.from("care_messages").select("id, family_id, dependent_id, care_session_id, sender_role, sender_name, body, message_type, created_at").in("care_session_id", sessionIds).order("created_at", { ascending: true });
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

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();
  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId) || sessions[0] || null, [selectedSessionId, sessions]);
  const selectedDependent = useMemo(() => (selectedSession ? dependents.find((dependent) => dependent.id === selectedSession.dependent_id) || null : null), [dependents, selectedSession]);
  const selectedLogs = useMemo(() => (selectedSession ? careLogs.filter((log) => log.care_session_id === selectedSession.id) : []), [careLogs, selectedSession]);
  const selectedPhotos = useMemo(() => (selectedSession ? photos.filter((photo) => photo.care_session_id === selectedSession.id) : []), [photos, selectedSession]);
  const selectedMessages = useMemo(() => (selectedSession ? careMessages.filter((item) => item.care_session_id === selectedSession.id) : []), [careMessages, selectedSession]);

  const sessionTimeline = useMemo(() => {
    if (!selectedSession) return [];
    const items: TimelineItem[] = [];
    if (selectedSession.check_in_at) items.push({ id: "session-started", time: selectedSession.check_in_at, icon: "💚", title: "Care started", note: `${selectedSession.caregiver_name || "Caregiver"} checked in and began caring for ${selectedDependent?.name || "your loved one"}.`, kind: "system" });
    selectedLogs.forEach((log) => items.push({ id: log.id, time: log.created_at, ...getCareStoryLogDetails(log), kind: "log" }));
    selectedPhotos.forEach((photo) => items.push({ id: photo.id, time: photo.created_at, icon: "📷", title: "Photo Report", note: photo.caption?.trim() || "A new photo report was shared.", kind: "photo" }));
    if (selectedSession.check_out_at) items.push({ id: "session-ended", time: selectedSession.check_out_at, icon: "🏡", title: "Care ended", note: "Care session was completed and everyone is all set.", kind: "system" });
    return items.sort((a, b) => (a.time ? new Date(a.time).getTime() : 0) - (b.time ? new Date(b.time).getTime() : 0));
  }, [selectedDependent?.name, selectedLogs, selectedPhotos, selectedSession]);

  const activeSessions = sessions.filter((session) => session.status === "active").length;
  const scheduledSessions = sessions.filter((session) => session.status === "scheduled").length;
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const selectedDuration = getDurationSeconds(selectedSession, nowMs);
  const selectedRemaining = getRemainingSeconds(selectedSession, nowMs);

  function getDependent(dependentId: string) {
    return dependents.find((dependent) => dependent.id === dependentId) || null;
  }

  function getSessionStats(sessionId: string) {
    return { logs: careLogs.filter((log) => log.care_session_id === sessionId).length, photos: photos.filter((photo) => photo.care_session_id === sessionId).length };
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

    const { data, error } = await supabase.from("care_sessions").insert({
      family_id: family.id,
      dependent_id: dependent.id,
      title: config.defaultTitle,
      care_type: dependent.type === "child" ? "child_care" : dependent.type === "pet" ? "pet_care" : "elder_care",
      caregiver_name: newCaregiver.trim() || config.caregiver,
      status: "scheduled",
      starts_at: newStartsAt ? new Date(newStartsAt).toISOString() : null,
      ends_at: newEndsAt ? new Date(newEndsAt).toISOString() : null,
      instructions: newInstructions.trim() || null,
      created_by: userId || null,
    }).select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at").single();

    if (error) return setMessage(error.message);
    const newSession = data as CareSession;
    setSessions([newSession, ...sessions]);
    setSelectedSessionId(newSession.id);
    setNewInstructions("");
    setNewCaregiver("");
    setMessage("Care session created.");
  }

  async function updateSessionStatus(session: CareSession, nextStatus: SessionStatus) {
    setMessage("");
    const updates: Partial<CareSession> = { status: nextStatus };
    if (nextStatus === "active") {
      updates.check_in_at = new Date().toISOString();
      updates.check_out_at = null;
    }
    if (nextStatus === "completed") updates.check_out_at = new Date().toISOString();
    if (nextStatus === "scheduled") {
      updates.check_in_at = null;
      updates.check_out_at = null;
    }

    const { data, error } = await supabase.from("care_sessions").update(updates).eq("id", session.id).select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at").single();
    if (error) return setMessage(error.message);
    const updated = data as CareSession;
    setSessions(sessions.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedSessionId(updated.id);
    setMessage(nextStatus === "active" ? "Session started. Timer is running." : nextStatus === "completed" ? "Session ended. Timer stopped." : `Session marked as ${nextStatus}.`);
  }

  async function handleSessionPhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (!family || !selectedSession || !selectedDependent) return setMessage("Select a care session first.");
    if (selectedSession.status === "completed" || selectedSession.status === "cancelled") {
      setMessage("This session is completed. Start a new session to upload photos.");
      event.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${family.id}/${selectedDependent.id}/${selectedSession.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("care-photos").upload(storagePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      setUploadingPhoto(false);
      setMessage(uploadError.message);
      event.target.value = "";
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("care-photos").getPublicUrl(storagePath);
    const { data: photoData, error: photoError } = await supabase.from("photos").insert({
      family_id: family.id,
      dependent_id: selectedDependent.id,
      care_session_id: selectedSession.id,
      url: publicUrlData.publicUrl,
      storage_path: storagePath,
      caption: photoCaption.trim() || "Session photo update",
      created_by: userId || null,
    }).select("id, family_id, dependent_id, care_session_id, url, storage_path, caption, created_at, created_by").single();

    setUploadingPhoto(false);
    event.target.value = "";
    if (photoError) return setMessage(photoError.message);
    setPhotos([photoData as Photo, ...photos]);
    setPhotoCaption("");
    setMessage("Photo uploaded and attached to session timeline.");
  }

  async function saveSessionAction(event: (typeof quickEvents)[number], value = "") {
    setMessage("");
    if (!family || !selectedSession || !selectedDependent) return setMessage("Select a care session first.");
    if (selectedSession.status === "completed" || selectedSession.status === "cancelled") return setMessage("This session is completed. Start a new session to add updates.");

    const trimmedValue = value.trim();
    if ((event.mode === "input" || event.mode === "select") && !trimmedValue) return setMessage("Please add a value before saving this update.");

    const logType = event.type === "sleep_start" || event.type === "sleep_end" ? "sleep" : event.type;
    const note = event.type === "meal" && trimmedValue ? `Ate: ${trimmedValue}` : event.type === "medicine" && trimmedValue ? `Given: ${trimmedValue}` : event.type === "mood" && trimmedValue ? `Mood: ${trimmedValue}` : event.note;
    const logValue = event.type === "sleep_start" ? "start" : event.type === "sleep_end" ? "end" : trimmedValue || null;

    const { data, error } = await supabase.from("care_logs").insert({
      family_id: family.id,
      dependent_id: selectedDependent.id,
      care_session_id: selectedSession.id,
      child_id: selectedDependent.type === "child" ? selectedDependent.id : null,
      type: logType,
      title: event.title,
      note,
      value: logValue,
      created_by: userId || null,
    }).select("id, family_id, dependent_id, care_session_id, type, title, note, value, created_at").single();

    if (error) return setMessage(error.message);
    setCareLogs([data as CareLog, ...careLogs]);
    setActiveActionType(null);
    setActionValue("");
    setMessage(`${event.title} added to session timeline.`);
  }

  function handleSessionAction(event: (typeof quickEvents)[number]) {
    if (event.mode === "input" || event.mode === "select") {
      setMessage("");
      setActiveActionType((current) => (current === event.type ? null : event.type));
      setActionValue("");
      return;
    }

    void saveSessionAction(event);
  }

  async function generateSessionSummary() {
    setMessage("");
    if (!selectedSession) return setMessage("Select a care session first.");
    setGeneratingSummary(true);
    const summaryText = buildSessionSummaryText({ session: selectedSession, dependent: selectedDependent, logs: selectedLogs, photos: selectedPhotos, messages: selectedMessages });
    const { data, error } = await supabase.from("care_sessions").update({ summary: summaryText }).eq("id", selectedSession.id).select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, check_in_at, check_out_at, instructions, summary, created_at").single();
    setGeneratingSummary(false);
    if (error) return setMessage(error.message);
    const updated = data as CareSession;
    setSessions(sessions.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedSessionId(updated.id);
    setMessage("AI summary generated and saved.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#6B7A90]">Loading Care Sessions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] pb-28 text-[#102033]">
      <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-left"><CareOSLogo /></button>
          <div className="hidden items-center gap-2 rounded-full bg-[#F7FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button key={item.label} onClick={() => router.push(item.href)} className="rounded-full px-4 py-2 text-xs font-semibold text-[#6B7A90] transition hover:bg-white hover:text-[#1E5BFF]">{item.label}</button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setAccountMenuOpen((open) => !open)} className="flex items-center gap-3 rounded-[22px] bg-white px-3 py-2 pr-4 shadow-sm ring-1 ring-blue-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E5BFF] to-[#35B779] text-sm font-bold text-white">{initials}</div>
              <div className="hidden text-left sm:block"><p className="text-sm font-semibold text-[#102033]">{displayName}</p><p className="max-w-[190px] truncate text-xs text-[#6B7A90]">{email}</p></div>
              <span className="text-xs text-[#6B7A90]">⌄</span>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button onClick={handleLogout} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#E5484D] transition hover:bg-red-50">Sign Out<span>↗</span></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <button onClick={() => router.push("/dashboard")} className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F7FAFC] text-[#102033] transition hover:bg-blue-50 hover:text-[#1E5BFF]">←</button>
            <p className="text-sm font-semibold text-[#6B7A90]">Care Sessions</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#102033]">Live care center</h1>
            <p className="mt-3 text-base leading-7 text-[#6B7A90]">Start a care session, add one-tap updates, and keep the full timeline in one place.</p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-emerald-50 p-4"><p className="text-3xl font-black text-[#22A06B]">{activeSessions}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Active</p></div>
              <div className="rounded-[24px] bg-blue-50 p-4"><p className="text-3xl font-black text-[#1E5BFF]">{scheduledSessions}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Scheduled</p></div>
              <div className="rounded-[24px] bg-slate-100 p-4"><p className="text-3xl font-black text-slate-600">{completedSessions}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Completed</p></div>
            </div>

            <div className="mt-7 rounded-[28px] bg-[#F7FAFC] p-5">
              <p className="text-sm font-semibold text-[#6B7A90]">Create session</p>
              <div className="mt-4 grid gap-3">
                <select value={newDependentId} onChange={(event) => setNewDependentId(event.target.value)} className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold outline-none transition focus:border-[#1E5BFF]">
                  {dependents.map((dependent) => <option key={dependent.id} value={dependent.id}>{dependent.name} · {typeConfig[dependent.type].label}</option>)}
                </select>
                <input value={newCaregiver} onChange={(event) => setNewCaregiver(event.target.value)} placeholder="Caregiver name" className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="datetime-local" value={newStartsAt} onChange={(event) => setNewStartsAt(event.target.value)} className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" />
                  <input type="datetime-local" value={newEndsAt} onChange={(event) => setNewEndsAt(event.target.value)} className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" />
                </div>
                <textarea value={newInstructions} onChange={(event) => setNewInstructions(event.target.value)} placeholder="Instructions: medicine, feeding, routines, emergency notes..." className="min-h-24 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" />
                <button onClick={createSession} className="rounded-2xl bg-[#1E5BFF] p-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Create Care Session</button>
                {message && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22A06B]">{message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-[#6B7A90]">Sessions</p><h2 className="mt-1 text-3xl font-black text-[#102033]">Today&apos;s care</h2></div>
                <span className="rounded-full bg-[#F7FAFC] px-4 py-2 text-xs font-semibold text-[#6B7A90]">{family?.name || "Family"}</span>
              </div>

              {sessions.length === 0 ? (
                <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center"><div className="text-5xl">🫶</div><p className="mt-4 font-semibold text-[#102033]">No care sessions yet.</p><p className="mt-2 text-sm text-[#6B7A90]">Create the first session to track start, end and care timeline.</p></div>
              ) : (
                <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const dependent = getDependent(session.dependent_id);
                      const config = dependent ? typeConfig[dependent.type] : null;
                      const stats = getSessionStats(session.id);
                      return (
                        <button key={session.id} onClick={() => setSelectedSessionId(session.id)} className={`w-full rounded-[28px] border p-4 text-left transition ${selectedSessionId === session.id ? "border-blue-200 bg-blue-50/70 shadow-sm" : "border-blue-100 bg-[#FBFDFF] hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"}`}>
                          <div className="flex items-start gap-4">
                            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] text-2xl ${config?.avatar || "bg-blue-50"}`}>{config?.icon || "🫶"}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-black text-[#102033]">{session.title || "Care Session"}</p><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[session.status]}`}>{session.status}</span></div>
                              <p className="mt-1 text-xs font-semibold text-[#1E5BFF]">{dependent?.name || "Dependent"}</p>
                              <p className="mt-1 text-xs text-[#6B7A90]">{formatDateTime(session.starts_at)}</p>
                              <p className="mt-2 text-xs text-[#6B7A90]">{stats.logs} logs · {stats.photos} photos</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedSession && selectedDependent && (
                    <div className="rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedSession.status]}`}>{selectedSession.status === "active" && <span className="h-2 w-2 rounded-full bg-[#22A06B]" />}{selectedSession.status}</span><h3 className="mt-4 text-3xl font-black text-[#102033]">{selectedSession.title || "Care Session"}</h3><p className="mt-2 text-sm text-[#6B7A90]">{selectedSession.caregiver_name || "Caregiver"} with {selectedDependent.name}</p></div>
                        <button onClick={() => router.push(`/dependent/${selectedDependent.id}`)} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#6B7A90] shadow-sm transition hover:text-[#1E5BFF]">Profile</button>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm"><p className="text-xs font-semibold text-[#6B7A90]">Start Time</p><p className="mt-1 text-sm font-black text-[#102033]">{formatClockTime(selectedSession.starts_at)}</p></div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm"><p className="text-xs font-semibold text-[#6B7A90]">End Time</p><p className="mt-1 text-sm font-black text-[#102033]">{formatClockTime(selectedSession.ends_at)}</p></div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm"><p className="text-xs font-semibold text-[#6B7A90]">Actual Start</p><p className="mt-1 text-sm font-black text-[#102033]">{formatClockTime(selectedSession.check_in_at)}</p></div>
                        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm"><p className="text-xs font-semibold text-[#6B7A90]">Actual End</p><p className="mt-1 text-sm font-black text-[#102033]">{formatClockTime(selectedSession.check_out_at)}</p></div>
                      </div>
                      {selectedSession.instructions && <div className="mt-5 rounded-[24px] bg-white/90 p-5 shadow-sm"><p className="text-sm font-black text-[#102033]">Instructions</p><p className="mt-2 text-sm leading-6 text-[#6B7A90]">{selectedSession.instructions}</p></div>}
                    </div>
                  )}
                </div>
              )}
            </section>

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-[#102033]">Session Timer</h2>
                  {selectedSession.status === "active" && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#22A06B]"><span className="h-2 w-2 rounded-full bg-[#22A06B]" />LIVE</span>}
                </div>

                <div className="mt-8 text-center">
                  <div className="text-6xl font-black tracking-tight text-[#102033] md:text-7xl">{formatDuration(selectedDuration)}</div>
                  <p className="mt-3 text-sm font-semibold text-[#6B7A90]">elapsed time</p>
                  <div className="mt-6 text-2xl font-black tracking-wide text-slate-400 md:text-3xl">{formatDuration(selectedRemaining)}</div>
                  <p className="mt-2 text-sm font-semibold text-slate-400">remaining time</p>
                </div>

                {selectedSession.status === "active" ? (
                  <button onClick={() => updateSessionStatus(selectedSession, "completed")} className="mt-8 w-full rounded-[22px] bg-[#E5484D] p-5 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600">■ End Session</button>
                ) : (
                  <button onClick={() => updateSessionStatus(selectedSession, "active")} disabled={selectedSession.status === "completed" || selectedSession.status === "cancelled"} className={`mt-8 w-full rounded-[22px] p-5 text-sm font-black text-white shadow-lg transition ${selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed bg-slate-300 shadow-none" : "bg-[#35B779] shadow-emerald-100 hover:bg-[#22A06B]"}`}>▶ Start Session</button>
                )}

                <div className="mt-6 rounded-[24px] bg-blue-50 p-5">
                  <p className="text-sm font-bold text-[#102033]">{selectedSession.status === "active" ? `This session started at ${formatClockTime(selectedSession.check_in_at)}.` : selectedSession.status === "completed" ? `This session ended at ${formatClockTime(selectedSession.check_out_at)}.` : "Start the session when the caregiver begins care."}</p>
                  <p className="mt-1 text-sm text-[#6B7A90]">{selectedSession.status === "active" ? "Use quick actions below to add care updates while the session is live." : selectedSession.status === "completed" ? "Timer is reset after session completion." : "CareOS will save actual start and end times."}</p>
                </div>

                <div className="mt-6 rounded-[28px] border border-blue-100 bg-[#FBFDFF] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#6B7A90]">Session Actions</p><h3 className="mt-1 text-xl font-black text-[#102033]">Add updates during care</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6B7A90]">{selectedLogs.length} logs</span></div>
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {quickEvents.map((event) => (
                      <button key={event.type} onClick={() => handleSessionAction(event)} disabled={selectedSession.status === "completed" || selectedSession.status === "cancelled"} className={`rounded-[22px] border p-4 text-left transition ${selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : activeActionType === event.type ? "border-blue-200 bg-blue-50 shadow-sm" : "border-blue-100 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/40"}`}>
                        <div className="text-2xl">{event.icon}</div><p className="mt-3 text-sm font-black text-[#102033]">{event.title}</p><p className="mt-1 text-xs text-[#6B7A90]">{event.mode === "instant" ? "Add now" : "Add details"}</p>
                      </button>
                    ))}
                    <label className={`rounded-[22px] border p-4 text-left transition ${uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : "cursor-pointer border-blue-100 bg-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/40"}`}>
                      <div className="text-2xl">📷</div><p className="mt-3 text-sm font-black text-[#102033]">Photo</p><p className="mt-1 text-xs text-[#6B7A90]">Upload report</p>
                      <input type="file" accept="image/*" disabled={uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled"} onChange={handleSessionPhotoUpload} className="hidden" />
                    </label>
                  </div>
                  {quickEvents.map((event) => {
                    if (activeActionType !== event.type || event.mode === "instant") return null;
                    return (
                      <div key={`${event.type}-inline`} className="mt-4 rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm">
                        {event.mode === "input" ? (
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <input value={actionValue} onChange={(inputEvent) => setActionValue(inputEvent.target.value)} placeholder={event.prompt} className="rounded-2xl border border-blue-100 bg-[#FBFDFF] p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" />
                            <button onClick={() => saveSessionAction(event, actionValue)} className="rounded-2xl bg-[#1E5BFF] px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Save</button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-[#102033]">Select mood</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {event.options.map((option) => (
                                <button key={option} onClick={() => saveSessionAction(event, option)} className="rounded-full border border-blue-100 bg-[#FBFDFF] px-4 py-2 text-xs font-bold text-[#102033] transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1E5BFF]">{option}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <button onClick={() => router.push("/messages")} className="rounded-[22px] border border-blue-100 bg-[#FBFDFF] p-4 text-left transition hover:bg-white"><div className="text-2xl">💬</div><p className="mt-3 text-sm font-black text-[#102033]">Message</p><p className="mt-1 text-xs text-[#6B7A90]">Chat with caregiver</p></button>
                  <button onClick={() => router.push("/care-log")} className="rounded-[22px] border border-blue-100 bg-[#FBFDFF] p-4 text-left transition hover:bg-white"><div className="text-2xl">📝</div><p className="mt-3 text-sm font-black text-[#102033]">Care Log</p><p className="mt-1 text-xs text-[#6B7A90]">Detailed updates</p></button>
                  <button onClick={() => router.push("/photos")} className="rounded-[22px] border border-blue-100 bg-[#FBFDFF] p-4 text-left transition hover:bg-white"><div className="text-2xl">📷</div><p className="mt-3 text-sm font-black text-[#102033]">Photos</p><p className="mt-1 text-xs text-[#6B7A90]">{getSessionStats(selectedSession.id).photos} photos</p></button>
                  <button onClick={generateSessionSummary} className="rounded-[22px] border border-blue-100 bg-[#FBFDFF] p-4 text-left transition hover:bg-white"><div className="text-2xl">🤖</div><p className="mt-3 text-sm font-black text-[#102033]">Summary</p><p className="mt-1 text-xs text-[#6B7A90]">Generate report</p></button>
                </div>
              </section>
            )}

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-sm font-semibold text-[#6B7A90]">AI Session Summary</p><h2 className="mt-1 text-2xl font-black text-[#102033]">Care report draft</h2><p className="mt-2 text-sm leading-6 text-[#6B7A90]">Generates a parent-friendly report from timeline, care logs, photo reports and messages.</p></div>
                  <button onClick={generateSessionSummary} disabled={generatingSummary} className={`rounded-full px-5 py-3 text-xs font-bold text-white shadow-sm transition ${generatingSummary ? "cursor-not-allowed bg-slate-300" : "bg-[#1E5BFF] shadow-blue-100 hover:bg-blue-700"}`}>{generatingSummary ? "Generating..." : "Generate Summary"}</button>
                </div>
                <div className="mt-6 rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-blue-100">{selectedSession.summary ? <p className="text-sm leading-7 text-[#102033]">{selectedSession.summary}</p> : <div className="text-center"><div className="text-4xl">🤖</div><p className="mt-3 text-sm font-bold text-[#102033]">No summary yet.</p><p className="mt-2 text-sm leading-6 text-[#6B7A90]">Add care events, photo reports or messages, then generate the first session summary.</p></div>}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-[22px] bg-white/80 p-4 shadow-sm"><p className="text-2xl font-black text-[#1E5BFF]">{selectedLogs.length}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Care logs</p></div><div className="rounded-[22px] bg-white/80 p-4 shadow-sm"><p className="text-2xl font-black text-[#22A06B]">{selectedPhotos.length}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Photo reports</p></div><div className="rounded-[22px] bg-white/80 p-4 shadow-sm"><p className="text-2xl font-black text-violet-700">{selectedMessages.length}</p><p className="mt-1 text-xs font-semibold text-[#6B7A90]">Messages</p></div></div>
              </section>
            )}

            {selectedSession && selectedDependent && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#6B7A90]">Photo Reports</p><h2 className="mt-1 text-2xl font-black text-[#102033]">Session photo reports</h2></div><span className="rounded-full bg-[#F7FAFC] px-4 py-2 text-xs font-semibold text-[#6B7A90]">{selectedPhotos.length} photos</span></div>
                <div className="mt-6 rounded-[28px] bg-[#F7FAFC] p-5"><p className="text-sm font-semibold text-[#6B7A90]">Photos uploaded during this care session</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Caption: lunch, playground, walk, medicine..." className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#1E5BFF]" /><label className={`cursor-pointer rounded-2xl px-5 py-4 text-center text-sm font-black text-white shadow-lg transition ${uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled" ? "cursor-not-allowed bg-slate-300 shadow-none" : "bg-[#1E5BFF] shadow-blue-200 hover:bg-blue-700"}`}>{uploadingPhoto ? "Uploading..." : "+ Upload Photo"}<input type="file" accept="image/*" disabled={uploadingPhoto || selectedSession.status === "completed" || selectedSession.status === "cancelled"} onChange={handleSessionPhotoUpload} className="hidden" /></label></div></div>
                {selectedPhotos.length === 0 ? <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center"><div className="text-5xl">📷</div><p className="mt-4 font-semibold text-[#102033]">No session photos yet.</p><p className="mt-2 text-sm text-[#6B7A90]">Upload photos during the care session.</p></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{selectedPhotos.slice(0, 6).map((photo) => <article key={photo.id} className="overflow-hidden rounded-[26px] border border-blue-100 bg-[#FBFDFF] shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"><a href={photo.url || "#"} target="_blank" rel="noreferrer"><img src={photo.url || ""} alt={photo.caption || "Session photo"} className="h-40 w-full object-cover" /></a><div className="p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-[#102033]">{photo.caption || "Session photo"}</p><p className="shrink-0 text-xs font-semibold text-[#6B7A90]">{formatClockTime(photo.created_at)}</p></div><p className="mt-1 text-xs text-[#6B7A90]">Photo report</p></div></article>)}</div>}
              </section>
            )}

            {selectedSession && (
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#6B7A90]">Session Timeline</p><h2 className="mt-1 text-2xl font-black text-[#102033]">Today&apos;s care story</h2><p className="mt-2 text-sm leading-6 text-[#6B7A90]">A warm, simple recap of each moment shared during this session.</p></div><button onClick={() => router.push("/ai-summary")} className="rounded-full bg-[#1E5BFF] px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-100">AI Summary</button></div>
                {sessionTimeline.length === 0 ? <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center"><div className="text-5xl">🫶</div><p className="mt-4 font-semibold text-[#102033]">No care story yet.</p><p className="mt-2 text-sm text-[#6B7A90]">Start the session or add a quick care event to build the story.</p></div> : <div className="mt-7 rounded-[30px] bg-gradient-to-b from-blue-50/80 to-emerald-50/70 p-4 sm:p-5"><div className="space-y-5">{sessionTimeline.map((item, index) => <article key={`${item.kind}-${item.id}`} className="relative flex gap-4"><div className="flex flex-col items-center"><div className="z-10 flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm ring-1 ring-blue-100">{item.icon}</div>{index < sessionTimeline.length - 1 && <div className="mt-2 h-full min-h-10 w-1 rounded-full bg-gradient-to-b from-blue-100 to-emerald-100" />}</div><div className="flex-1 rounded-[26px] border border-blue-100 bg-white/95 p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-base font-black text-[#102033]">{item.title}</p><p className="mt-2 text-sm leading-6 text-[#6B7A90]">{item.note}</p></div><time className="rounded-full bg-[#F7FAFC] px-3 py-1 text-xs font-bold text-[#1E5BFF]">{formatClockTime(item.time)}</time></div></div></article>)}</div></div>}
              </section>
            )}
          </section>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">{navItems.map((item) => <button key={item.label} onClick={() => router.push(item.href)} className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-[#6B7A90]"><div className="text-lg leading-5">{item.icon}</div><div className="mt-1">{item.label}</div></button>)}</div>
      </nav>
    </main>
  );
}
