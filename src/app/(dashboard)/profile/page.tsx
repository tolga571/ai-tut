"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "İngilizce" },
  { code: "de", label: "Almanca" },
  { code: "fr", label: "Fransızca" },
  { code: "es", label: "İspanyolca" },
  { code: "it", label: "İtalyanca" },
  { code: "pt", label: "Portekizce" },
  { code: "ru", label: "Rusça" },
  { code: "zh", label: "Çince" },
  { code: "ja", label: "Japonca" },
  { code: "ar", label: "Arapça" },
  { code: "ko", label: "Korece" },
];

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as any;

  const [name, setName] = useState(user?.name || "");
  const [nativeLang, setNativeLang] = useState(user?.nativeLang || "tr");
  const [targetLang, setTargetLang] = useState(user?.targetLang || "en");

  const [savingName, setSavingName] = useState(false);
  const [savingLangs, setSavingLangs] = useState(false);

  // Sync state when session loads
  if (user?.name && name === "" && user.name !== name) {
    setName(user.name);
  }
  if (user?.nativeLang && nativeLang !== user.nativeLang && nativeLang === "tr") {
    setNativeLang(user.nativeLang);
  }
  if (user?.targetLang && targetLang !== user.targetLang && targetLang === "en") {
    setTargetLang(user.targetLang);
  }

  const handleSaveName = async () => {
    if (!name.trim()) return toast.error("İsim boş olamaz");
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await updateSession();
      toast.success("İsim güncellendi");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveLanguages = async () => {
    if (nativeLang === targetLang) {
      return toast.error("Ana dil ve hedef dil aynı olamaz");
    }
    setSavingLangs(true);
    try {
      const res = await fetch("/api/user/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nativeLang, targetLang }),
      });
      if (!res.ok) throw new Error();
      await updateSession();
      toast.success("Dil ayarları güncellendi");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSavingLangs(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Chat'e Dön
        </Link>
        <h1 className="text-lg font-semibold text-white">Profil Ayarları</h1>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Personal Info */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-white">Kişisel Bilgiler</h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">Ad Soyad</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Adınız"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim() || name.trim() === user?.name}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingName ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-400">E-posta Adresi</label>
            <p className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300">
              {user?.email}
            </p>
            <p className="text-xs text-gray-600">E-posta adresi değiştirilemez</p>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-white">Dil Ayarları</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-400">Ana Diliniz</label>
              <select
                value={nativeLang}
                onChange={(e) => setNativeLang(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-gray-800 text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-400">Öğrendiğiniz Dil</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-gray-800 text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {nativeLang === targetLang && (
            <p className="text-sm text-yellow-500/80 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              Ana dil ve hedef dil aynı olamaz
            </p>
          )}

          <button
            onClick={handleSaveLanguages}
            disabled={
              savingLangs ||
              nativeLang === targetLang ||
              (nativeLang === user?.nativeLang && targetLang === user?.targetLang)
            }
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingLangs ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              "Dil Ayarlarını Kaydet"
            )}
          </button>
        </div>

        {/* Plan Status */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Plan Durumu</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  user?.planStatus === "active" ? "bg-green-400" : "bg-yellow-400"
                }`}
              />
              <div>
                <p className="text-white font-medium">
                  {user?.planStatus === "active" ? "Aktif Plan" : "Ücretsiz Tier"}
                </p>
                <p className="text-sm text-gray-400">
                  {user?.planStatus === "active"
                    ? "Tüm özelliklere erişiminiz var"
                    : "Sınırlı erişim — plan seçerek devam edin"}
                </p>
              </div>
            </div>
            {user?.planStatus !== "active" && (
              <Link
                href="/pricing"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold transition-all shadow-lg"
              >
                Yükselt
              </Link>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-1">Oturum</h2>
          <p className="text-sm text-gray-400 mb-4">Hesabınızdan güvenli çıkış yapın</p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 transition-all"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
