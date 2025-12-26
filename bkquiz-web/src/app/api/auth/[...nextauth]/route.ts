import { handlers } from '@/auth';

// CRITICAL: Export GET and POST as named exports directly from handlers
// This is the ONLY way Next.js App Router recognizes Route Handlers in production
// Do NOT use destructuring assignment - export directly to avoid tree-shaking issues
export const GET = handlers.GET;
export const POST = handlers.POST;

// Ensure Node.js runtime for Vercel
export const runtime = 'nodejs';

// Ensure dynamic rendering (not static)
export const dynamic = 'force-dynamic';
