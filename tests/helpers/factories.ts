/**
 * Test Data Factories
 *
 * Tutarlı test verisi üretmek için factory fonksiyonları.
 * Her factory, override edilebilir default değerler döner.
 *
 * Kullanım:
 *   const user = createUser({ email: 'custom@test.com' });
 */

let idCounter = 1;
const nextId = () => `test-id-${idCounter++}`;

// ─── User ─────────────────────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;         // hashed
  planStatus: string;
  onboardingCompleted: boolean;
  nativeLang: string;
  targetLang: string;
  cefrLevel: string;
  createdAt: Date;
}

export function createUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: nextId(),
    name: 'Test User',
    email: `user-${idCounter}@example.com`,
    password: '$2b$12$hashedpassword',
    planStatus: 'inactive',
    onboardingCompleted: false,
    nativeLang: 'tr',
    targetLang: 'en',
    cefrLevel: 'A1',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ─── Register payload ─────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function createRegisterPayload(
  overrides: Partial<RegisterPayload> = {}
): RegisterPayload {
  return {
    name: 'Test User',
    email: `register-${idCounter++}@example.com`,
    password: 'securePass123',
    confirmPassword: 'securePass123',
    ...overrides,
  };
}

// ─── Vocabulary Word ───────────────────────────────────────────────────────────

export interface TestVocabularyWord {
  id: string;
  userId: string;
  word: string;
  translation: string;
  context: string;
  reviewCount: number;
  correctStreak: number;
  nextReviewAt: Date | null;
  createdAt: Date;
}

export function createVocabularyWord(
  overrides: Partial<TestVocabularyWord> = {}
): TestVocabularyWord {
  return {
    id: nextId(),
    userId: nextId(),
    word: 'ephemeral',
    translation: 'geçici',
    context: 'The ephemeral beauty of cherry blossoms.',
    reviewCount: 0,
    correctStreak: 0,
    nextReviewAt: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export interface TestConversation {
  id: string;
  userId: string;
  title: string;
  topicId: string | null;
  topicLabel: string | null;
  createdAt: Date;
}

export function createConversation(
  overrides: Partial<TestConversation> = {}
): TestConversation {
  return {
    id: nextId(),
    userId: nextId(),
    title: 'Test Conversation',
    topicId: null,
    topicLabel: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ─── Password Reset Token ─────────────────────────────────────────────────────

export interface TestPasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export function createPasswordResetToken(
  overrides: Partial<TestPasswordResetToken> = {}
): TestPasswordResetToken {
  return {
    id: nextId(),
    userId: nextId(),
    token: 'test-reset-token-abc123',
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 saat sonra
    ...overrides,
  };
}
