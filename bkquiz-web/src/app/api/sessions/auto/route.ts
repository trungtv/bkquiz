import { NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { buildSessionSnapshotIfNeeded } from '@/server/quizSnapshot';

/**
 * API endpoint để tự động start/end sessions
 * Có thể được gọi từ:
 * - Cron job (Vercel Cron, external cron service)
 * - Client polling (từ teacher screen)
 * - Webhook từ external scheduler
 */
export async function POST(req: Request) {
  // Vercel Cron automatically sends Authorization: Bearer <CRON_SECRET> header
  // Also check user agent for additional verification
  const authHeader = req.headers.get('authorization');
  const userAgent = req.headers.get('user-agent');
  const apiKey = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require authentication
  // Vercel Cron will send: Authorization: Bearer <CRON_SECRET>
  // User agent will be: vercel-cron/1.0
  if (apiKey) {
    const hasValidAuth = authHeader === `Bearer ${apiKey}`;
    const isVercelCron = userAgent === 'vercel-cron/1.0';

    // Allow if has valid auth OR is from Vercel Cron (for extra safety)
    if (!hasValidAuth && !isVercelCron) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
  }
  // If no CRON_SECRET is set, allow all requests (dev mode)

  const now = new Date();
  const results = {
    autoStarted: [] as string[],
    autoEnded: [] as string[],
    errors: [] as string[],
  };

  try {
    // 1. Auto-start sessions: Find sessions in 'lobby' status with scheduledStartAt <= now
    // We need to check settings.scheduledStartAt, not just startedAt
    const allLobbySessions = await prisma.quizSession.findMany({
      where: {
        status: 'lobby',
      },
    });

    const sessionsToStart = allLobbySessions.filter((session) => {
      const settings = session.settings as { scheduledStartAt?: string } | null;
      if (!settings?.scheduledStartAt) {
        return false;
      }
      const scheduledTime = new Date(settings.scheduledStartAt);
      return scheduledTime <= now;
    });

    for (const session of sessionsToStart) {
      try {
        // Check if session has scheduledStartAt in settings
        const settings = session.settings as { scheduledStartAt?: string } | null;
        if (settings?.scheduledStartAt) {
          const scheduledTime = new Date(settings.scheduledStartAt);
          if (scheduledTime <= now) {
            // Auto-start the session (same logic as manual start)
            await prisma.quizSession.update({
              where: { id: session.id },
              data: {
                status: 'active',
                startedAt: now, // Update to actual start time
                endedAt: null,
              },
            });

            // Build session snapshot (same as manual start) - this creates question snapshots
            try {
              await buildSessionSnapshotIfNeeded(session.id);
            } catch (snapshotErr) {
              console.error(`Error building snapshot for session ${session.id}:`, snapshotErr);
              // Continue even if snapshot build fails - it might already exist
            }

            results.autoStarted.push(session.id);
          }
        }
      } catch (err) {
        results.errors.push(`Failed to start session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Auto-end sessions: Find active sessions that should be ended
    // End time = startedAt + durationSeconds + bufferMinutes
    const activeSessions = await prisma.quizSession.findMany({
      where: {
        status: 'active',
        startedAt: { not: null },
      },
    });

    for (const session of activeSessions) {
      try {
        if (!session.startedAt) {
          continue;
        }

        const settings = session.settings as { durationSeconds?: number; bufferMinutes?: number } | null;
        const durationSeconds = settings?.durationSeconds;
        const bufferMinutes = settings?.bufferMinutes ?? 5; // Default 5 minutes

        if (durationSeconds) {
          const endTime = new Date(session.startedAt.getTime() + durationSeconds * 1000 + bufferMinutes * 60 * 1000);
          if (endTime <= now) {
            // Auto-end the session
            await prisma.quizSession.update({
              where: { id: session.id },
              data: {
                status: 'ended',
                endedAt: now,
              },
            });
            results.autoEnded.push(session.id);
          }
        }
      } catch (err) {
        results.errors.push(`Failed to end session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        ...results,
      },
      { status: 500 },
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Auto session management endpoint',
    timestamp: new Date().toISOString(),
  });
}
