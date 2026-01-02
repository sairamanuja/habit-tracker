import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth/next";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session?.user) session.user.id = user.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
