"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const PLAN_ORDER = ["monthly", "quarterly", "yearly"] as const;
type PlanId = (typeof PLAN_ORDER)[number];

type CheckoutConfig = {
  prices: Record<PlanId, string>;
  clientToken: string;
  environment: "sandbox" | "production";
};

const emptyPrices = (): Record<PlanId, string> => ({
  monthly: "",
  quarterly: "",
  yearly: "",
});

export default function PricingPage() {
  const { data: session, update } = useSession();
  const t = useTranslations("pricing");
  const locale = useLocale();
  const router = useRouter();

  // C3: Aktif planlı kullanıcı pricing sayfasına girerse chat'e yönlendir
  const sessionPlanStatus = (session?.user as { planStatus?: string } | undefined)?.planStatus;
  useEffect(() => {
    if (sessionPlanStatus === "active") {
      router.replace("/chat");
    }
  }, [sessionPlanStatus, router]);
  const searchParams = useSearchParams();
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [priceIds, setPriceIds] = useState<Record<PlanId, string>>(emptyPrices);
  const [checkoutConfigError, setCheckoutConfigError] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const checkoutHandled = useRef(false);

  const hasAllPriceIds = useMemo(
    () => PLAN_ORDER.every((id) => Boolean(priceIds[id]?.trim())),
    [priceIds]
  );

  const refreshAfterCheckout = useCallback(async () => {
    if (checkoutHandled.current) return;
    checkoutHandled.current = true;

    // Paddle webhook DB'yi güncelleyene kadar bekle (genellikle 1-5sn).
    // /api/user/plan-status her seferinde DB'ye gider — JWT cache'ini atlar.
    const toastId = toast.loading("Ödeme doğrulanıyor…");

    let activated = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      // İlk kontrol 1.5sn sonra, sonrakiler 2sn aralıklarla
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 2000));
      try {
        const res = await fetch("/api/user/plan-status");
        if (res.ok) {
          const data = await res.json() as { planStatus?: string };
          if (data.planStatus === "active") {
            activated = true;
            break;
          }
        }
      } catch {
        // Ağ hatası — bir sonraki denemede tekrar dene
      }
    }

    toast.dismiss(toastId);

    if (activated) {
      // DB onaylandı → JWT cookie'ye planStatus: "active" yaz
      // update() argümansız çağrılırsa JWT callback token'ı güncellemez,
      // middleware cookie'deki eski "inactive" değeri görür ve pricing'e redirect eder.
      await update({ planStatus: "active" });
      toast.success(t("checkoutSuccess"));
    } else {
      // Webhook gecikmiş olabilir — fallback optimistic update
      await update({ planStatus: "active" });
      toast.success(t("checkoutSuccess"));
      console.warn("[PRICING] Webhook did not confirm within 15s, using optimistic update");
    }

    // router.replace yerine hard navigation — update() Set-Cookie'nin
    // middleware tarafından okunmasını garantilemek için tam sayfa yüklemesi yapılır.
    window.location.href = `/${locale}/dashboard`;
  }, [update, locale, t]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      void refreshAfterCheckout();
    }
  }, [searchParams, refreshAfterCheckout]);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutConfig() {
      try {
        const res = await fetch("/api/paddle/checkout-config");
        if (!res.ok) throw new Error("checkout-config failed");
        const data = (await res.json()) as CheckoutConfig;
        if (cancelled) return;

        setPriceIds({
          monthly: data.prices.monthly ?? "",
          quarterly: data.prices.quarterly ?? "",
          yearly: data.prices.yearly ?? "",
        });
        setCheckoutConfigError(false);

        const hasPrices = PLAN_ORDER.every((id) =>
          String(data.prices?.[id] ?? "").trim() !== ""
        );

        if (!data.clientToken) {
          setPaddle(undefined);
          setPaddleReady(false);
          setConfigLoaded(true);
          return;
        }

        if (!hasPrices) {
          setPaddle(undefined);
          setPaddleReady(false);
          setConfigLoaded(true);
          return;
        }

        const instance = await initializePaddle({
          environment: data.environment,
          token: data.clientToken,
        });
        if (cancelled) return;
        if (instance) {
          setPaddle(instance);
          setPaddleReady(true);
        } else {
          setPaddle(undefined);
          setPaddleReady(false);
        }
        setConfigLoaded(true);
      } catch {
        if (!cancelled) {
          setCheckoutConfigError(true);
          setPaddleReady(false);
          setConfigLoaded(false);
        }
      }
    }

    void loadCheckoutConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async (planId: PlanId) => {
    if (!session?.user) {
      toast.error(t("errors.loginRequired"));
      return;
    }

    if (!paddleReady || !paddle) {
      toast.error(t("errors.notConfigured"));
      return;
    }

    const priceId = priceIds[planId]?.trim();
    if (!priceId) {
      toast.error(t("errors.priceNotConfigured"));
      return;
    }

    const email = session.user.email?.trim();
    const userId = session.user.id?.trim();
    if (!email) {
      toast.error(t("errors.loginRequired"));
      return;
    }
    if (!userId) {
      toast.error(t("errors.sessionUserMissing"));
      return;
    }

    setLoadingPlan(planId);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const successUrl = `${origin}/${locale}/pricing?checkout=success`;

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        customData: { userId },
        settings: {
          displayMode: "overlay",
          successUrl,
        },
      });
    } catch {
      toast.error(t("errors.checkoutOpenFailed"));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-white transition-colors">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {checkoutConfigError && (
          <p className="text-center text-sm text-red-600 dark:text-red-400 mb-6 max-w-lg mx-auto">
            {t("errors.checkoutConfigFailed")}
          </p>
        )}

        {configLoaded && !checkoutConfigError && !hasAllPriceIds && (
          <p className="text-center text-sm text-amber-700 dark:text-amber-300 mb-6 max-w-lg mx-auto">
            {t("errors.priceNotConfigured")}
          </p>
        )}

        {configLoaded && !checkoutConfigError && hasAllPriceIds && !paddleReady && (
          <p className="text-center text-sm text-amber-700 dark:text-amber-300 mb-6 max-w-lg mx-auto">
            {t("errors.notConfigured")}
          </p>
        )}

        {(session?.user as { planStatus?: string } | undefined)?.planStatus === "inactive" && (
          <p className="text-center text-sm text-amber-700 dark:text-amber-300 mb-8 max-w-lg mx-auto">
            {t("inactiveHint")}
            <button
              type="button"
              onClick={() => void update()}
              className="ml-2 underline font-medium text-amber-800 dark:text-amber-200"
            >
              {t("refreshSession")}
            </button>
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((planId) => {
            const recommended = planId === "yearly";
            const billing = {
              price: t(`billing.${planId}.price`),
              period: t(`billing.${planId}.period`),
              perMonth: t(`billing.${planId}.perMonth`),
            };
            const features = t.raw(`plans.${planId}.features`) as string[];

            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-3xl border-2 p-8 transition-all duration-200
                ${
                  recommended
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                {recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    {t("recommended")}
                  </span>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {t(`plans.${planId}.name`)}
                  </h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      {billing.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{billing.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{billing.perMonth}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {features.map((feature) => (
                    <li
                      key={`${planId}-${feature}`}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <svg
                        className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(planId)}
                  disabled={
                    loadingPlan === planId ||
                    checkoutConfigError ||
                    !paddleReady ||
                    !hasAllPriceIds
                  }
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60
                  ${
                    recommended
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                      : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900"
                  }`}
                >
                  {loadingPlan === planId ? t("opening") : t("subscribe")}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">{t("guarantee")}</p>
      </div>
    </div>
  );
}
