"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAvatarUrlFromUser, getDisplayNameFromUser } from "@/lib/profile";

type Family = {
  id: string;
  name: string;
};

const PROFILE_PHOTO_BUCKETS = ["child-photos", "care-photos"];

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

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

function isMissingBucketError(error: { message?: string }) {
  const message = error.message?.toLowerCase() || "";
  return message.includes("bucket not found") || message.includes("bucket") && message.includes("not found");
}

async function uploadProfilePhoto(file: File, storagePath: string) {
  let lastError: { message?: string } | null = null;

  for (const bucket of PROFILE_PHOTO_BUCKETS) {
    const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return publicUrlData.publicUrl;
    }

    lastError = error;

    if (!isMissingBucketError(error)) {
      throw error;
    }
  }

  throw new Error(lastError?.message || "Profile photo bucket was not found.");
}

export default function EditProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const metadata = userData.user.user_metadata || {};
    const nextDisplayName = getDisplayNameFromUser(userData.user);

    setEmail(userData.user.email);
    setDisplayName(nextDisplayName);
    setGender(typeof metadata.gender === "string" ? metadata.gender : "");
    setDateOfBirth(typeof metadata.date_of_birth === "string" ? metadata.date_of_birth.slice(0, 10) : "");
    setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
    setCountry(typeof metadata.country === "string" ? metadata.country : "");
    setState(typeof metadata.state === "string" ? metadata.state : "");
    setCity(typeof metadata.city === "string" ? metadata.city : "");
    setZipCode(typeof metadata.zip_code === "string" ? metadata.zip_code : "");
    setStreetAddress(typeof metadata.street_address === "string" ? metadata.street_address : "");
    setAddressLine2(typeof metadata.address_line_2 === "string" ? metadata.address_line_2 : "");
    setAvatarUrl(getAvatarUrlFromUser(userData.user));
    setAvatarPreview("");
    setAvatarFile(null);

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
    setFamilyName(familyData.name);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!avatarFile) return;

    const nextPreview = URL.createObjectURL(avatarFile);
    setAvatarPreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [avatarFile]);

  const initials = useMemo(() => {
    return (displayName.trim() || getDisplayNameFromUser({ email })).slice(0, 1).toUpperCase();
  }, [displayName, email]);

  const avatarSrc = avatarPreview || avatarUrl;

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setMessage("");
    setMessageType(null);
  }

  async function handleSaveProfile() {
    setMessage("");
    setMessageType(null);

    const nextDisplayName = displayName.trim();
    const nextFamilyName = familyName.trim();

    if (!nextDisplayName) {
      setMessage("Please add your name.");
      setMessageType("error");
      return;
    }

    if (!nextFamilyName || !family) {
      setMessage("Please add a family name.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    let nextAvatarUrl = avatarUrl;

    if (avatarFile && userData.user) {
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${family.id}/owner/${userData.user.id}/profile-${Date.now()}-${safeName}`;

      try {
        nextAvatarUrl = await uploadProfilePhoto(avatarFile, storagePath);
      } catch (error) {
        setSaving(false);
        setMessage(error instanceof Error ? error.message : "Profile photo could not be uploaded.");
        setMessageType("error");
        return;
      }
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: nextDisplayName,
        display_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        state: state.trim() || null,
        city: city.trim() || null,
        zip_code: zipCode.trim() || null,
        street_address: streetAddress.trim() || null,
        address_line_2: addressLine2.trim() || null,
      },
    });

    if (authError) {
      setSaving(false);
      setMessage(authError.message);
      setMessageType("error");
      return;
    }

    const { error, count } = await supabase
      .from("families")
      .update({ name: nextFamilyName }, { count: "exact" })
      .eq("id", family.id);

    if (error) {
      setSaving(false);
      setMessage(error.message || "Family update failed.");
      setMessageType("error");
      return;
    }

    if (count === 0) {
      setSaving(false);
      setMessage("Family update failed.");
      setMessageType("error");
      return;
    }

    const { data: refreshedFamily, error: familyRefreshError } = await supabase
      .from("families")
      .select("id, name")
      .eq("id", family.id)
      .maybeSingle();

    if (familyRefreshError) {
      setSaving(false);
      setMessage(familyRefreshError.message || "Profile was saved, but the family details could not be refreshed.");
      setMessageType("error");
      return;
    }

    const { data: refreshedUserData } = await supabase.auth.getUser();
    const refreshedUser = refreshedUserData.user;
    const nextMetadata = refreshedUser?.user_metadata || {};
    const savedDisplayName = refreshedUser ? getDisplayNameFromUser(refreshedUser) : nextDisplayName;
    const savedAvatarUrl = refreshedUser ? getAvatarUrlFromUser(refreshedUser) : nextAvatarUrl;

    setFamily((refreshedFamily as Family) || { ...family, name: nextFamilyName });
    setDisplayName(savedDisplayName);
    setFamilyName(nextFamilyName);
    setAvatarUrl(savedAvatarUrl);
    setGender(typeof nextMetadata.gender === "string" ? nextMetadata.gender : gender);
    setDateOfBirth(typeof nextMetadata.date_of_birth === "string" ? nextMetadata.date_of_birth.slice(0, 10) : dateOfBirth);
    setPhone(typeof nextMetadata.phone === "string" ? nextMetadata.phone : phone.trim());
    setCountry(typeof nextMetadata.country === "string" ? nextMetadata.country : country.trim());
    setState(typeof nextMetadata.state === "string" ? nextMetadata.state : state.trim());
    setCity(typeof nextMetadata.city === "string" ? nextMetadata.city : city.trim());
    setZipCode(typeof nextMetadata.zip_code === "string" ? nextMetadata.zip_code : zipCode.trim());
    setStreetAddress(typeof nextMetadata.street_address === "string" ? nextMetadata.street_address : streetAddress.trim());
    setAddressLine2(typeof nextMetadata.address_line_2 === "string" ? nextMetadata.address_line_2 : addressLine2.trim());
    setAvatarFile(null);
    setAvatarPreview("");
    setMessage("Profile updated.");
    setMessageType("success");
    await loadProfile();
    setSaving(false);
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
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
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

      <section className="mx-auto max-w-4xl px-5 py-7 md:py-9">
        <button
          onClick={() => router.push("/profile")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          ←
        </button>

        <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <div className="overflow-hidden rounded-[30px] bg-[#F8FAFC] ring-1 ring-blue-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="h-28 w-28 object-cover" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-4xl font-black text-white">
                    {initials}
                  </div>
                )}
              </div>
              <label className="mt-3 block cursor-pointer rounded-full bg-blue-50 px-4 py-2 text-center text-xs font-bold text-[#2563EB] transition hover:bg-blue-100">
                Change photo
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#64748B]">Owner account</p>
              <h1 className="mt-1 text-3xl font-black text-[#0F172A]">Edit Profile</h1>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Keep your profile familiar and easy for your family to recognize.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#64748B]">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    placeholder="Your name"
                  />
                </label>
                <label className="text-xs font-bold text-[#64748B]">
                  Family name
                  <input
                    value={familyName}
                    onChange={(event) => setFamilyName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    placeholder="Hakobyan family"
                  />
                </label>
                <label className="text-xs font-bold text-[#64748B]">
                  Gender
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#64748B]">
                  Date of birth
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                  />
                </label>
              </div>

              <div className="mt-7 rounded-[28px] bg-[#F8FAFC] p-4 ring-1 ring-blue-100">
                <h2 className="text-sm font-black text-[#0F172A]">Contact Information</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#64748B]">
                    Email
                    <input
                      value={email || ""}
                      readOnly
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#64748B] outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B]">
                    Phone number
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="+1 555 000 0000"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] bg-[#F8FAFC] p-4 ring-1 ring-blue-100">
                <h2 className="text-sm font-black text-[#0F172A]">Home Address</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#64748B]">
                    Country
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="United States"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B]">
                    State
                    <input
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="California"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B]">
                    City
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="Los Angeles"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B]">
                    ZIP Code
                    <input
                      value={zipCode}
                      onChange={(event) => setZipCode(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="90001"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B] sm:col-span-2">
                    Street Address
                    <input
                      value={streetAddress}
                      onChange={(event) => setStreetAddress(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="123 Main Street"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#64748B] sm:col-span-2">
                    Apartment / Unit / Office
                    <input
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      placeholder="Apt 4B"
                    />
                  </label>
                </div>
              </div>

              {message && (
                <p
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    messageType === "error" ? "bg-red-50 text-[#EF4444]" : "bg-emerald-50 text-[#22C55E]"
                  }`}
                >
                  {message}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => router.push("/profile")}
                  disabled={saving}
                  className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#64748B] ring-1 ring-blue-100 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
