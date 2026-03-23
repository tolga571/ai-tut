/**
 * ESM Loader Hook
 *
 * 1. @/ path alias resolver  (@/ → src/)
 * 2. Test module interceptor (NODE_ENV=test → tests/mocks/)
 * 3. next/* module bridge    (next/server → next/server.js CJS compat)
 *
 * Node.js 22+ only. Used via --experimental-loader flag.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC_ROOT     = path.join(PROJECT_ROOT, 'src');
const MOCKS_ROOT   = path.join(PROJECT_ROOT, 'tests', 'mocks');
const NODE_MODULES = path.join(PROJECT_ROOT, 'node_modules');
const IS_TEST      = process.env.NODE_ENV === 'test';

/**
 * Modules intercepted during tests → mapped to our mock files.
 * Key: absolute path of original source file
 * Value: absolute path of mock file
 */
const TEST_MODULE_OVERRIDES = {
  [path.join(SRC_ROOT, 'lib', 'prisma.ts')]:  path.join(MOCKS_ROOT, 'prisma.ts'),
  [path.join(SRC_ROOT, 'lib', 'email.ts')]:   path.join(MOCKS_ROOT, 'email.ts'),
};

/**
 * npm package-level mocks (intercepted by specifier name, not file path).
 * Checked BEFORE @/ alias expansion — these are bare module names.
 */
const NPM_PACKAGE_MOCKS = IS_TEST ? {
  'bcrypt': path.join(MOCKS_ROOT, 'bcrypt.ts'),
} : {};

/**
 * next/* sub-paths that need explicit file resolution
 * (Next.js doesn't properly expose ESM exports in all environments)
 */
const NEXT_MODULE_MAP = {
  'next/server':        path.join(NODE_MODULES, 'next', 'server.js'),
  'next/headers':       path.join(NODE_MODULES, 'next', 'dist', 'client', 'components', 'headers.js'),
  'next/navigation':    path.join(NODE_MODULES, 'next', 'dist', 'client', 'components', 'navigation.js'),
  'next-auth':          path.join(NODE_MODULES, 'next-auth', 'index.js'),
  'next-auth/react':    path.join(NODE_MODULES, 'next-auth', 'react', 'index.js'),
};

export async function resolve(specifier, context, nextResolve) {
  // ── 0. npm package mocks (bcrypt, nodemailer, vb.) ──────────────────────────
  if (NPM_PACKAGE_MOCKS[specifier]) {
    const mockPath = NPM_PACKAGE_MOCKS[specifier];
    if (existsSync(mockPath)) {
      return { shortCircuit: true, url: 'file://' + mockPath };
    }
  }

  // ── 1. next/* bridge ────────────────────────────────────────────────────────
  if (NEXT_MODULE_MAP[specifier]) {
    const target = NEXT_MODULE_MAP[specifier];
    if (existsSync(target)) {
      return { shortCircuit: true, url: 'file://' + target };
    }
  }

  // ── 2. @/ alias expansion ───────────────────────────────────────────────────
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2); // strip '@/'

    // Remove trailing .ts / .tsx if already present (avoid double-extension)
    const relBase = rel.replace(/\.(tsx?)$/, '');

    const candidates = [
      path.join(SRC_ROOT, relBase + '.ts'),
      path.join(SRC_ROOT, relBase + '.tsx'),
      path.join(SRC_ROOT, relBase, 'index.ts'),
      path.join(SRC_ROOT, relBase, 'index.tsx'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        // ── 3. Test module override ──────────────────────────────────────────
        if (IS_TEST && TEST_MODULE_OVERRIDES[candidate]) {
          const mockPath = TEST_MODULE_OVERRIDES[candidate];
          if (existsSync(mockPath)) {
            return { shortCircuit: true, url: 'file://' + mockPath };
          }
        }
        return { shortCircuit: true, url: 'file://' + candidate };
      }
    }
    // Not found — Node.js will give a clear error
  }

  return nextResolve(specifier, context);
}
