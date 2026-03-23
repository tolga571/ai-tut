/**
 * Mock Prisma Client
 *
 * Test ortamında @/lib/prisma yerine bu dosya kullanılır.
 * Her test dosyası state'i global olarak değiştirebilir.
 * Testler arası izolasyon için beforeEach'de resetPrismaState() çağır.
 */

// ─── State ────────────────────────────────────────────────────────────────────

type MockFn = (...args: unknown[]) => Promise<unknown>;
const noop: MockFn = async () => null;

interface ModelMock {
  findUnique: MockFn;
  findMany: MockFn;
  findFirst: MockFn;
  create: MockFn;
  update: MockFn;
  upsert: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  count: MockFn;
}

function makeModel(defaults: Partial<ModelMock> = {}): ModelMock {
  return {
    findUnique: noop,
    findMany: async () => [],
    findFirst: noop,
    create: noop,
    update: noop,
    upsert: noop,
    delete: noop,
    deleteMany: async () => ({ count: 0 }),
    count: async () => 0,
    ...defaults,
  };
}

// ─── Mock state (mutable) ─────────────────────────────────────────────────────

export const __mocks__ = {
  user: makeModel(),
  conversation: makeModel(),
  message: makeModel(),
  vocabularyWord: makeModel(),
  post: makeModel(),
  passwordResetToken: makeModel(),
  subscription: makeModel(),
};

/** Test'ler arası izolasyon için tüm mock'ları varsayılana sıfırla */
export function resetPrismaState() {
  const modelNames = Object.keys(__mocks__) as Array<keyof typeof __mocks__>;
  for (const name of modelNames) {
    __mocks__[name] = makeModel();
  }
}

// ─── Proxy — model property erişimini __mocks__ üzerinden yönlendir ───────────

export const prisma = new Proxy({} as typeof __mocks__ & {
  $disconnect: () => Promise<void>;
  $connect: () => Promise<void>;
}, {
  get(_target, prop: string) {
    if (prop === '$disconnect' || prop === '$connect') return async () => {};
    const model = __mocks__[prop as keyof typeof __mocks__];
    if (model) return model;
    // Bilinmeyen model — tüm method'ları noop olarak döndür
    return makeModel();
  },
});
