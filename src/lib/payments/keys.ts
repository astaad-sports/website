// Which Razorpay keys pay for an order. A pure function, kept apart from the
// API client so it can be unit tested without the server-only guard.

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

type Env = Record<string, string | undefined>;

function pair(keyId: string | undefined, keySecret: string | undefined): RazorpayKeys | null {
  return keyId && keySecret ? { keyId, keySecret } : null;
}

function isTestKey(keys: RazorpayKeys | null): keys is RazorpayKeys {
  return keys?.keyId.startsWith("rzp_test_") ?? false;
}

/**
 * The store's keys (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET), or for a test
 * account's order, test-mode keys: RAZORPAY_TEST_KEY_ID and
 * RAZORPAY_TEST_KEY_SECRET, else the store's own keys while they are test
 * keys. A test order never gets live keys, so it can never take real money.
 */
export function razorpayKeys(env: Env, options: { test?: boolean } = {}): RazorpayKeys | null {
  const store = pair(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
  if (!options.test) return store;
  const test = pair(env.RAZORPAY_TEST_KEY_ID, env.RAZORPAY_TEST_KEY_SECRET);
  if (isTestKey(test)) return test;
  return isTestKey(store) ? store : null;
}
