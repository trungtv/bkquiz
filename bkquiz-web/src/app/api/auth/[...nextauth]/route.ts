import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// Ensure Node.js runtime for Vercel
export const runtime = 'nodejs';

// Ensure dynamic rendering (not static)
export const dynamic = 'force-dynamic';
