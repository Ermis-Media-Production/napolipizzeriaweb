export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// Authorize.net
export const AUTHNET_ENV = {
  apiLoginId: process.env.AUTHORIZENET_API_LOGIN_ID ?? "",
  transactionKey: process.env.AUTHORIZENET_TRANSACTION_KEY ?? "",
  isSandbox: process.env.AUTHORIZENET_SANDBOX !== "false", // default to sandbox
};

// Uber Direct
export const UBER_ENV = {
  clientId: process.env.UBER_CLIENT_ID ?? "",
  clientSecret: process.env.UBER_CLIENT_SECRET ?? "",
  customerId: process.env.UBER_CUSTOMER_ID ?? "",
  isSandbox: process.env.UBER_IS_SANDBOX !== "false", // default to sandbox
};

// Clover POS
export const CLOVER_ENV = {
  apiToken: process.env.CLOVER_API_TOKEN ?? "",
  merchantId: process.env.CLOVER_MERCHANT_ID ?? "",
  // Production: https://api.clover.com  |  Sandbox: https://apisandbox.dev.clover.com
  baseUrl: process.env.CLOVER_SANDBOX === "true"
    ? "https://apisandbox.dev.clover.com"
    : "https://api.clover.com",
};

// DoorDash Drive
export const DOORDASH_ENV = {
  developerId: process.env.DOORDASH_DEVELOPER_ID ?? "",
  keyId: process.env.DOORDASH_KEY_ID ?? "",
  signingSecret: process.env.DOORDASH_SIGNING_SECRET ?? "",
  isSandbox: process.env.DOORDASH_ENV !== "production", // default to sandbox
  baseUrl: "https://openapi.doordash.com",
};

// Stripe
export const STRIPE_ENV = {
  secretKey: process.env.STRIPE_SECRET_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
};
