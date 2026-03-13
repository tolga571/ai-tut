"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { SUPPORTED_LANG_CODES, CEFR_LEVELS, type CefrLevel } from "@/constants/languages";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const t = useTranslations("onboarding");
  const tLangs = useTranslations("languages");
  const [loading, setLoading] = useState(false);
  const [nativeLang, setNativeLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>("A1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nativeLang === targetLang) {
      toast.error(t("errors.sameLang"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nativeLang, targetLang, cefrLevel }),
      });

      if (!res.ok) throw new Error("Failed to save preferences");

      await update();
      toast.success(t("success"));
      router.push("/chat");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-lg z-10 glass-panel border border-white/5 rounded-3xl p-8 shadow-2xl bg-gray-900/50 backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
            {t("title")}
          </h1>
          <p className="text-gray-400 text-sm">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Language pair */}
          <div className="space-y-4">
            <div className="group">
              <label className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-hover:text-blue-400">
                {t("nativeLang")}
              </label>
              <div className="relative">
                <select
                  value={nativeLang}
                  onChange={(e) => setNativeLang(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white transition-all outline-none"
                >
                  {SUPPORTED_LANG_CODES.map((code) => (
                    <option key={code} value={code}>{tLangs(code)}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-hover:text-purple-400">
                {t("targetLang")}
              </label>
              <div className="relative">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white transition-all outline-none"
                >
                  {SUPPORTED_LANG_CODES.map((code) => (
                    <option key={code} value={code}>{tLangs(code)}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* CEFR level selection */}
          <div>
            <p className="text-sm font-semibold text-gray-200 mb-1">{t("cefrTitle")}</p>
            <p className="text-xs text-gray-500 mb-4">{t("cefrSubtitle")}</p>
            <div className="grid grid-cols-2 gap-3">
              {CEFR_LEVELS.map((level) => {
                const levelData = t.raw(`levels.${level}`) as { label: string; description: string };
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCefrLevel(level)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all focus:outline-none ${
                      cefrLevel === level
                        ? "border-blue-500 bg-blue-500/10 shadow-[0_4px_20px_rgba(59,130,246,0.25)]"
                        : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${cefrLevel === level ? "text-blue-300" : "text-gray-300"}`}>
                      {levelData.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{levelData.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || nativeLang === targetLang}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {t("continue")}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
