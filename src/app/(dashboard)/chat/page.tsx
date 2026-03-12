export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "./ChatInterface";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // NOTE: For MVP, we pass the user data to the client component.
  // In a real app we might redirect to /pricing if planStatus is inactive.
  if ((session.user as any).planStatus !== "active") {
    // redirect("/pricing");
    // keeping it unlocked for now to allow testing before paddle integration
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between z-10">
        <div className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AiTut Chat
        </div>
        <div className="text-sm text-gray-400">
          Öğrenilen dil: <span className="text-white font-medium">{(session.user as any).targetLang?.toUpperCase() || 'EN'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <ChatInterface user={session.user} />
      </main>
    </div>
  );
}
