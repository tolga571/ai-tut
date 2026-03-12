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

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <main className="flex-1 overflow-hidden relative">
        <ChatInterface user={session.user} />
      </main>
    </div>
  );
}
