const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

const createMigrationsTable = async () => {
  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı başarılı');

    const createSchema = `
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    `;

    const createTable = `
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version BIGINT NOT NULL PRIMARY KEY,
        statements TEXT[] NOT NULL,
        name TEXT NOT NULL UNIQUE,
        executed_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createSchema);
    console.log('✅ Schema oluşturuldu: supabase_migrations');

    await client.query(createTable);
    console.log('✅ Tablo oluşturuldu: schema_migrations');

    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'supabase_migrations'
    `);
    console.log('📊 Supabase migrations tablolarındaki tablolar:', result.rows);

    await client.end();
    console.log('✅ Veritabanı bağlantısı kapatıldı');
    console.log('\n🎉 Hazır! Tarayıcıyı yenile ve giriş yap.');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
};

createMigrationsTable();
