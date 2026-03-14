"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { signIn, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

const PLAN_OPTIONS = [
  { id: "base", translationKey: "base" },
  { id: "middle", translationKey: "middle" },
  { id: "ultra", translationKey: "ultra" },
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("register");
  const { data: session } = useSession();
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; planStatus?: string; name?: string; email?: string };
      if (user.planStatus === "inactive") {
        setData((prev) => ({ ...prev, name: user.name || "", email: user.email || "" }));
        setStep(2);
      } else if (user.planStatus === "active") {
        router.push("/dashboard");
      }
    }
  }, [session, router]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      }

      setStep(2);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handlePlanContinue = () => {
    if (!selectedPlan) return;
    toast.success(t("planStep.note"));
    router.push("/dashboard");
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-full max-w-4xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-500 dark:text-blue-400">{t("stepLabel")}</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{t("planStep.title")}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-3">{t("planStep.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLAN_OPTIONS.map((plan) => {
              const planData = t.raw(`planStep.plans.${plan.translationKey}`) as {
                name: string;
                priceValue: string;
                priceSuffix: string;
                description: string;
              };
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left relative rounded-2xl border-2 p-6 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 ${
                    selectedPlan === plan.id
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_10px_40px_rgba(59,130,246,0.35)]"
                      : "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-300 tracking-wide uppercase">
                    {planData.name}
                  </div>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{planData.priceValue}</span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{planData.priceSuffix}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">{planData.description}</p>
                  <span
                    className={`inline-flex items-center justify-center mt-6 text-sm font-medium rounded-full px-4 py-2 ${
                      selectedPlan === plan.id ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {selectedPlan === plan.id ? t("planStep.selected") : t("planStep.select")}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-500 mt-8">{t("planStep.note")}</p>

          <button
            onClick={handlePlanContinue}
            disabled={!selectedPlan}
            className="w-full mt-6 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("planStep.cta")}
          </button>
        </div>
      </div>
    );
  }

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
              required
              placeholder={t("namePlaceholder")}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("email")}</label>
            <input
              type="email"
              required
              placeholder={t("emailPlaceholder")}
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
