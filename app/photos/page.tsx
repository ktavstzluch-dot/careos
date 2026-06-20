"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

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
};

type Photo = {
  id: string;
  family_id: string;
  dependent_id: string | null;
  url: string;
  storage_path: string | null;
  caption: string | null;
  created_at: string;
  created_by: string | null;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<DependentType, { label: string; icon: string; avatar: string; chip: string }> = {
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

function formatDate(value: string | null) {
  if (!value) return "Today";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PhotosPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedDependentId, setSelectedDependentId] = useState("");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadPhotosPage() {
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

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    if (loadedDependents.length > 0) {
      setSelectedDependentId((current) => current || loadedDependents[0].id);
    }

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, family_id, dependent_id, url, storage_path, caption, created_at, created_by")
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: false })
      .limit(60);

    setPhotos((photosData || []) as Photo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPhotosPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = displayName.slice(0, 1).toUpperCase();

  const selectedDependent = useMemo(() => {
    return dependents.find((item) => item.id === selectedDependentId) || dependents[0] || null;
  }, [dependents, selectedDependentId]);

  const visiblePhotos = useMemo(() => {
    if (!selectedDependentId) return photos;
    return photos.filter((photo) => photo.dependent_id === selectedDependentId);
  }, [photos, selectedDependentId]);

  function getDependent(photo: Photo) {
    return dependents.find((dependent) => dependent.id === photo.dependent_id) || null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) return;

    if (!family) {
      setMessage("Family workspace not found.");
      return;
    }

    if (!selectedDependent) {
      setMessage("Please choose who this photo is for.");
      return;
    }

    setUploading(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${family.id}/${selectedDependent.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("care-photos")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setUploading(false);
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("care-photos").getPublicUrl(storagePath);

    const { data: photoData, error: photoError } = await supabase
      .from("photos")
      .insert({
        family_id: family.id,
        dependent_id: selectedDependent.id,
        url: publicUrlData.publicUrl,
        storage_path: storagePath,
        caption: caption.trim() || null,
        created_by: userId || null,
      })
      .select("id, family_id, dependent_id, url, storage_path, caption, created_at, created_by")
      .single();

    if (photoError) {
      setUploading(false);
      setMessage(photoError.message);
      return;
    }

    setPhotos([photoData as Photo, ...photos]);
    setCaption("");
    setUploading(false);
    setMessage("Photo uploaded.");
    event.target.value = "";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Photos...</p>
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
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
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
        <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
            >
              ←
            </button>

            <p className="text-sm font-semibold text-[#64748B]">Photo Reports</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care photos</h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              Upload visit photos and attach them to a child, pet or elder profile.
            </p>

            <div className="mt-7 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-semibold text-[#64748B]">Upload photo</p>

              <div className="mt-4 grid gap-3">
                <select
                  value={selectedDependentId}
                  onChange={(event) => setSelectedDependentId(event.target.value)}
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold outline-none transition focus:border-[#2563EB]"
                >
                  {dependents.map((dependent) => (
                    <option key={dependent.id} value={dependent.id}>
                      {dependent.name} · {typeConfig[dependent.type].label}
                    </option>
                  ))}
                </select>

                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Caption: park visit, lunch, walk, medicine..."
                  className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-[#2563EB]"
                />

                <label className="cursor-pointer rounded-2xl bg-[#2563EB] p-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]">
                  {uploading ? "Uploading..." : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>

                {message && (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#22C55E]">
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-blue-50 p-4">
                <p className="text-3xl font-black text-[#2563EB]">{photos.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Total photos</p>
              </div>
              <div className="rounded-[24px] bg-emerald-50 p-4">
                <p className="text-3xl font-black text-[#22C55E]">{visiblePhotos.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Selected</p>
              </div>
              <div className="rounded-[24px] bg-violet-50 p-4">
                <p className="text-3xl font-black text-violet-700">{dependents.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Profiles</p>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">Gallery</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">
                  {selectedDependent?.name || "CareOS"} photos
                </h2>
              </div>
              <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                {family?.name}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {dependents.map((dependent) => {
                const config = typeConfig[dependent.type];

                return (
                  <button
                    key={dependent.id}
                    onClick={() => setSelectedDependentId(dependent.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedDependentId === dependent.id
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                        : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                    }`}
                  >
                    <span>{config.icon}</span>
                    {dependent.name}
                  </button>
                );
              })}
            </div>

            {visiblePhotos.length === 0 ? (
              <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="text-5xl">📷</div>
                <p className="mt-4 font-semibold text-[#0F172A]">No photo reports yet.</p>
                <p className="mt-2 text-sm text-[#64748B]">
                  Upload the first care photo for {selectedDependent?.name || "this profile"}.
                </p>
              </div>
            ) : (
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePhotos.map((photo) => {
                  const dependent = getDependent(photo);
                  const config = dependent ? typeConfig[dependent.type] : null;

                  return (
                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-[30px] border border-blue-100 bg-[#FFFFFF] shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50"
                    >
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img src={photo.url} alt={photo.caption || "Care photo"} className="h-48 w-full object-cover" />
                      </a>

                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          {dependent && config && (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}>
                              {config.icon} {dependent.name}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-[#64748B]">
                            {formatDate(photo.created_at)}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#64748B]">
                          {photo.caption || "Care photo report"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-7 rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🤖</div>
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">AI Photo Summary</p>
                  <h3 className="mt-1 text-2xl font-black text-[#0F172A]">Coming next</h3>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    CareOS will summarize uploaded photos, connect them to care logs and prepare a daily family report.
                  </p>
                </div>
              </div>
            </div>
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
