"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { LEARNING_LANGUAGES, CEFR_LEVELS, type CefrLevel } from "@/constants/languages";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const t = useTranslations("profile");
  const tOnboarding = useTranslations("onboarding");
  const user = session?.user as {
    id?: string;
    name?: string;
    email?: string;
    planStatus?: string;
    nativeLang?: string;
    targetLang?: string;
    cefrLevel?: string;
  } | undefined;

  const [name, setName] = useState(user?.name || "");
  const [nativeLang, setNativeLang] = useState(user?.nativeLang || "en");
  const [targetLang, setTargetLang] = useState(user?.targetLang || "es");
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>((user?.cefrLevel as CefrLevel) || "A1");
  const [savingName, setSavingName] = useState(false);
  const [savingLangs, setSavingLangs] = useState(false);

  if (user?.name && name === "" && user.name !== name) setName(user.name);
  if (user?.nativeLang && nativeLang !== user.nativeLang && nativeLang === "en") setNativeLang(user.nativeLang);
  if (user?.targetLang && targetLang !== user.targetLang && targetLang === "es") setTargetLang(user.targetLang);
  if (user?.cefrLevel && cefrLevel !== user.cefrLevel && cefrLevel === "A1") setCefrLevel(user.cefrLevel as CefrLevel);

  const handleSaveName = async () => {
    if (!name.trim()) return toast.error(t("errors.nameEmpty"));
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await updateSession();
      toast.success(t("errors.nameUpdated"));
    } catch {
      toast.error(t("errors.updateFailed"));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveLanguages = async () => {
    if (nativeLang === targetLang) return toast.error(t("errors.sameLang"));
    setSavingLangs(true);
    try {
      const res = await fetch("/api/user/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nativeLang, targetLang, cefrLevel }),
      });
      if (!res.ok) throw new Error();
      await updateSession();
      toast.success(t("errors.langSaved"));
    } catch {
      toast.error(t("errors.updateFailed"));
    } finally {
      setSavingLangs(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToChat")}
        </Link>
        <h1 className="text-lg font-semibold text-white">{t("title")}</h1>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-white">{t("personalInfo")}</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">{t("fullName")}</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t("namePlaceholder")}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim() || name.trim() === user?.name}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingName ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t("save")}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">{t("email")}</label>
            <p className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300">{user?.email}</p>
            <p className="text-xs text-gray-600">{t("emailNote")}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-white">{t("languageSettings")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-400">{t("nativeLanguage")}</label>
              <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                {LEARNING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">{lang.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-400">{t("learningLanguage")}</label>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                {LEARNING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">{lang.nameEn}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">{t("cefrLevel")}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CEFR_LEVELS.map((level) => (
                <button key={level} type="button" onClick={() => setCefrLevel(level)}
                  className={`py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all focus:outline-none ${cefrLevel === level ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"}`}>
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(tOnboarding.raw(`levels.${cefrLevel}`) as { label: string; description: string }).description}
            </p>
          </div>

          {nativeLang === targetLang && (
            <p className="text-sm text-yellow-500/80 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              {t("sameLangWarning")}
            </p>
          )}

          <button onClick={handleSaveLanguages}
            disabled={savingLangs || nativeLang === targetLang || (nativeLang === user?.nativeLang && targetLang === user?.targetLang && cefrLevel === (user?.cefrLevel as CefrLevel))}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {savingLangs ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("saving")}</>) : t("saveLangs")}
          </button>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4">{t("planStatus")}</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${user?.planStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
              <div>
                <p className="text-white font-medium">{user?.planStatus === "active" ? t("activePlan") : t("freeTier")}</p>
                <p className="text-sm text-gray-400">{user?.planStatus === "active" ? t("fullAccess") : t("limitedAccess")}</p>
              </div>
            </div>
            {user?.planStatus !== "active" && (
              <Link href="/pricing" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold transition-all shadow-lg">
                {t("upgrade")}
              </Link>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-1">{t("session")}</h2>
          <p className="text-sm text-gray-400 mb-4">{t("signOutDesc")}</p>
          <button onClick={() => signOut({ callbackUrl: window.location.origin + "/login" })}
            className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 transition-all">
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
