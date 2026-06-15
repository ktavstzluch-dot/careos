"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
};

type Family = {
  id: string;
  name: string;
};

type ScheduleFilter = "all" | "child" | "pet" | "elder";

const filters: Array<{ value: ScheduleFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "child", label: "Kids" },
  { value: "pet", label: "Pets" },
  { value: "elder", label: "Elders" },
];

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Photos", icon: "\u25CD", href: "/photos" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  {
    label: string;
    icon: string;
    avatarClass: string;
    badgeClass: string;
    eventTitle: string;
    caregiver: string;
    time: string;
    status: "Confirmed" | "Pending";
  }
> = {
  child: {
    label: "Child",
    icon: "👶",
    avatarClass: "bg-blue-50 text-[#2563EB]",
    badgeClass: "bg-blue-50 text-[#2563EB]",
    eventTitle: "Nanny Visit",
    caregiver: "Anna Johnson",
    time: "3:00 PM – 7:00 PM",
    status: "Confirmed",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatarClass: "bg-emerald-50 text-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#22C55E]",
    eventTitle: "Dog Walk",
    caregiver: "Mike Walker",
    time: "6:00 PM – 7:00 PM",
    status: "Confirmed",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatarClass: "bg-violet-50 text-violet-700",
    badgeClass: "bg-violet-50 text-violet-700",
    eventTitle: "Care Visit",
    caregiver: "Sophie Martin",
    time: "7:00 PM – 8:00 PM",
    status: "Pending",
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

function getWeekDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 3);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      date: date.getDate(),
      active: date.toDateString() === today.toDateString(),
    };
  });
}

export default function SchedulePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadSchedule() {
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

    setDependents(((dependentsData || []) as Dependent[]).filter((item) => ["child", "pet", "elder"].includes(item.type)));
    setLoading(false);
  }

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();
  const weekDays = useMemo(() => getWeekDays(), []);

  const visibleDependents = useMemo(() => {
    if (activeFilter === "all") return dependents;
    return dependents.filter((dependent) => dependent.type === activeFilter);
  }, [activeFilter, dependents]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Schedule...</p>
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
                  item.label === "Schedule"
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
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
                >
                  ←
                </button>
                <p className="text-sm font-semibold text-[#64748B]">Schedule</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care calendar</h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-[#64748B]">
                  Upcoming care visits for kids, pets and elders.
                </p>
              </div>

              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-2xl font-bold text-white shadow-lg shadow-blue-200">
                +
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeFilter === filter.value
                      ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                      : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] bg-[#F8FAFC] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#0F172A]">
                  {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}
                </h2>
                <span className="text-lg text-[#64748B]">›</span>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {weekDays.map((item) => (
                  <button
                    key={`${item.day}-${item.date}`}
                    className={`rounded-2xl px-2 py-3 text-center transition ${
                      item.active ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200" : "bg-white text-[#64748B]"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.day}</div>
                    <div className="mt-2 text-sm font-black">{item.date}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-blue-50 p-4">
                <p className="text-3xl font-black text-[#2563EB]">{visibleDependents.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Events today</p>
              </div>
              <div className="rounded-[24px] bg-emerald-50 p-4">
                <p className="text-3xl font-black text-[#22C55E]">{visibleDependents.filter((item) => item.type !== "elder").length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Confirmed</p>
              </div>
              <div className="rounded-[24px] bg-violet-50 p-4">
                <p className="text-3xl font-black text-violet-700">{visibleDependents.filter((item) => item.type === "elder").length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Pending</p>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">Today</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Upcoming visits</h2>
              </div>
              <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                {family?.name}
              </span>
            </div>

            {visibleDependents.length === 0 ? (
              <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="text-5xl">📅</div>
                <p className="mt-4 font-semibold text-[#0F172A]">No visits scheduled.</p>
                <p className="mt-2 text-sm text-[#64748B]">Add a child, pet or elder to schedule care.</p>
              </div>
            ) : (
              <div className="mt-7 space-y-4">
                {visibleDependents.map((dependent) => {
                  const config = typeConfig[dependent.type];

                  return (
                    <article
                      key={dependent.id}
                      className="rounded-[30px] border border-blue-100 bg-[#FFFFFF] p-5 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50"
                    >
                      <div className="flex items-start gap-4">
                        {dependent.photo_url ? (
                          <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                        ) : (
                          <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl ${config.avatarClass}`}>
                            {config.icon}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-[#0F172A]">{config.eventTitle}</h3>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.badgeClass}`}>
                                  {config.label}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">{config.time}</p>
                              <p className="mt-1 text-sm text-[#64748B]">
                                Caregiver: {config.caregiver}
                              </p>
                              <p className="mt-1 text-sm text-[#64748B]">
                                For: {dependent.name}
                              </p>
                            </div>

                            <div className="text-right">
                              <div
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                  config.status === "Confirmed"
                                    ? "bg-emerald-50 text-[#22C55E]"
                                    : "bg-orange-50 text-orange-500"
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${config.status === "Confirmed" ? "bg-[#22C55E]" : "bg-orange-400"}`} />
                                {config.status}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button className="rounded-full bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-100">
                              Message
                            </button>
                            <button className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]">
                              View tasks
                            </button>
                            <button className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]">
                              Repeat weekly
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
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
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${
                item.label === "Schedule" ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"
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
