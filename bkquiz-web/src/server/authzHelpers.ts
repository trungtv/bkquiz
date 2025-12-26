import { NextResponse } from 'next/server';
import { AuthorizationError } from './authz';

/**
 * Helper function to handle authorization errors in API routes
 * Returns appropriate NextResponse based on error type
 */
export function handleAuthorizationError(error: unknown): NextResponse | null {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.code },
      { status: error.statusCode },
    );
  }
  return null;
}

/**
 * Wrapper for API route handlers to catch and handle authorization errors
 * Usage:
 * ```ts
 * export async function GET(req: Request) {
 *   return withAuthz(async () => {
 *     const { userId } = await requireUser();
 *     await requireTeacher(userId);
 *     // ... rest of handler
 *     return NextResponse.json({ data: ... });
 *   });
 * }
 * ```
 */
export async function withAuthz<T extends NextResponse>(
  handler: () => Promise<T>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    const authzResponse = handleAuthorizationError(error);
    if (authzResponse) {
      return authzResponse;
    }
    // Re-throw if not an authorization error
    throw error;
  }
}
