"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useEffect } from "react";
import Pricing from "@/components/Pricing";
import { initializePaddle, Paddle } from "@paddle/paddle-js";

import { useSession } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Details, 2: Plan
  const [userId, setUserId] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<Paddle | undefined>();

  // If user is already logged in but inactive, skip to step 2
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if (user.planStatus === "inactive") {
        setUserId(user.id);
        setData({ name: user.name || "", email: user.email || "", password: "" });
        setStep(2);
      } else if (user.planStatus === "active") {
        router.push("/dashboard");
      }
    }
  }, [session, router]);

  // Initialize Paddle
  useEffect(() => {
    const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!paddleToken) {
      console.error("❌ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set in .env");
      toast.error("Paddle not configured. Please contact support.");
      return;
    }

    initializePaddle({
      environment: "sandbox",
      token: paddleToken,
    })
      .then((paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
          console.log("✅ Paddle initialized successfully");
        }
      })
      .catch((error: any) => {
        console.error("❌ Failed to initialize Paddle:", error);
        toast.error("Paddle initialization failed. Please refresh the page.");
      });
  }, []);

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
        toast.error(json.message || "Registration failed");
      } else {
        setUserId(json.userId);
        setStep(2); // Move to plan selection
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    if (!paddle) {
      console.error("❌ Paddle not initialized");
      toast.error("Paddle not ready. Please refresh the page.");
      return;
    }

    if (!userId) {
      console.error("❌ Missing userId");
      toast.error("User context missing. Please try again.");
      return;
    }

    try {
      console.log("🔄 Opening Paddle checkout for priceId:", priceId);
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: data.email },
        customData: { userId },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
          successUrl: `${window.location.origin}/dashboard`,
        },
      });
    } catch (error: any) {
      console.error("❌ Paddle checkout error:", error);
      toast.error(`Checkout failed: ${error.message || 'Unknown error'}`);
    }
  };

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
        router.push("/dashboard");
      }
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
            className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            [DEV] Ödemeyi Atla — Planı Aktif Et
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8 transform transition-all">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-gray-400">Step 1: Your Account Details</p>
        </div>
        
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              required
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
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
              "Next: Select Plan"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
