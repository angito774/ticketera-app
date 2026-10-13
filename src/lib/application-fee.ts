export interface FeeConfig {
  percentBps: number;
  fixedCents: number;
}

const MAX_BPS = 10_000;

function parseIntegerEnv(env: Record<string, string | undefined>, name: string): number {
  const raw = env[name]?.trim();
  if (!raw) throw new Error(`${name} is not set`);
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a non-negative integer`);
  return Number(raw);
}

function assertValidConfig(config: FeeConfig): void {
  const { percentBps, fixedCents } = config;
  if (!Number.isInteger(percentBps) || percentBps < 0 || percentBps > MAX_BPS) {
    throw new Error(`Invalid fee config: percentBps must be an integer between 0 and ${MAX_BPS}`);
  }
  if (!Number.isInteger(fixedCents) || fixedCents < 0) {
    throw new Error("Invalid fee config: fixedCents must be a non-negative integer");
  }
}

/** Lee `PLATFORM_FEE_BPS` y `PLATFORM_FEE_FIXED_CENTS`; no hay valores por defecto. */
export function parseFeeConfig(env: Record<string, string | undefined>): FeeConfig {
  const config = {
    percentBps: parseIntegerEnv(env, "PLATFORM_FEE_BPS"),
    fixedCents: parseIntegerEnv(env, "PLATFORM_FEE_FIXED_CENTS"),
  };
  assertValidConfig(config);
  return config;
}

/** Comisión en centavos: round(monto × bps / 10000) + fijo, acotada a [0, monto]. */
export function computeApplicationFee(amountCents: number, config: FeeConfig): number {
  assertValidConfig(config);
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }
  const fee = Math.round((amountCents * config.percentBps) / MAX_BPS) + config.fixedCents;
  return Math.min(amountCents, Math.max(0, fee));
}

export function computePayout(totalCents: number, feeCents: number): number {
  return Math.max(0, totalCents - feeCents);
}
