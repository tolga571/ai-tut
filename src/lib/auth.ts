import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user || !user?.password) {
            throw new Error("Invalid credentials");
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            throw new Error("Invalid credentials");
          }

          return user;
        } catch (error) {
          // Preserve credential error, map infra/db errors to a clear message.
          if (error instanceof Error && error.message === "Invalid credentials") {
            throw error;
          }
          console.error("[AUTH_AUTHORIZE_DB]", error);
          throw new Error("Database connection error. Please try again.");
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        try {
          // Fetch latest user data including plan status and native/target languages
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { name: true, planStatus: true, nativeLang: true, targetLang: true, cefrLevel: true, role: true }
          });
          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.planStatus = dbUser.planStatus;
            session.user.nativeLang = dbUser.nativeLang;
            session.user.targetLang = dbUser.targetLang;
            session.user.cefrLevel = dbUser.cefrLevel;
            session.user.role = dbUser.role;
          }
        } catch (error) {
          console.error("[AUTH_SESSION_DB]", error);
          // Fallback to token values if DB is temporarily unavailable.
          session.user.planStatus = token.planStatus;
          session.user.nativeLang = token.nativeLang;
          session.user.targetLang = token.targetLang;
          session.user.cefrLevel = token.cefrLevel;
          session.user.role = token.role;
        }
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.planStatus = user.planStatus;
        token.nativeLang = user.nativeLang;
        token.targetLang = user.targetLang;
        token.cefrLevel = user.cefrLevel;
        token.role = user.role;
      }
      // If we want to support dynamic updates (after payment)
      if (trigger === "update" && session?.planStatus) {
        token.planStatus = session.planStatus;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}
