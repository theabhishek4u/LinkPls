const { z } = require('zod');
require('dotenv').config({ override: true });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DUMMY_MODE: z.string().default('true'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379'),
  META_CLIENT_ID: z.string().min(1).default('your-meta-client-id'),
  META_APP_SECRET: z.string().min(1).default('your-meta-app-secret'),
  META_REDIRECT_URI: z.string().url().default('http://localhost:5000/api/auth/callback'),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1).default('your-custom-verify-token'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = { env: parsed.data };
