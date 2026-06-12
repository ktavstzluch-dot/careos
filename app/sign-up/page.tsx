"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp() {
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. Check your email for confirmation.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">
          Create Account
        </h1>

        <p className="mt-2 text-slate-500">
          Create your CareOS account.
        </p>

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
          onClick={handleSignUp}
          className="mt-6 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700"
        >
          Create Account
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}