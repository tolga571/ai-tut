import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();

  if (!session || (session.user as any)?.role !== "admin") {
    redirect({ href: "/chat", locale });
  }

  return <>{children}</>;
}
