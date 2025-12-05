import { z } from "zod";

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL manquant"),
    NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET manquant"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET manquant"),
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL doit être une URL valide"),
    ENCRYPTION_KEY: z
      .string()
      .min(1, "ENCRYPTION_KEY manquant (clé libsodium de 32 octets en base64)"),
    SUPABASE_URL: z.string().url("SUPABASE_URL doit être une URL valide"),
    SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY manquante"),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, "SUPABASE_SERVICE_ROLE_KEY manquante"),
    STORAGE_PROVIDER: z.enum(["VERCEL_BLOB", "R2"]).default("VERCEL_BLOB"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    DEEPGRAM_API_BASE: z.string().url().default("https://api.deepgram.com"),
    ELEVENLABS_API_BASE: z.string().url().default("https://api.elevenlabs.io"),
    OPENAI_API_BASE: z.string().url().default("https://api.openai.com/v1"),
  })
  .superRefine((val, ctx) => {
    if (val.STORAGE_PROVIDER === "VERCEL_BLOB" && !val.BLOB_READ_WRITE_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BLOB_READ_WRITE_TOKEN requis avec STORAGE_PROVIDER=VERCEL_BLOB",
        path: ["BLOB_READ_WRITE_TOKEN"],
      });
    }
    if (val.STORAGE_PROVIDER === "R2") {
      const requiredR2 = [
        ["R2_BUCKET_NAME", val.R2_BUCKET_NAME],
        ["R2_ACCOUNT_ID", val.R2_ACCOUNT_ID],
        ["R2_ACCESS_KEY_ID", val.R2_ACCESS_KEY_ID],
        ["R2_SECRET_ACCESS_KEY", val.R2_SECRET_ACCESS_KEY],
      ] as const;
      requiredR2.forEach(([key, value]) => {
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} requis avec STORAGE_PROVIDER=R2`,
            path: [key],
          });
        }
      });
    }
  });

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\u274c Variables d'environnement invalides:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Configuration serveur invalide");
}

export const serverEnv = parsed.data;
