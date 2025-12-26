import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@/server/prisma';
import { CustomPrismaAdapter } from '@/lib/customPrismaAdapter';

const { handlers } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: CustomPrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/sign-in' },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

export const { GET, POST } = handlers;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

