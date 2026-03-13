"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PLAN_CONFIG = [
  {
    id: "standard-monthly",
    price: "$9",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD_MONTHLY || "",
    planKey: "standardMonthly" as const,
  },
  {
    id: "standard-yearly",
    price: "$99",
    period: "/year",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD_YEARLY || "",
    planKey: "standardYearly" as const,
  },
  {
    id: "pro-monthly",
    price: "$29",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY || "",
    planKey: "proMonthly" as const,
    recommended: true,
  },
  {
    id: "pro-yearly",
    price: "$299",
    period: "/year",
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY || "",
    planKey: "proYearly" as const,
  },
];

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  loading?: boolean;
}

export default function Pricing({ onSelectPlan, loading }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const t = useTranslations("pricing");

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {t("choosePlan")}
        </h2>
        <p className="text-gray-400 text-lg">{t("planSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLAN_CONFIG.map((plan) => {
          const planData = t.raw(`plans.${plan.planKey}`) as { name: string; features: string[] };
          const planFeatures = planData.features;
          const planName = planData.name;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.priceId)}
              className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 transition-all duration-300 p-6 flex flex-col ${
                selectedPlan === plan.priceId
                  ? "border-blue-500 bg-gray-900 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900"
              } ${plan.recommended ? "lg:scale-105" : ""}`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  {t("recommended")}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{planName}</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-white tracking-tight">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {planFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-400">
                    <span className="mr-2 mt-0.5 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlan(plan.priceId);
                }}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  selectedPlan === plan.priceId
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                {selectedPlan === plan.priceId ? t("selected") : t("selectPlan")}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-gray-500 text-sm">
        {t("guarantee")}
      </div>
    </div>
  );
}
