"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Child = {
  id: string;
  name: string;
  birth_date: string | null;
  photo_url: string | null;
};

type VaccinationStatus = "Completed" | "Upcoming" | "Overdue";

type Vaccination = {
  id: string;
  child_id: string;
  vaccine_name: string;
  status: VaccinationStatus;
  due_date: string | null;
  completed_date: string | null;
  provider: string | null;
  notes: string | null;
  created_at: string;
};

export default function VaccinationsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [vaccineName, setVaccineName] = useState("");
  const [status, setStatus] = useState<VaccinationStatus>("Upcoming");
  const [dueDate, setDueDate] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadVaccinations() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/sign-in");
        return;
      }

      const { data: childData } = await supabase
        .from("children")
        .select("id, name, birth_date, photo_url")
        .eq("id", childId)
        .single();

      const { data: vaccinationData } = await supabase
        .from("vaccinations")
        .select(
          "id, child_id, vaccine_name, status, due_date, completed_date, provider, notes, created_at"
        )
        .eq("child_id", childId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      setChild(childData);
      setVaccinations((vaccinationData || []) as Vaccination[]);
      setLoading(false);
    }

    loadVaccinations();
  }, [childId, router]);

  const counts = useMemo(() => {
    return {
      total: vaccinations.length,
      completed: vaccinations.filter((item) => item.status === "Completed").length,
      upcoming: vaccinations.filter((item) => item.status === "Upcoming").length,
      overdue: vaccinations.filter((item) => item.status === "Overdue").length,
    };
  }, [vaccinations]);

  function getStatusStyle(currentStatus: VaccinationStatus) {
    switch (currentStatus) {
      case "Completed":
        return {
          icon: "✅",
          label: "Completed",
          pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
          card: "border-emerald-100 from-white to-emerald-50/40",
        };
      case "Overdue":
        return {
          icon: "🔴",
          label: "Overdue",
          pill: "bg-red-50 text-red-700 border-red-100",
          card: "border-red-100 from-white to-red-50/40",
        };
      default:
        return {
          icon: "🟡",
          label: "Upcoming",
          pill: "bg-amber-50 text-amber-700 border-amber-100",
          card: "border-amber-100 from-white to-amber-50/40",
        };
    }
  }

  async function handleAddVaccination() {
    setMessage("");

    if (!vaccineName.trim()) {
      setMessage("Please enter vaccine name.");
      return;
    }

    if (status === "Completed" && !completedDate) {
      setMessage("Please add completed date for completed vaccinations.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("vaccinations")
      .insert({
        child_id: childId,
        vaccine_name: vaccineName.trim(),
        status,
        due_date: dueDate || null,
        completed_date: completedDate || null,
        provider: provider.trim() || null,
        notes: notes.trim() || null,
      })
      .select(
        "id, child_id, vaccine_name, status, due_date, completed_date, provider, notes, created_at"
      )
      .single();

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setVaccinations([data as Vaccination, ...vaccinations]);
    setVaccineName("");
    setStatus("Upcoming");
    setDueDate("");
    setCompletedDate("");
    setProvider("");
    setNotes("");
    setMessage("Vaccination added.");
  }

  async function handleDeleteVaccination(vaccinationId: string) {
    const { error } = await supabase
      .from("vaccinations")
      .delete()
      .eq("id", vaccinationId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setVaccinations(vaccinations.filter((item) => item.id !== vaccinationId));
    setMessage("Vaccination deleted.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F9FF]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-medium text-slate-500">
            Loading vaccinations...
          </p>
        </div>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F9FF]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-medium text-slate-500">Child not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F9FF]">
      <header className="sticky top-0 z-20 border-b border-blue-100/70 bg-white/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => router.push(`/children/${childId}`)}
            className="rounded-2xl border border-blue-100 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
          >
            ← Child Profile
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 text-white shadow-md shadow-blue-100">
              ✦
            </div>
            <div className="text-lg font-semibold text-slate-800">CareOS</div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="overflow-hidden rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-emerald-50 p-8 shadow-xl shadow-blue-100/40 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {child.photo_url ? (
                <img
                  src={child.photo_url}
                  alt={child.name}
                  className="h-28 w-28 rounded-[30px] object-cover ring-4 ring-white shadow-lg shadow-blue-100"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-white text-5xl shadow-lg shadow-blue-100">
                  👶
                </div>
              )}

              <div>
                <div className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-700">
                  Vaccinations
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  {child.name}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Keep a calm record of completed shots, upcoming vaccines and overdue items.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 text-center shadow-sm shadow-emerald-100/50">
                <p className="text-xs font-semibold text-slate-400">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-500">
                  {counts.completed}
                </p>
              </div>
              <div className="rounded-[28px] border border-amber-100 bg-white/90 p-5 text-center shadow-sm shadow-amber-100/50">
                <p className="text-xs font-semibold text-slate-400">Upcoming</p>
                <p className="mt-2 text-3xl font-semibold text-amber-500">
                  {counts.upcoming}
                </p>
              </div>
              <div className="rounded-[28px] border border-red-100 bg-white/90 p-5 text-center shadow-sm shadow-red-100/50">
                <p className="text-xs font-semibold text-slate-400">Overdue</p>
                <p className="mt-2 text-3xl font-semibold text-red-500">
                  {counts.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/40">
            <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600">
              New Vaccine
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-slate-900">
              Add Vaccination
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Record vaccine name, dates, provider and status.
            </p>

            <input
              type="text"
              placeholder="Vaccine name, e.g. MMR, Polio, Flu Shot"
              className="mt-6 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              value={vaccineName}
              onChange={(event) => setVaccineName(event.target.value)}
            />

            <select
              className="mt-4 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
              value={status}
              onChange={(event) => setStatus(event.target.value as VaccinationStatus)}
            >
              <option>Upcoming</option>
              <option>Completed</option>
              <option>Overdue</option>
            </select>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Due date</p>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Completed date</p>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                  value={completedDate}
                  onChange={(event) => setCompletedDate(event.target.value)}
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Provider or clinic"
              className="mt-4 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            />

            <textarea
              placeholder="Optional notes: dose, reaction, next appointment..."
              className="mt-4 min-h-28 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            <button
              onClick={handleAddVaccination}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-4 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Vaccination"}
            </button>

            {message && (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                {message}
              </p>
            )}
          </div>

          <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/40">
            <div className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
              Immunization History
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-slate-900">
              Vaccination Timeline
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Completed, upcoming and overdue records in one place.
            </p>

            {vaccinations.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                <div className="text-5xl">💉</div>
                <p className="mt-4 text-base font-semibold text-slate-700">
                  No vaccinations yet.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Add the first vaccine to start the immunization timeline.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {vaccinations.map((item) => {
                  const style = getStatusStyle(item.status);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-sm transition hover:shadow-md ${style.card}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                            {style.icon}
                          </div>

                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {item.vaccine_name}
                            </h3>
                            <div
                              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style.pill}`}
                            >
                              {style.label}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteVaccination(item.id)}
                          className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/80 p-4">
                          <p className="text-xs font-medium text-slate-400">Due date</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {item.due_date || "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/80 p-4">
                          <p className="text-xs font-medium text-slate-400">
                            Completed date
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {item.completed_date || "—"}
                          </p>
                        </div>
                      </div>

                      {(item.provider || item.notes) && (
                        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-600">
                          {item.provider && (
                            <p>
                              <span className="font-semibold text-slate-700">
                                Provider:
                              </span>{" "}
                              {item.provider}
                            </p>
                          )}
                          {item.notes && <p className="mt-2">{item.notes}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
