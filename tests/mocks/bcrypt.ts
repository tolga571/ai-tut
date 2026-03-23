/**
 * Mock bcrypt
 *
 * Test ortamında gerçek bcrypt yerine bu dosya kullanılır.
 * Gerçek bcrypt.hash() CPU-intensive (10-12 salt rounds) — testleri yavaşlatır.
 * Bu mock anında döner, güvenlik mantığı değil davranışsal doğruluk test edilir.
 */

export async function hash(_password: string, _saltRounds: number): Promise<string> {
  return '$2b$12$mockhashedpassword000000000000000000000000000000000000';
}

export async function compare(plain: string, hashed: string): Promise<boolean> {
  // Test kolaylığı: mock hash ile karşılaştırma
  if (hashed === '$2b$12$mockhashedpassword000000000000000000000000000000000000') {
    return plain.length >= 8; // gerçek olmayan ama test için yeterli
  }
  return false;
}

export const bcrypt = { hash, compare };
export default { hash, compare };
