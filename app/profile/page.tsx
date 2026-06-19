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
  notes: string | null;
  created_at: string;
};

type CareLog = {
  id: string;
  dependent_id: string | null;
};

type Photo = {
  id: string;
  dependent_id: string | null;
};

type OwnerProfile = {
  displayName: string;
  avatarUrl: string;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  { label: string; icon: string; avatar: string; chip: string }
> = {
  child: {
    label: "Child",
    icon: "👶",
    avatar: "bg-blue-50 text-[#2563EB]",
    chip: "bg-blue-50 text-[#2563EB]",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
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

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>({
    displayName: "",
    avatarUrl: "",
  });

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setEmail(userData.user.email);

    const metadataName =
      typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name
        : typeof userData.user.user_metadata?.display_name === "string"
          ? userData.user.user_metadata.display_name
          : "";
    const avatarUrl =
      typeof userData.user.user_metadata?.avatar_url === "string" ? userData.user.user_metadata.avatar_url : "";

    setOwnerProfile({
      displayName: metadataName.trim() || getDisplayName(userData.user.email),
      avatarUrl,
    });

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
      .select("id, family_id, type, name, photo_url, date_of_birth, notes, created_at")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    const dependentIds = loadedDependents.map((item) => item.id);

    if (dependentIds.length > 0) {
      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, dependent_id")
        .in("dependent_id", dependentIds)
        .limit(200);

      setCareLogs((logsData || []) as CareLog[]);
    } else {
      setCareLogs([]);
    }

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, dependent_id")
      .eq("family_id", familyData.id)
      .limit(200);

    setPhotos((photosData || []) as Photo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(
    () => ownerProfile.displayName.trim() || getDisplayName(email),
    [email, ownerProfile.displayName]
  );
  const initials = displayName.slice(0, 1).toUpperCase();

  const counts = useMemo(() => {
    return dependents.reduce(
      (acc, item) => {
        acc[item.type] += 1;
        return acc;
      },
      { child: 0, pet: 0, elder: 0 } as Record<DependentType, number>
    );
  }, [dependents]);

  function getDependentStats(dependentId: string) {
    return {
      logs: careLogs.filter((log) => log.dependent_id === dependentId).length,
      photos: photos.filter((photo) => photo.dependent_id === dependentId).length,
    };
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Profile...</p>
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
                  item.label === "Profile"
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
              {ownerProfile.avatarUrl ? (
                <img src={ownerProfile.avatarUrl} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                  {initials}
                </div>
              )}
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
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-start gap-5">
                {ownerProfile.avatarUrl ? (
                  <img
                    src={ownerProfile.avatarUrl}
                    alt={displayName}
                    className="h-24 w-24 shrink-0 rounded-[30px] object-cover shadow-lg shadow-blue-100"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-4xl font-black text-white shadow-lg shadow-blue-100">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#64748B]">Owner account</p>
                  <h1 className="mt-1 truncate text-4xl font-black tracking-tight text-[#0F172A]">{displayName}</h1>
                  <p className="mt-2 truncate text-sm text-[#64748B]">{email}</p>
                </div>
                <button
                  onClick={() => router.push("/profile/edit")}
                  className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-blue-100"
                >
                  Edit Profile
                </button>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="rounded-[24px] bg-blue-50 p-4 text-center">
                  <p className="text-3xl font-black text-[#2563EB]">{counts.child}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Kids</p>
                </div>
                <div className="rounded-[24px] bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-black text-[#22C55E]">{counts.pet}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Pets</p>
                </div>
                <div className="rounded-[24px] bg-violet-50 p-4 text-center">
                  <p className="text-3xl font-black text-violet-700">{counts.elder}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Elders</p>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#64748B]">CareOS Health</p>
              <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Workspace status</h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-3xl font-black text-[#0F172A]">{dependents.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Dependents</p>
                </div>
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-3xl font-black text-[#0F172A]">{careLogs.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Care logs</p>
                </div>
                <div className="rounded-[24px] bg-[#F8FAFC] p-4">
                  <p className="text-3xl font-black text-[#0F172A]">{photos.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Photos</p>
                </div>
                <div className="rounded-[24px] bg-emerald-50 p-4">
                  <p className="text-xl font-black text-[#22C55E]">Healthy</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">Status</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">My Family</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Dependents</h2>
                </div>
                <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                  {family?.name || "Family"}
                </span>
              </div>

              <button
                onClick={() => router.push("/profile/family")}
                className="mt-6 rounded-[28px] bg-[#F8FAFC] p-5 text-left ring-1 ring-blue-100 transition hover:bg-blue-50"
              >
                <p className="text-sm font-black text-[#0F172A]">Manage Family</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  Add, edit or remove children, pets and elders on the family management page.
                </p>
              </button>

              {dependents.length === 0 ? (
                <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                  <div className="text-5xl">💙</div>
                  <p className="mt-4 font-semibold text-[#0F172A]">No dependents yet.</p>
                  <p className="mt-2 text-sm text-[#64748B]">Add kids, pets or elders to your CareOS workspace.</p>
                </div>
              ) : (
                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  {dependents.map((dependent) => {
                    const config = typeConfig[dependent.type];
                    const stats = getDependentStats(dependent.id);
                    const age = getAge(dependent.date_of_birth);

                    return (
                      <article
                        key={dependent.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/dependent/${dependent.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            router.push(`/dependent/${dependent.id}`);
                          }
                        }}
                        className="group rounded-[30px] border border-blue-100 bg-[#FFFFFF] p-5 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {dependent.photo_url ? (
                            <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                          ) : (
                            <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl ${config.avatar}`}>
                              {config.icon}
                            </div>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}>
                            {config.label}
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-black text-[#0F172A]">{dependent.name}</h3>
                        <p className="mt-1 text-sm text-[#64748B]">
                          {age === null ? `${config.label} care profile` : `${age} years old`}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-lg font-black text-[#2563EB]">{stats.logs}</p>
                            <p className="text-xs text-[#64748B]">Logs</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-lg font-black text-[#22C55E]">{stats.photos}</p>
                            <p className="text-xs text-[#64748B]">Photos</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#64748B]">Quick Access</p>
              <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Family tools</h2>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button onClick={() => router.push("/schedule")} className="rounded-[24px] bg-[#2563EB] p-5 text-left text-white shadow-lg shadow-blue-200">
                  <div className="text-3xl">📅</div>
                  <p className="mt-4 text-sm font-bold">Schedule</p>
                  <p className="mt-1 text-xs text-white/80">Visits and bookings</p>
                </button>
                <button onClick={() => router.push("/care-log")} className="rounded-[24px] bg-[#22C55E] p-5 text-left text-white shadow-lg shadow-emerald-100">
                  <div className="text-3xl">📝</div>
                  <p className="mt-4 text-sm font-bold">Care Logs</p>
                  <p className="mt-1 text-xs text-white/80">Daily updates</p>
                </button>
                <button onClick={() => router.push("/photos")} className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-5 text-left transition hover:bg-white">
                  <div className="text-3xl">📷</div>
                  <p className="mt-4 text-sm font-bold text-[#0F172A]">Photos</p>
                  <p className="mt-1 text-xs text-[#64748B]">Photo reports</p>
                </button>
                <button className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-5 text-left transition hover:bg-white">
                  <div className="text-3xl">🤖</div>
                  <p className="mt-4 text-sm font-bold text-[#0F172A]">AI Summary</p>
                  <p className="mt-1 text-xs text-[#64748B]">Coming next</p>
                </button>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-lg shadow-blue-100/40">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🔐</div>
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Security</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Trusted care workspace</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Emergency contacts, caregiver permissions, documents and payment methods will live here in the next MVP phase.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${
                item.label === "Profile" ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"
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
