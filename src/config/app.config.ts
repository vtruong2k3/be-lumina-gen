export const appConfig = () => {
  const port = parseInt(process.env.PORT || '5000', 10);

  // Google callback URL is auto-built from PORT — no need to set GOOGLE_CALLBACK_URL in .env
  const googleCallbackUrl =
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${port}/api/auth/callback/google`;

  return {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontend: {
      url: process.env.FRONTEND_URL!,
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'please_change_me_in_production',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ||
        'please_change_refresh_me_in_production',
      accessExpiry: '15m',
      refreshExpiry: '7d',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: googleCallbackUrl,
    },
    chainhub: {
      legacyUrl: process.env.CHAINHUB_API!,
      legacyKey: process.env.CHAINHUB_API_KEY!,
      baseUrl: process.env.BASE_API!,
      baseKey: process.env.BASE_API_KEY!,
      gptUrl: process.env.CHAINHUB_GPT_URL!,
    },
  };
};

export type AppConfig = ReturnType<typeof appConfig>;
