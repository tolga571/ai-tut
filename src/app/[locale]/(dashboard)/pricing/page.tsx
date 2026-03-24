"use client";

import { useState, useEffect } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$15",
    perMonth: "$15 / mo",
    period: "/month",
    savings: null,
    recommended: false,
  },
  {
    id: "quarterly",
    label: "3 Months",
    price: "$45",
    perMonth: "$15 / mo",
    period: "/3 months",
    savings: null,
    recommended: false,
  },
  {
    id: "yearly",
    label: "Annual",
    price: "$180",
    perMonth: "$15 / mo",
    period: "/year",
    savings: "Best Value",
    recommended: true,
  },
] as const;

const PRICE_IDS: Record<string, string> = {
  monthly:   process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY   || "",
  quarterly: process.env.NEXT_PUBLIC_PADDLE_PRICE_QUARTERLY || "",
  yearly:    process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY    || "",
};

const FEATURES = [
  "Unlimited AI conversations",
  "All 30+ languages",
  "CEFR-level adaptive tutor",
  "Vocabulary tracker",
  "Progress dashboard",
  "Grammar correction & explanations",
  "Cancel anytime",
];

export default function PricingPage() {
  const { data: session } = useSession();
  const t = useTranslations("pricing");
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    const env =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

    initializePaddle({ environment: env, token }).then((instance) => {
      if (instance) {
        setPaddle(instance);
        setPaddleReady(true);
      }
    });
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!session?.user) {
      toast.error(t("errors.loginRequired"));
      return;
    }

    if (!paddleReady || !paddle) {
      toast.error(t("errors.notConfigured"));
      return;
    }

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      toast.error("Price not configured. Please contact support.");
      return;
    }

    setLoadingPlan(planId);
    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: session.user.email! },
        customData: { userId: (session.user as { id?: string }).id },
      });
    } catch {
      toast.error("Failed to open checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-white transition-colors">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border-2 p-8 transition-all duration-200
                ${plan.recommended
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
            >
              {/* Badge */}
              {plan.savings && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  {plan.savings}
                </span>
              )}

              {/* Plan name & price */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {plan.label}
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {plan.perMonth}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60
                  ${plan.recommended
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                    : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900"
                  }`}
              >
                {loadingPlan === plan.id ? "Opening…" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          {t("guarantee")}
        </p>

      </div>
    </div>
  );
}
