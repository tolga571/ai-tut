"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Pricing from "@/components/Pricing";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Zaten giriş yapmış kullanıcıları yönlendir
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if (user.planStatus === "inactive") {
        setUserId(user.id);
        setData((prev) => ({ ...prev, name: user.name || "", email: user.email || "" }));
        setStep(2);
      } else if (user.planStatus === "active") {
        router.push("/chat");
      }
    }
  }, [session, router]);

  // Adım 1: Kayıt + otomatik giriş
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Hesabı oluştur
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message || "Kayıt başarısız");
        return;
      }

      setUserId(json.userId);

      // 2. Otomatik giriş yap — ödeme sonrası /chat'e dönerken oturum açık olsun
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
      toast.error("Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Adım 2: Plan seçimi → server-side Paddle transaction → doğrudan URL redirect
  const handleSelectPlan = async (priceId: string) => {
    if (!userId || !data.email) {
      toast.error("Kullanıcı bilgisi eksik. Lütfen tekrar deneyin.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Ödeme sayfasına yönlendiriliyor…");

    try {
      const res = await fetch("/api/paddle/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId, email: data.email }),
      });

      const json = await res.json();
      toast.dismiss(toastId);

      if (!res.ok || !json.checkoutUrl) {
        toast.error(json.error || "Ödeme sayfası açılamadı. Lütfen tekrar deneyin.");
        return;
      }

      // Paddle'ın kendi checkout sayfasına yönlendir (overlay/iframe yok)
      window.location.href = json.checkoutUrl;
    } catch {
      toast.dismiss(toastId);
      toast.error("Ödeme başlatılamadı. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  // DEV: Ödeme atlama
  const handleDevSkipPayment = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dev/activate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await updateSession();
        router.push("/chat");
      } else {
        toast.error("Plan aktif edilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <Pricing onSelectPlan={handleSelectPlan} loading={loading} />
        {process.env.NODE_ENV !== "production" && (
          <button
            onClick={handleDevSkipPayment}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            [DEV] Ödemeyi Atla — Planı Aktif Et
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
          <p className="text-gray-400">Adım 1: Hesap Bilgilerin</p>
        </div>

        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ad Soyad</label>
            <input
              type="text"
              required
              placeholder="Adın Soyadın"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-posta</label>
            <input
              type="email"
              required
              placeholder="sen@ornek.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Şifre</label>
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
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Devam Et — Plan Seç"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
