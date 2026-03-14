"use client";

import { useState } from "react";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8 transform transition-all">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <p className="text-gray-400">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("email")}</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("password")}</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
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

        <p className="mt-8 text-center text-sm text-gray-400">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
