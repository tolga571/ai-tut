import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Migrate/deploy işlemleri için pooler yerine direct bağlantı daha stabil olabiliyor.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
