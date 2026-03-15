export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import ChatInterface from "./ChatInterface";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  return (
    <div className="h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col transition-colors">
      <main className="flex-1 overflow-hidden relative">
        <ChatInterface user={session!.user as { id?: string; name?: string | null; email?: string | null; targetLang?: string; nativeLang?: string; role?: string }} />
      </main>
    </div>
  );
}
