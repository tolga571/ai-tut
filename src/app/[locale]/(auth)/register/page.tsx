"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { signIn, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("register");
  const resetT = useTranslations("resetPassword");
  const { data: session } = useSession();
  const [data, setData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; planStatus?: string };
      if (user.planStatus === "active") {
        router.push("/dashboard");
      } else if (user.planStatus === "inactive") {
        router.replace("/pricing");
      }
    }
  }, [session, router]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = { name: "", email: "", password: "", confirmPassword: "" };
    let hasError = false;

    if (!data.name.trim()) {
      newErrors.name = t("errors.nameRequired") || "Name is required";
      hasError = true;
    }
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = t("errors.emailInvalid") || "Please enter a valid email address";
      hasError = true;
    }
    if (data.password.length < 8) {
      newErrors.password = t("errors.passwordTooShort") || "Password must be at least 8 characters";
      hasError = true;
    }
    if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = resetT("passwordMismatch") || "Passwords do not match";
      hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message || t("errors.register"));
        return;
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.warn("Auto sign-in failed:", signInResult.error);
        toast.error(t("errors.generic"));
        return;
      }

      toast.success(t("afterSignup"));
      router.push("/pricing");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-4 transition-colors">
      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("title")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("step1")}</p>
        </div>

        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("name")}</label>
            <input
              type="text"
              placeholder={t("namePlaceholder")}
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none ${errors.name ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"}`}
              value={data.name}
              onChange={(e) => {
                setData({ ...data, name: e.target.value });
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("email")}</label>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none ${errors.email ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"}`}
              value={data.email}
              onChange={(e) => {
                setData({ ...data, email: e.target.value });
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("password")}</label>
            <input
              type="password"
              placeholder="••••••••"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none ${errors.password ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"}`}
              value={data.password}
              onChange={(e) => {
                setData({ ...data, password: e.target.value });
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{resetT("confirmPassword")}</label>
            <input
              type="password"
              placeholder="••••••••"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none ${errors.confirmPassword ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-700"}`}
              value={data.confirmPassword}
              onChange={(e) => {
                setData({ ...data, confirmPassword: e.target.value });
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t("submit")
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
