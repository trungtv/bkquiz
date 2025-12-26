import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

import { prisma } from '@/server/prisma';
import { CustomPrismaAdapter } from '@/lib/customPrismaAdapter';

// CRITICAL: Define NextAuth config directly in route handler
// This ensures Next.js recognizes it as a valid Route Handler in production
// Do NOT import handlers from another file - define everything here
const authOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: CustomPrismaAdapter(prisma),
  session: { strategy: 'database' as const },
  pages: {
    signIn: '/sign-in',
  },
  trustHost: true, // Required for Vercel production
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
    async session({ session, user }: { session: any; user: any }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: { user: any }) {
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
};

// Create NextAuth handler and get handlers
const { handlers } = NextAuth(authOptions);

// CRITICAL: Export GET and POST as named exports directly
// This is the ONLY way Next.js App Router recognizes Route Handlers in production
export const GET = handlers.GET;
export const POST = handlers.POST;

// Ensure Node.js runtime for Vercel
export const runtime = 'nodejs';

// Ensure dynamic rendering (not static)
export const dynamic = 'force-dynamic';
