import { authenticator } from 'otplib';

export function computeTotp(params: { secret: string; stepSeconds: number; nowMs?: number }) {
  const nowMs = params.nowMs ?? Date.now();
  const stepMs = params.stepSeconds * 1000;
  const elapsedInStep = nowMs % stepMs;
  const expiresInSeconds = Math.max(0, Math.ceil((stepMs - elapsedInStep) / 1000));

  authenticator.options = { step: params.stepSeconds };
  const token = authenticator.generate(params.secret);

  return { token, expiresInSeconds };
}

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function verifyTotp(params: { secret: string; stepSeconds: number; token: string; window?: number }) {
  authenticator.options = { step: params.stepSeconds, window: params.window ?? 1 };
  return authenticator.check(params.token, params.secret);
}
// EOF
