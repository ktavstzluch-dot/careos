"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
const features = [
  {
    title: "Live care status",
    description: "See when a nanny, dog walker, elder caregiver or house sitter starts and ends care.",
    icon: "🟢",
  },
  {
    title: "Care Log",
    description: "Meals, walks, naps, medicine, photos and notes — everything saved in one timeline.",
    icon: "📝",
  },
  {
    title: "Built-in messages",
    description: "Keep communication inside the care session instead of losing details in WhatsApp.",
    icon: "💬",
  },
  {
    title: "AI summaries",
    description: "Turn photos, notes and updates into a clean daily summary for the family.",
    icon: "✨",
  },
];

export default function Home() {
    const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleWaitlistSubmit() {
    setStatus("");

    if (!email || !email.includes("@")) {
      setStatus("Please enter a valid email.");
      return;
    }

    const { error } = await supabase.from("waitlist").insert({
      email,
    });

    if (error) {
      if (error.code === "23505") {
        setStatus("You are already on the waitlist.");
      } else {
        setStatus("Something went wrong. Please try again.");
      }
      return;
    }

    setEmail("");
    setStatus("You're on the waitlist!");
  }
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold">
              C
            </div>
            <span className="text-xl font-bold">CareOS</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-blue-600">Features</a>
            <a href="#carelog" className="hover:text-blue-600">Care Log</a>
            <a href="#waitlist" className="hover:text-blue-600">Waitlist</a>
          </nav>

          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            Join Waitlist
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Trusted care for kids, pets, elders & home
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-950 md:text-7xl">
            Know everything is okay while you are away.
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-8 text-slate-600">
            CareOS helps families manage caregivers, schedules, care logs,
            messages, photos and AI summaries in one calm, trusted place.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button className="rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
              Join Waitlist
            </button>

            <button className="rounded-2xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-800 hover:bg-slate-50">
              See how it works
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-200">
          <div className="rounded-[1.5rem] bg-slate-50 p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Today</p>
                <h2 className="text-2xl font-bold">Care Status</h2>
              </div>
              <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                All good
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Emma</p>
                    <p className="text-sm text-slate-500">Nanny visit · 3:00 PM - 7:00 PM</p>
                  </div>
                  <span className="text-2xl">👶</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Max</p>
                    <p className="text-sm text-slate-500">Dog walk · Completed</p>
                  </div>
                  <span className="text-2xl">🐶</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-700">AI Summary</p>
                <p className="mt-2 text-slate-700">
                  Emma had lunch, took a 1-hour nap and played outside.
                  Max walked 1.4 miles and had water after the walk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-bold">One platform. Every care moment.</h2>
          <p className="mt-4 text-lg text-slate-600">
            Designed for families who want peace of mind and caregivers who need a simple workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="text-3xl">{feature.icon}</div>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="carelog" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] bg-slate-900 p-8 text-white md:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-blue-300">Care Log</p>
              <h2 className="mt-3 text-4xl font-bold">Every update becomes a clear timeline.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Caregivers can log meals, walks, medicine, activities, photos and notes.
                Parents see everything in one place.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 text-slate-900">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-500">3:04 PM</p>
                  <p className="font-semibold">Anna checked in</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">4:15 PM</p>
                  <p className="font-semibold">Snack completed</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">5:20 PM</p>
                  <p className="font-semibold">Outdoor play · 3 photos uploaded</p>
                </div>
                <div className="rounded-2xl bg-green-50 p-4 text-green-800">
                  AI summary ready for review
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold">Join the CareOS waitlist</h2>
        <p className="mt-4 text-lg text-slate-600">
          Be first to test the private beta for families and trusted caregivers.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-4 outline-none focus:border-blue-500"
          />
         <button
         onClick={handleWaitlistSubmit}
         className="rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700"
         >
         Request Access
         </button>
         {status && (
         <p className="mt-4 text-sm font-medium text-slate-600">
         {status}
         </p>
         )}
        </div>
      </section>
    </main>
  );
}