"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";
type ChatType = "caregiver" | "support" | "family";
type SenderRole = "parent" | "caregiver" | "support" | "system";

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
  caregiver_name: string | null;
  status: string;
};

type CareChat = {
  id: string;
  family_id: string;
  dependent_id: string | null;
  care_session_id: string | null;
  title: string;
  chat_type: ChatType;
  caregiver_name: string | null;
  caregiver_role: string | null;
  created_at: string;
};

type CareMessage = {
  id: string;
  chat_id: string;
  family_id: string;
  dependent_id: string | null;
  care_session_id: string | null;
  sender_role: SenderRole;
  sender_name: string | null;
  body: string;
  message_type: string;
  created_at: string;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Photos", icon: "\u25CD", href: "/photos" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const quickTemplates = [
  "We're running 15 minutes late.",
  "Please give medicine at 6 PM.",
  "Can you send a photo update?",
  "Can you stay one extra hour?",
  "Medicine given.",
  "Nap completed.",
];

const careUpdates = [
  { title: "Meal completed", icon: "🍽️", body: "Meal completed. Everything went well." },
  { title: "Nap completed", icon: "🌙", body: "Nap completed. Rest went well." },
  { title: "Medicine given", icon: "💊", body: "Medicine was given as instructed." },
  { title: "Photo uploaded", icon: "📷", body: "I uploaded a new photo update." },
];

