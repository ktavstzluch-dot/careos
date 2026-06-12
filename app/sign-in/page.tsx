"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignIn() {
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>

        <p className="mt-2 text-slate-500">Sign in to your CareOS account.</p>

        <input
          type="email"
          placeholder="Email"
          className="mt-6 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mt-4 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          onClick={handleSignIn}
          className="mt-6 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
        >
          Sign In
        </button>

        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </div>
    </main>
  );
}