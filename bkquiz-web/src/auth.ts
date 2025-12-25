import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

import { prisma } from '@/server/prisma';
import { CustomPrismaAdapter } from '@/lib/customPrismaAdapter';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: CustomPrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Cho phép tự động link account với cùng email (Google đã verify email)
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn() {
      // Allow sign in
      return true;
    },
    async session({ session, user }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Khi user mới được tạo (lần đầu đăng nhập), tự động tạo role "student"
      if (!user.id) return;
      try {
        await prisma.userRole.upsert({
          where: {
            userId_role: {
              userId: user.id,
              role: 'student',
            },
          },
          update: {},
          create: {
            userId: user.id,
            role: 'student',
          },
        });
      } catch (error) {
        // Ignore nếu role đã tồn tại (race condition)
        console.error('Error creating default role:', error);
      }
    },
  },
});
