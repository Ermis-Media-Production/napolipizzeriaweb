export const COOKIE_NAME = "app_session_id";

// ── Pricing constants ─────────────────────────────────────────────────────────
/** 3% convenience fee applied to the food subtotal (non-taxable). */
export const CONVENIENCE_FEE_RATE = 0.03;
/** Nevada combined sales tax rate (Clark County): 8.375%. */
export const NV_SALES_TAX_RATE = 0.08375;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
