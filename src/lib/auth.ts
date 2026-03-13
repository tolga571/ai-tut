import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          planStatus: user.planStatus,
          nativeLang: user.nativeLang,
          targetLang: user.targetLang,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        // Fetch latest user data including plan status and languages
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            name: true,
            planStatus: true,
            nativeLang: true,
            targetLang: true,
          },
        });
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.planStatus = dbUser.planStatus;
          session.user.nativeLang = dbUser.nativeLang;
          session.user.targetLang = dbUser.targetLang;
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
      }
      // Support dynamic updates (after payment)
      if (trigger === "update" && session?.planStatus) {
        token.planStatus = session.planStatus;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
