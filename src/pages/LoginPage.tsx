import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useAuthSubmit } from "../auth/AuthContext";

export function LoginPage() {
  const { isLoading, profile, isConfigured, signIn } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const handleSubmit = useAuthSubmit(mode, setError);

  async function handleDemoLogin() {
    setError("");

    try {
      await signIn({ email: "admin", password: "admin" });
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : "Demo sign in failed.");
    }
  }

  useEffect(() => {
    setNotice(
      isConfigured
        ? ""
        : "Supabase is not configured yet. This screen is running in local demo mode.",
    );
  }, [isConfigured]);

  if (isLoading) {
    return <div className="min-h-screen bg-stone-50" />;
  }

  if (profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 text-charcoal">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-tile sm:p-8"
      >
        <p className="mb-2 text-lg font-bold text-recycle-800">
          Recycle Group Safety Hub
        </p>
        <h1
          id="login-heading"
          className="text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          Sign in before you start
        </h1>
        <p className="mt-4 text-xl font-semibold text-slate-700">
          Sign in so safety checks are recorded under your name.
        </p>

        {notice ? <p className="status-note mt-5">{notice}</p> : null}
        {error ? <p className="error-note mt-5">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-3" aria-label="Login mode">
          <button
            className={`segmented-button ${mode === "sign-in" ? "segmented-button-active" : ""}`}
            type="button"
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            className={`segmented-button ${mode === "sign-up" ? "segmented-button-active" : ""}`}
            type="button"
            onClick={() => setMode("sign-up")}
          >
            New user
          </button>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {(mode === "sign-up" || !isConfigured) && (
            <div>
              <label htmlFor="fullName" className="field-label">
                Your name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                className="field-input"
                placeholder="Type your full name"
                required={!isConfigured || mode === "sign-up"}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">
              {mode === "sign-in" ? "Email or username" : "Email"}
            </label>
            <input
              id="email"
              name="email"
              type={mode === "sign-in" ? "text" : "email"}
              autoComplete={mode === "sign-in" ? "username" : "email"}
              autoFocus
              className="field-input"
              placeholder={mode === "sign-in" ? "admin" : "name@recyclegroup.com.au"}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              className="field-input"
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="primary-action">
            Continue
          </button>
        </form>

        <button
          type="button"
          className="secondary-action mt-4"
          onClick={handleDemoLogin}
        >
          Demo admin login
        </button>
      </section>
    </main>
  );
}
