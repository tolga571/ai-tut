"use client";

/**
 * Pricing — public landing page preview bileşeni.
 * Gerçek checkout için /pricing sayfası kullanılır.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const PLANS = [
  { id: "monthly",   label: "Monthly",   price: "$15", period: "/month",    savings: null,         recommended: false },
  { id: "quarterly", label: "3 Months",  price: "$45", period: "/3 months", savings: null,         recommended: false },
  { id: "yearly",    label: "Annual",    price: "$180", period: "/year",    savings: "Best Value", recommended: true  },
] as const;

const FEATURES = [
  "Unlimited AI conversations",
  "All 30+ languages",
  "CEFR-level adaptive tutor",
  "Vocabulary tracker",
  "Progress dashboard",
  "Grammar correction & explanations",
  "Cancel anytime",
];

export default function Pricing() {
  const t = useTranslations("pricing");

  return (
    <section className="py-20 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            {t("title")}
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border-2 p-8 transition-all
                ${plan.recommended
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60"
                }`}
            >
              {plan.savings && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  {plan.savings}
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {plan.label}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-all
                  ${plan.recommended
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                    : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900"
                  }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          {t("guarantee")}
        </p>
      </div>
    </section>
  );
}
