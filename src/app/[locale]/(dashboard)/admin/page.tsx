import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AdminDashboardPage() {
  const t = await getTranslations("adminDashboard");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    recentSignups,
    totalConversations,
    totalMessages,
    users,
  ] = await Promise.all([
    // Total registered users
    prisma.user.count(),

    // Signups in the last 7 days
    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    // Total conversation threads
    prisma.conversation.count(),

    // Total messages across all conversations
    prisma.message.count(),

    // User activity table — latest 50 users with chat + message counts
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        planStatus: true,
        createdAt: true,
        _count: {
          select: { conversations: true },
        },
      },
    }),
  ]);

  // Both queries depend only on `users` — run in parallel
  const userIds = users.map((u) => u.id);

  const [messageCounts, convsByUser] = await Promise.all([
    // Message counts grouped by conversation (across all conversations)
    prisma.message.groupBy({
      by: ["conversationId"],
      _count: { id: true },
    }),
    // All conversations belonging to the 50 displayed users
    prisma.conversation.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true },
    }),
  ]);

  // Build conversationId → messageCount map, then sum per user
  const convToMsgCount = new Map(
    messageCounts.map((r) => [r.conversationId, r._count.id])
  );

  const userMsgCount = new Map<string, number>();
  for (const conv of convsByUser) {
    const msgs = convToMsgCount.get(conv.id) ?? 0;
    userMsgCount.set(conv.userId, (userMsgCount.get(conv.userId) ?? 0) + msgs);
  }

  const metrics = [
    { label: t("metrics.totalUsers"),    value: totalUsers,         icon: "👥" },
    { label: t("metrics.recentSignups"), value: recentSignups,      icon: "🆕", note: t("metrics.last7days") },
    { label: t("metrics.totalChats"),    value: totalConversations, icon: "💬" },
    { label: t("metrics.totalMessages"), value: totalMessages,      icon: "✉️" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToChat")}
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
        <Link
          href="/admin/posts"
          className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 transition-all"
        >
          {t("managePosts")}
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Summary metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <p className="text-2xl mb-2">{m.icon}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{m.value.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{m.label}</p>
              {m.note && <p className="text-xs text-gray-500 mt-0.5">{m.note}</p>}
            </div>
          ))}
        </div>

        {/* User activity table */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("table.title")}</h2>
            <span className="text-xs text-gray-500">{t("table.showing", { count: users.length })}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">{t("table.user")}</th>
                  <th className="px-5 py-3 text-left font-medium">{t("table.joined")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("table.role")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("table.plan")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("table.chats")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("table.messages")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {users.map((user) => {
                  const isRecent = user.createdAt >= sevenDaysAgo;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {isRecent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="New" />
                          )}
                          <div className="min-w-0">
                            <p className="text-gray-900 dark:text-white font-medium truncate max-w-[160px]">
                              {user.name ?? <span className="text-gray-500 italic">{t("table.noName")}</span>}
                            </p>
                            <p className="text-gray-500 text-xs truncate max-w-[160px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {user.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-xs border ${
                          user.role === "admin"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                            : "bg-gray-200 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600/30 text-gray-600 dark:text-gray-500"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-xs border ${
                          user.planStatus === "active"
                            ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                            : "bg-gray-200 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600/30 text-gray-600 dark:text-gray-500"
                        }`}>
                          {user.planStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700 dark:text-gray-300">
                        {user._count.conversations}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700 dark:text-gray-300">
                        {userMsgCount.get(user.id) ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
