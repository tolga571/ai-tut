import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    planStatus: string;
    nativeLang: string;
    targetLang: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      planStatus: string;
      nativeLang: string;
      targetLang: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    planStatus: string;
    nativeLang: string;
    targetLang: string;
  }
}
