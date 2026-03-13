"use client";

import { useState, useEffect } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function PricingPage() {
  const { data: session } = useSession();
  const t = useTranslations("pricing");
  const [paddle, setPaddle] = useState<Paddle>();
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) {
      initializePaddle({
        environment: "sandbox",
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      }).then((paddleInstance: Paddle | undefined) => {
        if (paddleInstance) setPaddle(paddleInstance);
      });
    }
  }, []);

  const openCheckout = (priceId: string) => {
    if (!session?.user) {
      toast.error(t("errors.loginRequired"));
      return;
    }

    if (!paddle) {
      toast.error(t("errors.notConfigured"));
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: session.user.email! },
      customData: { userId: (session.user as { id?: string }).id },
    });
  };

  const monthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || "pri_mock_monthly";
  const annualPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ANNUAL || "pri_mock_annual";

  return (
    <div className="min-h-screen bg-gray-950 py-24 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            {t("title")}
          </h2>
          <p className="mt-4 text-xl text-gray-400 font-light">{t("subtitle")}</p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="relative flex items-center p-1 bg-gray-900 border border-gray-800 rounded-full">
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold whitespace-nowrap focus:outline-none transition-all ${!isAnnual ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold whitespace-nowrap focus:outline-none transition-all ${isAnnual ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              {t("annual")}
            </button>
          </div>
        </div>

        <div className="mt-16 mx-auto max-w-lg lg:max-w-none lg:flex justify-center flex-wrap gap-8">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden glass-panel max-w-sm w-full transition-transform hover:-translate-y-2 hover:shadow-blue-900/20">
            <div className="px-6 py-8 sm:p-10 sm:pb-6 text-center">
              <div>
                <h3 className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  Pro Plan
                </h3>
              </div>
              <div className="mt-6 flex items-baseline justify-center text-6xl font-extrabold">
                ${isAnnual ? "99" : "15"}
                <span className="ml-1 text-2xl font-medium text-gray-500">
                  {isAnnual ? "/yr" : "/mo"}
                </span>
              </div>
              <p className="mt-5 text-lg text-gray-400">{t("subtitle")}</p>
            </div>
            <div className="px-6 pt-6 pb-8 bg-gray-900/50 sm:px-10 sm:pt-6 sm:pb-8">
              <ul className="space-y-4">
                {(t.raw("plans.proMonthly.features") as string[]).map((feature: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-300">{feature}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <button
                  onClick={() => openCheckout(isAnnual ? annualPriceId : monthlyPriceId)}
                  className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-lg font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg active:scale-[0.98]"
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
