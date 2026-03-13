import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <NextIntlClientProvider messages={messages}>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </div>
  );
}
