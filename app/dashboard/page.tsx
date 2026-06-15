"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
  legacy_child_id: string | null;
};

type CareLog = {
  id: string;
  dependent_id: string | null;
  type: string;
  title: string | null;
  note: string | null;
  created_at: string | null;
};

const categories: Array<{ type: DependentType; label: string; icon: string }> = [
  { type: "child", label: "Kids", icon: "👶" },
  { type: "pet", label: "Pets", icon: "🐾" },
  { type: "elder", label: "Elders", icon: "🧓" },
];

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Photos", icon: "\u25CD", href: "/photos" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<DependentType, { label: string; icon: string; care: string; chip: string; avatar: string }> = {
  child: {
    label: "Child",
    icon: "👶",
    care: "Nanny visit at 3:00 PM",
    chip: "bg-blue-50 text-[#2563EB]",
    avatar: "bg-blue-50 text-[#2563EB]",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    care: "Dog walk at 6:30 PM",
    chip: "bg-emerald-50 text-[#22C55E]",
    avatar: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    care: "Medication check at 7:00 PM",
    chip: "bg-violet-50 text-violet-700",
    avatar: "bg-violet-50 text-violet-700",
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
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | DependentType>("all");
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

    if (loadedDependents.length > 0) {
      const ids = loadedDependents.map((item) => item.id);

      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, dependent_id, type, title, note, created_at")
        .in("dependent_id", ids)
        .order("created_at", { ascending: false })
        .limit(8);

      setCareLogs((logsData || []) as CareLog[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();
  const greeting = useMemo(() => getGreeting(), []);

  const filteredDependents = useMemo(() => {
    if (activeFilter === "all") return dependents;
    return dependents.filter((item) => item.type === activeFilter);
  }, [activeFilter, dependents]);

  const counts = useMemo(() => {
    return dependents.reduce(
      (acc, item) => {
        acc[item.type] += 1;
        return acc;
      },
      { child: 0, pet: 0, elder: 0 } as Record<DependentType, number>
    );
  }, [dependents]);

  const latestLog = careLogs[0] || null;
  const summaryReadyDependent = dependents[0] || null;

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

  function openDependent(dependent: Dependent) {
    router.push(`/dependent/${dependent.id}`);
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
              <span className="text-xs text-[#64748B]">⌄</span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]"
                >
                  Profile
                  <span>→</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition hover:bg-red-50"
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
              One private operating system for kids, pets and elder care.
            </p>
            <input
              type="text"
              placeholder="Example: Kazaryan Family"
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
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-[#22C55E] shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  Today&apos;s care status
                </div>
                <p className="mt-6 text-base font-semibold text-[#64748B]">{greeting},</p>
                <h1 className="mt-1 text-5xl font-black tracking-tight text-[#0F172A]">{displayName} 👋</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-[#64748B]">
                  Everything is under control across kids, pets and elders.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      activeFilter === "all"
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                        : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => setActiveFilter(item.type)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                        activeFilter === item.type
                          ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                          : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-7 grid grid-cols-3 gap-3">
                  {categories.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => setActiveFilter(item.type)}
                      className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-4 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"
                    >
                      <div className="text-2xl">{item.icon}</div>
                      <p className="mt-3 text-3xl font-black text-[#0F172A]">{counts[item.type]}</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">{item.label}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
                <p className="text-sm font-semibold text-[#64748B]">Quick Actions</p>
                <h2 className="mt-1 text-2xl font-black text-[#0F172A]">What do you need?</h2>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button onClick={() => router.push("/schedule")} className="rounded-[24px] bg-[#2563EB] p-5 text-left text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1">
                    <div className="text-3xl">📅</div>
                    <p className="mt-4 text-sm font-bold">Book care</p>
                    <p className="mt-1 text-xs text-white/80">Schedule a visit</p>
                  </button>
                  <button onClick={() => router.push("/care-log")} className="rounded-[24px] bg-[#22C55E] p-5 text-left text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-1">
                    <div className="text-3xl">📝</div>
                    <p className="mt-4 text-sm font-bold">Care Log</p>
                    <p className="mt-1 text-xs text-white/80">Add update</p>
                  </button>
                  <button onClick={() => router.push("/ai-summary")} className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-5 text-left transition hover:bg-white">
                    <div className="text-3xl">🤖</div>
                    <p className="mt-4 text-sm font-bold text-[#0F172A]">AI Summary</p>
                    <p className="mt-1 text-xs text-[#64748B]">View daily reports</p>
                  </button>
                  <button onClick={() => router.push("/photos")} className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-5 text-left transition hover:bg-white">
                    <div className="text-3xl">📷</div>
                    <p className="mt-4 text-sm font-bold text-[#0F172A]">Photo reports</p>
                    <p className="mt-1 text-xs text-[#64748B]">Upload photos</p>
                  </button>
                </div>

                {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22C55E]">{message}</p>}
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">Today&apos;s Care</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Live overview</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E]">All good</span>
                </div>

                {filteredDependents.length === 0 ? (
                  <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                    <div className="text-5xl">💙</div>
                    <p className="mt-4 font-semibold text-[#0F172A]">Add your first dependent</p>
                    <p className="mt-2 text-sm text-[#64748B]">Kids, pets or elders.</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {filteredDependents.slice(0, 4).map((dependent) => {
                      const config = typeConfig[dependent.type];

                      return (
                        <button
                          key={dependent.id}
                          onClick={() => openDependent(dependent)}
                          className="flex w-full items-center gap-4 rounded-[26px] border border-slate-100 bg-[#FFFFFF] p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50"
                        >
                          {dependent.photo_url ? (
                            <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                          ) : (
                            <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl ${config.avatar}`}>
                              {config.icon}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-black text-[#0F172A]">{dependent.name}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.chip}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-[#64748B]">{config.care}</p>
                          </div>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">→</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-lg shadow-blue-100/40">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🤖</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#64748B]">AI Summary</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Daily report ready</h2>
                    <p className="mt-3 text-sm leading-6 text-[#64748B]">
                      {summaryReadyDependent
                        ? `${summaryReadyDependent.name}'s care logs and photos are ready for review.`
                        : "Add care logs and photos to generate daily reports."}
                    </p>
                    <button
                      onClick={() => router.push("/ai-summary")}
                      className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-100"
                    >
                      View AI Summary
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#64748B]">Latest Updates</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Care activity</h2>
                  </div>
                  <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                    {family.name}
                  </span>
                </div>

                {!latestLog ? (
                  <div className="mt-6 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
                    <div className="text-3xl">📝</div>
                    <p className="mt-2 text-sm font-semibold text-[#0F172A]">No care logs yet.</p>
                    <button onClick={() => router.push("/care-log")} className="mt-4 rounded-full bg-[#2563EB] px-5 py-2 text-xs font-bold text-white">
                      Add care log
                    </button>
                  </div>
                ) : (
                  <button onClick={() => router.push("/care-log")} className="mt-6 block w-full rounded-[26px] border border-slate-100 bg-[#FFFFFF] p-5 text-left transition hover:bg-white hover:shadow-lg hover:shadow-blue-100/50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">📝</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#0F172A]">{latestLog.title || latestLog.type}</p>
                          <p className="text-xs font-semibold text-[#64748B]">{formatTime(latestLog.created_at)}</p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#2563EB]">
                          {dependents.find((item) => item.id === latestLog.dependent_id)?.name || "CareOS"}
                        </p>
                        {latestLog.note && <p className="mt-2 text-sm leading-6 text-[#64748B]">{latestLog.note}</p>}
                      </div>
                    </div>
                  </button>
                )}
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
