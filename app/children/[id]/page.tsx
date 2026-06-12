"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Child = {
  id: string;
  name: string;
  birth_date: string | null;
  notes: string | null;
  photo_url: string | null;
};

type CareLog = {
  id: string;
  type: string;
  note: string;
  created_at: string;
};

export default function ChildProfilePage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [logType, setLogType] = useState("Meal");
  const [logNote, setLogNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function loadChild() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/sign-in");
        return;
      }

      const { data: childData } = await supabase
        .from("children")
        .select("id, name, birth_date, notes, photo_url")
        .eq("id", childId)
        .single();

      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, type, note, created_at")
        .eq("child_id", childId)
        .order("created_at", { ascending: false });

      setChild(childData);
      setCareLogs(logsData || []);
      setLoading(false);
    }

    loadChild();
  }, [childId, router]);

  function getAge(birthDate: string | null) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return careLogs.filter(
      (log) => new Date(log.created_at).toDateString() === today
    );
  }, [careLogs]);

  const latestLog = careLogs[0] || null;
  const mealsToday = todayLogs.filter((log) => log.type === "Meal").length;
  const napsToday = todayLogs.filter((log) => log.type === "Nap").length;
  const medicineToday = todayLogs.filter((log) => log.type === "Medicine").length;
  const activitiesToday = todayLogs.filter((log) => log.type === "Activity").length;

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage("");

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }

    setUploadingPhoto(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${childId}-${Date.now()}.${fileExt}`;
    const filePath = `children/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("child-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("child-photos")
      .getPublicUrl(filePath);

    const photoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { data, error: updateError } = await supabase
      .from("children")
      .update({ photo_url: photoUrl })
      .eq("id", childId)
      .select("id, name, birth_date, notes, photo_url")
      .single();

    if (updateError) {
      setMessage(updateError.message);
      setUploadingPhoto(false);
      return;
    }

    setChild(data);
    setMessage("Photo uploaded.");
    setUploadingPhoto(false);
  }

  async function handleAddLog() {
    setMessage("");

    if (!logNote.trim()) {
      setMessage("Please enter a note.");
      return;
    }

    const { data, error } = await supabase
      .from("care_logs")
      .insert({
        child_id: childId,
        type: logType,
        note: logNote,
      })
      .select("id, type, note, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setCareLogs([data, ...careLogs]);
    setLogNote("");
    setMessage("Care log added.");
  }

  async function handleDeleteLog(logId: string) {
    const { error } = await supabase.from("care_logs").delete().eq("id", logId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCareLogs(careLogs.filter((log) => log.id !== logId));
    setMessage("Care log deleted.");
  }

  function getLogIcon(type: string) {
    switch (type) {
      case "Meal":
        return "🍽️";
      case "Nap":
        return "😴";
      case "Medicine":
        return "💊";
      case "Activity":
        return "🎨";
      default:
        return "📝";
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FBFF]">
        <div className="rounded-[28px] bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-medium text-slate-500">Loading child profile...</p>
        </div>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FBFF]">
        <div className="rounded-[28px] bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-medium text-slate-500">Child not found.</p>
        </div>
      </main>
    );
  }

  const age = getAge(child.birth_date);

  return (
    <main className="min-h-screen bg-[#F8FBFF] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-blue-100/60 bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-blue-700"
          >
            ← Dashboard
          </button>

          <div className="flex items-center gap-3">
            <img src="/careos-logo.svg" alt="CareOS" className="h-10 w-10" />
            <div className="text-lg font-medium text-slate-900">CareOS</div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[42px] bg-gradient-to-br from-white via-blue-50/70 to-teal-50 p-8 shadow-xl shadow-blue-100/50 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {child.photo_url ? (
                  <img
                    src={child.photo_url}
                    alt={child.name}
                    className="h-36 w-36 rounded-[34px] object-cover shadow-xl shadow-blue-100 ring-4 ring-white"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-[34px] bg-white text-6xl shadow-xl shadow-blue-100 ring-4 ring-white">
                    👶
                  </div>
                )}

                <div>
                  <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-medium text-blue-700 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100">
                    Child profile
                  </div>

                  <h1 className="mt-5 text-5xl font-medium tracking-tight text-slate-950">
                    {child.name}
                  </h1>

                  <p className="mt-3 text-base text-slate-500">
                    {age !== null ? `${age} years old` : "Family member"}
                    {child.birth_date ? ` · Born ${child.birth_date}` : ""}
                  </p>

                  <label className="mt-7 inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => router.push(`/children/${childId}/growth`)}
              className="rounded-[32px] bg-white p-6 text-left shadow-sm shadow-blue-100/60 ring-1 ring-blue-100 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/70"
            >
              <p className="text-sm font-medium text-slate-500">Growth</p>
              <p className="mt-2 text-3xl font-medium text-blue-600">Track progress</p>
            </button>

            <button
              onClick={() => router.push(`/children/${childId}/vaccinations`)}
              className="rounded-[32px] bg-white p-6 text-left shadow-sm shadow-teal-100/60 ring-1 ring-teal-100 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-100/70"
            >
              <p className="text-sm font-medium text-slate-500">Vaccinations</p>
              <p className="mt-2 text-3xl font-medium text-teal-600">Health record</p>
            </button>

            <button
              onClick={() => router.push(`/assistant?childId=${childId}`)}
              className="rounded-[32px] bg-gradient-to-br from-blue-600 to-teal-500 p-6 text-left text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1"
            >
              <p className="text-sm font-medium text-white/75">AI Assistant</p>
              <p className="mt-2 text-3xl font-medium">Ask CareOS</p>
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {[
            ["Meals", mealsToday, "🍽️"],
            ["Naps", napsToday, "😴"],
            ["Medicine", medicineToday, "💊"],
            ["Activities", activitiesToday, "🎨"],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-[30px] bg-white p-6 shadow-sm shadow-blue-100/50 ring-1 ring-blue-50">
              <div className="text-2xl">{icon}</div>
              <p className="mt-4 text-sm font-medium text-slate-500">{label} today</p>
              <p className="mt-1 text-4xl font-medium text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[34px] bg-white p-8 shadow-lg shadow-blue-100/40 ring-1 ring-blue-50">
            <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600">
              New care entry
            </div>

            <h2 className="mt-5 text-2xl font-medium text-slate-950">Add Care Log</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Record meals, naps, medicine, activities or general notes.
            </p>

            <select
              className="mt-6 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
              value={logType}
              onChange={(event) => setLogType(event.target.value)}
            >
              <option>Meal</option>
              <option>Nap</option>
              <option>Medicine</option>
              <option>Activity</option>
              <option>Note</option>
            </select>

            <textarea
              placeholder="Example: Had lunch, drank water, and felt happy."
              className="mt-4 min-h-32 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              value={logNote}
              onChange={(event) => setLogNote(event.target.value)}
            />

            <button
              onClick={handleAddLog}
              className="mt-4 w-full rounded-2xl bg-blue-600 p-4 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              Add Entry
            </button>

            {message && (
              <p className="mt-4 rounded-2xl bg-teal-50 p-4 text-sm font-medium text-teal-700">
                {message}
              </p>
            )}
          </div>

          <div className="rounded-[34px] bg-white p-8 shadow-lg shadow-blue-100/40 ring-1 ring-blue-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-teal-50 px-4 py-2 text-xs font-medium text-teal-600">
                  Today and recent
                </div>
                <h2 className="mt-5 text-2xl font-medium text-slate-950">Care Timeline</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Recent care activity and notes.
                </p>
              </div>
            </div>

            {careLogs.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                <div className="text-5xl">📝</div>
                <p className="mt-4 text-base font-medium text-slate-700">No care logs yet.</p>
                <p className="mt-2 text-sm text-slate-500">Add the first entry to start the timeline.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {careLogs.map((log) => (
                  <div key={log.id} className="rounded-[28px] bg-[#F8FBFF] p-5 ring-1 ring-blue-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm shadow-blue-100/50">
                          {getLogIcon(log.type)}
                        </div>
                        <div>
                          <h3 className="text-base font-medium text-slate-950">{log.type}</h3>
                          <p className="mt-1 text-xs font-medium text-slate-400">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                      {log.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {child.notes && (
          <div className="mt-8 rounded-[34px] bg-white p-8 shadow-sm shadow-blue-100/50 ring-1 ring-blue-50">
            <div className="inline-flex rounded-full bg-teal-50 px-4 py-2 text-xs font-medium text-teal-600">
              Important notes
            </div>
            <p className="mt-5 text-base leading-7 text-slate-600">{child.notes}</p>
          </div>
        )}
      </section>
    </main>
  );
}
