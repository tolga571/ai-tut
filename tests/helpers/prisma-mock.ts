/**
 * Prisma Client Mock
 *
 * Her test dosyasında `mockPrisma` import et ve
 * ilgili method'ları override et.
 *
 * Örnek kullanım:
 *   import { mockPrisma, resetMocks } from '../helpers/prisma-mock.ts';
 *   mockPrisma.user.findUnique = async () => null;
 */

type MockFn = (...args: unknown[]) => unknown;

const noop: MockFn = async () => null;

function makeModelMock() {
  return {
    findUnique:   noop as MockFn,
    findMany:     noop as MockFn,
    findFirst:    noop as MockFn,
    create:       noop as MockFn,
    update:       noop as MockFn,
    upsert:       noop as MockFn,
    delete:       noop as MockFn,
    deleteMany:   noop as MockFn,
    count:        noop as MockFn,
  };
}

/** Mock Prisma client — tüm model method'ları override edilebilir */
export const mockPrisma = {
  user:              makeModelMock(),
  conversation:      makeModelMock(),
  message:           makeModelMock(),
  vocabularyWord:    makeModelMock(),
  post:              makeModelMock(),
  passwordResetToken: makeModelMock(),
  subscription:      makeModelMock(),
  $disconnect:       async () => {},
  $connect:          async () => {},
};

/** Her test öncesi mock'ları sıfırla */
export function resetMocks() {
  const models = [
    'user', 'conversation', 'message', 'vocabularyWord',
    'post', 'passwordResetToken', 'subscription',
  ] as const;

  for (const model of models) {
    const m = mockPrisma[model] as Record<string, MockFn>;
    for (const method of Object.keys(m)) {
      m[method] = noop;
    }
  }
}
