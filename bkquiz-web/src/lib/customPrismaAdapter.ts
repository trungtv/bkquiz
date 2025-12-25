import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import type { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';

/**
 * Custom PrismaAdapter wrapper để transform snake_case field names sang camelCase
 * Fix lỗi PrismaAdapter truyền access_token thay vì accessToken
 */
export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter;

  // Transform snake_case sang camelCase cho Account fields
  function transformAccountData(data: Record<string, unknown>): Record<string, unknown> {
    if (!data) {
      return data;
    }

    const transformed: Record<string, unknown> = { ...data };

    // Transform snake_case sang camelCase
    if ('access_token' in transformed) {
      transformed.accessToken = transformed.access_token;
      delete transformed.access_token;
    }
    if ('id_token' in transformed) {
      transformed.idToken = transformed.id_token;
      delete transformed.id_token;
    }
    if ('expires_at' in transformed) {
      transformed.expiresAt = transformed.expires_at;
      delete transformed.expires_at;
    }
    if ('token_type' in transformed) {
      transformed.tokenType = transformed.token_type;
      delete transformed.token_type;
    }
    if ('refresh_token' in transformed) {
      transformed.refreshToken = transformed.refresh_token;
      delete transformed.refresh_token;
    }
    if ('session_state' in transformed) {
      transformed.sessionState = transformed.session_state;
      delete transformed.session_state;
    }

    return transformed;
  }

  return {
    ...baseAdapter,
    async linkAccount(data: AdapterAccount) {
      const transformed = transformAccountData(data as Record<string, unknown>) as AdapterAccount;
      return baseAdapter.linkAccount!(transformed);
    },
  } as Adapter;
}
