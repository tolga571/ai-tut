"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const [data, setData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [testCreds, setTestCreds] = useState<{ email: string; password: string } | null>(null);
  const [testCredsLoading, setTestCredsLoading] = useState(false);

  useEffect(() => {
    setTestCredsLoading(true);
    fetch("/api/auth/dev-test-credentials")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setTestCreds(json))
      .catch(() => setTestCreds(null))
      .finally(() => setTestCredsLoading(false));
  }, []);

  const fillTestCredentials = () => {
    if (!testCreds) return;
    setData({ email: testCreds.email, password: testCreds.password });
    toast.success(t("testCredentialsFilled"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(t("success"));
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-4 transition-colors">
      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 transform transition-all">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("title")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("email")}</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("password")}</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
            <div className="mt-1 text-right">
              <Link href="/forgot-password" className="text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors">
                {t("forgotPassword")}
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              t("submit")
            )}
          </button>
        </form>

        {/* Test credentials (only visible when test API returns valid credentials) */}
        {(testCredsLoading || testCreds) && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/20">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
              {t("testMode")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t("testCredentialsHint")}
            </p>
            {testCredsLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading test credentials...</div>
            ) : testCreds ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                  {testCreds.email}
                </code>
                <code className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                  {testCreds.password}
                </code>
                <button
                  type="button"
                  onClick={fillTestCredentials}
                  className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg font-medium transition-colors"
                >
                  {t("fillTestCredentials")}
                </button>
              </div>
            ) : null}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