const typeConfig: Record<DependentType, { label: string; icon: string; avatar: string; chip: string; role: string; caregiver: string }> = {
  child: {
    label: "Child",
    icon: "👶",
    avatar: "bg-blue-50 text-[#2563EB]",
    chip: "bg-blue-50 text-[#2563EB]",
    role: "Nanny",
    caregiver: "Anna Johnson",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
    role: "Dog Walker",
    caregiver: "Mike Walker",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
    role: "Elder Caregiver",
    caregiver: "Sophie Martin",
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

function getDisplayName(email?: string) {
  if (!email) return "Tigran";
  if (email.toLowerCase().includes("tigerkazaryan")) return "Tigran";
  const first = email.split("@")[0];
  if (first.toLowerCase() === "mail") return "Tigran";
  return first.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string | null) {
  if (!value) return "Now";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "Today";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getChatIcon(chat: CareChat, dependent: Dependent | null) {
  if (chat.chat_type === "support") return "💙";
  if (chat.chat_type === "family") return "👨‍👩‍👧";
  if (dependent) return typeConfig[dependent.type].icon;
  return "💬";
}

function getSenderLabel(role: SenderRole) {
  if (role === "parent") return "You";
  if (role === "caregiver") return "Caregiver";
  if (role === "support") return "Support";
  return "CareOS";
}

export default function MessagesPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [userId, setUserId] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [chats, setChats] = useState<CareChat[]>([]);
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadMessages() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setUserId(userData.user.id);
    setEmail(userData.user.email);

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
      .select("id, family_id, dependent_id, title, caregiver_name, status")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const loadedSessions = (sessionsData || []) as CareSession[];
    setSessions(loadedSessions);

    const { data: chatsData } = await supabase
      .from("care_chats")
      .select("id, family_id, dependent_id, care_session_id, title, chat_type, caregiver_name, caregiver_role, created_at")
      .eq("family_id", familyData.id)
      .order("updated_at", { ascending: false });

    let loadedChats = (chatsData || []) as CareChat[];

    if (loadedChats.length === 0) {
      loadedChats = await createStarterChats(familyData, loadedDependents, loadedSessions, userData.user.id);
    }

    setChats(loadedChats);

    if (loadedChats.length > 0) {
      setActiveChatId((current) => current || loadedChats[0].id);

      const { data: messagesData } = await supabase
        .from("care_messages")
        .select("id, chat_id, family_id, dependent_id, care_session_id, sender_role, sender_name, body, message_type, created_at")
        .in(
          "chat_id",
          loadedChats.map((chat) => chat.id)
        )
        .order("created_at", { ascending: true })
        .limit(300);

      setMessages((messagesData || []) as CareMessage[]);
    }

    setLoading(false);
  }

  async function createStarterChats(
    familyData: Family,
    loadedDependents: Dependent[],
    loadedSessions: CareSession[],
    currentUserId: string
  ) {
    const starterChats: Array<{
      family_id: string;
      dependent_id: string | null;
      care_session_id: string | null;
      title: string;
      chat_type: ChatType;
      caregiver_name: string | null;
      caregiver_role: string | null;
      created_by: string;
    }> = loadedDependents.slice(0, 4).map((dependent) => {
      const config = typeConfig[dependent.type];
      const session = loadedSessions.find((item) => item.dependent_id === dependent.id);

      return {
        family_id: familyData.id,
        dependent_id: dependent.id,
        care_session_id: session?.id || null,
        title: config.caregiver,
        chat_type: "caregiver",
        caregiver_name: config.caregiver,
        caregiver_role: `${config.role} for ${dependent.name}`,
        created_by: currentUserId,
      };
    });

    starterChats.push({
      family_id: familyData.id,
      dependent_id: null,
      care_session_id: null,
      title: "Family Group",
      chat_type: "family",
      caregiver_name: null,
      caregiver_role: "Shared family updates",
      created_by: currentUserId,
    });

    starterChats.push({
      family_id: familyData.id,
      dependent_id: null,
      care_session_id: null,
      title: "CareOS Support",
      chat_type: "support",
      caregiver_name: null,
      caregiver_role: "Help, billing and account questions",
      created_by: currentUserId,
    });

    const { data, error } = await supabase
      .from("care_chats")
      .insert(starterChats)
      .select("id, family_id, dependent_id, care_session_id, title, chat_type, caregiver_name, caregiver_role, created_at");

    if (error || !data) {
      return [];
    }

    const createdChats = data as CareChat[];

    const welcomeMessages = createdChats.map((chat) => ({
      chat_id: chat.id,
      family_id: familyData.id,
      dependent_id: chat.dependent_id,
      care_session_id: chat.care_session_id,
      sender_role: chat.chat_type === "support" ? "support" : chat.chat_type === "family" ? "system" : "caregiver",
      sender_name: chat.chat_type === "support" ? "CareOS Support" : chat.title,
      body:
        chat.chat_type === "support"
          ? "Welcome to CareOS. How can we help today?"
          : chat.chat_type === "family"
            ? "Family updates and shared care notes will appear here."
            : "Care chat is ready. I will keep updates here during the session.",
      message_type: "text",
      created_by: currentUserId,
    }));

    await supabase.from("care_messages").insert(welcomeMessages);

    return createdChats;
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();

  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
  }, [activeChatId, chats]);

  const activeDependent = useMemo(() => {
    if (!activeChat?.dependent_id) return null;
    return dependents.find((dependent) => dependent.id === activeChat.dependent_id) || null;
  }, [activeChat, dependents]);

  const activeSession = useMemo(() => {
    if (!activeChat?.care_session_id) return null;
    return sessions.find((session) => session.id === activeChat.care_session_id) || null;
  }, [activeChat, sessions]);

  const activeMessages = useMemo(() => {
    if (!activeChat) return [];
    return messages.filter((item) => item.chat_id === activeChat.id);
  }, [activeChat, messages]);

  function getLastMessage(chatId: string) {
    const list = messages.filter((item) => item.chat_id === chatId);
    return list[list.length - 1] || null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function sendMessage(body?: string, messageType = "text") {
    setMessage("");

    if (!family || !activeChat) {
      setMessage("No chat selected.");
      return;
    }

    const finalBody = (body || draft).trim();

    if (!finalBody) return;

    const { data, error } = await supabase
      .from("care_messages")
      .insert({
        chat_id: activeChat.id,
        family_id: family.id,
        dependent_id: activeChat.dependent_id,
        care_session_id: activeChat.care_session_id,
        sender_role: "parent",
        sender_name: displayName,
        body: finalBody,
        message_type: messageType,
        created_by: userId || null,
      })
      .select("id, chat_id, family_id, dependent_id, care_session_id, sender_role, sender_name, body, message_type, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessages([...messages, data as CareMessage]);
    setDraft("");

    await supabase.from("care_chats").update({ updated_at: new Date().toISOString() }).eq("id", activeChat.id);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Messages...</p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                {initials}
              </div>
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

            <p className="text-sm font-semibold text-[#64748B]">Messages</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care conversations</h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              Parent, caregiver, family and support messages connected to care sessions.
            </p>

            <div className="mt-7 space-y-3">
              {chats.map((chat) => {
                const dependent = chat.dependent_id ? dependents.find((item) => item.id === chat.dependent_id) || null : null;
                const lastMessage = getLastMessage(chat.id);

                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`flex w-full items-center gap-4 rounded-[26px] border p-4 text-left transition ${
                      activeChatId === chat.id
                        ? "border-blue-200 bg-blue-50/60 shadow-sm"
                        : "border-blue-100 bg-[#FFFFFF] hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">
                      {getChatIcon(chat, dependent)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-[#0F172A]">{chat.title}</p>
                        <p className="shrink-0 text-[11px] font-semibold text-[#64748B]">{formatShortDate(lastMessage?.created_at || chat.created_at)}</p>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-[#64748B]">
                        {chat.caregiver_role || (dependent ? `${typeConfig[dependent.type].label} care` : "CareOS chat")}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#2563EB]">
                        {lastMessage ? lastMessage.body : "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">💬</div>
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">CareOS Messages</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Session-aware chat</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Chats are now saved in Supabase and can be connected to dependents and care sessions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            {activeChat ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#F8FAFC] text-3xl shadow-sm">
                      {getChatIcon(activeChat, activeDependent)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#64748B]">
                        {activeSession ? `Session: ${activeSession.title || "Care Session"}` : "CareOS chat"}
                      </p>
                      <h2 className="mt-1 truncate text-3xl font-black text-[#0F172A]">{activeChat.title}</h2>
                      <p className="mt-1 text-sm text-[#64748B]">{activeChat.caregiver_role || "Private conversation"}</p>
                    </div>
                  </div>

                  {activeDependent && (
                    <button
                      onClick={() => router.push(`/dependent/${activeDependent.id}`)}
                      className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]"
                    >
                      Open profile
                    </button>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push("/photos")}
                    className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                  >
                    + Photo
                  </button>
                  <button
                    onClick={() => sendMessage("Voice note recorded.", "voice")}
                    className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                  >
                    + Voice Note
                  </button>
                  <button
                    onClick={() => sendMessage("Care update added.", "care_update")}
                    className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-[#22C55E] transition hover:bg-[#22C55E] hover:text-white"
                  >
                    + Care Update
                  </button>
                </div>

                <div className="mt-6 rounded-[32px] bg-[#F8FAFC] p-5">
                  {activeMessages.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                      <div className="text-4xl">💬</div>
                      <p className="mt-3 text-sm font-semibold text-[#0F172A]">No messages yet.</p>
                      <p className="mt-2 text-sm text-[#64748B]">Send the first update.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeMessages.map((item) => {
                        const isParent = item.sender_role === "parent";
                        const isSystem = item.sender_role === "system";

                        return (
                          <div key={item.id} className={`flex ${isParent ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[82%] rounded-[24px] px-5 py-4 shadow-sm ${
                                isParent
                                  ? "bg-[#2563EB] text-white"
                                  : isSystem
                                    ? "bg-emerald-50 text-[#0F172A]"
                                    : "bg-white text-[#0F172A] ring-1 ring-blue-100"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-4">
                                <p className={`text-[11px] font-bold ${isParent ? "text-white/75" : "text-[#64748B]"}`}>
                                  {item.sender_name || getSenderLabel(item.sender_role)}
                                </p>
                                <p className={`text-[11px] font-semibold ${isParent ? "text-white/65" : "text-[#64748B]"}`}>
                                  {formatTime(item.created_at)}
                                </p>
                              </div>
                              <p className="text-sm leading-6">{item.body}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#64748B]">Quick templates</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickTemplates.map((template) => (
                      <button
                        key={template}
                        onClick={() => sendMessage(template)}
                        className="rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-[#64748B]">Care update shortcuts</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {careUpdates.map((update) => (
                      <button
                        key={update.title}
                        onClick={() => sendMessage(`${update.icon} ${update.body}`, "care_update")}
                        className="rounded-[18px] border border-blue-100 bg-[#FFFFFF] px-4 py-3 text-left text-xs font-bold text-[#0F172A] transition hover:bg-white"
                      >
                        {update.icon} {update.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex gap-3 rounded-[28px] border border-blue-100 bg-[#FFFFFF] p-3">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-blue-100 focus:ring-[#2563EB]"
                  />
                  <button
                    onClick={() => sendMessage()}
                    className="rounded-2xl bg-[#22C55E] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-[#22C55E]"
                  >
                    Send
                  </button>
                </div>

                {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22C55E]">{message}</p>}
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="text-5xl">💬</div>
                <p className="mt-4 font-semibold text-[#0F172A]">No conversations yet.</p>
              </div>
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
