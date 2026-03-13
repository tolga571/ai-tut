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
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        // Fetch latest user data including plan status and native/target languages
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, planStatus: true, nativeLang: true, targetLang: true }
        });
        if (dbUser) {
          session.user.name = dbUser.name;
          (session.user as any).planStatus = dbUser.planStatus;
          (session.user as any).nativeLang = dbUser.nativeLang;
          (session.user as any).targetLang = dbUser.targetLang;
        }
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.planStatus = (user as any).planStatus;
        token.nativeLang = (user as any).nativeLang;
        token.targetLang = (user as any).targetLang;
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
