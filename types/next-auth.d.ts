import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      planStatus: string;
      nativeLang: string;
      targetLang: string;
      cefrLevel: string;
      onboardingCompleted?: boolean;
      xp?: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    planStatus: string;
    nativeLang: string;
    targetLang: string;
    cefrLevel: string;
    onboardingCompleted?: boolean;
    xp?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    planStatus: string;
    nativeLang: string;
    targetLang: string;
    cefrLevel: string;
    onboardingCompleted?: boolean;
    xp?: number;
  }
}
