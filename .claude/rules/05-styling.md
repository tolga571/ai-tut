# 05 — Styling Rules (TailwindCSS)

## Core Rule

> Separate CSS/SCSS files are FORBIDDEN. All styling must use Tailwind utility classes.
> The only exception: global reset and CSS custom properties inside `tailwind.config` or `globals.css`.

---

## cn() Utility (Required)

```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

---

## Component Structure

```typescript
import { cn } from '@/utils/cn';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button = ({ variant = 'primary', size = 'md', isLoading, disabled, className, children, onClick }: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className={cn(
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500':   variant === 'primary',
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500': variant === 'secondary',
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':      variant === 'danger',
        'bg-transparent text-gray-600 hover:bg-gray-100':                  variant === 'ghost',
      },
      {
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2 text-sm':   size === 'md',
        'px-6 py-3 text-base': size === 'lg',
      },
      className
    )}
  >
    {isLoading && <Spinner className="mr-2" />}
    {children}
  </button>
);
```

---

## Design Tokens (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## Responsive Design — Mobile-First (Required)

```typescript
// ❌ WRONG — desktop-first
<div className="grid-cols-3 sm:grid-cols-1">

// ✅ CORRECT — mobile-first
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
// Order: base → sm → md → lg → xl → 2xl
```

---

## Common Layout Patterns

```typescript
// Page layout
<div className="min-h-screen bg-gray-50">
  <Header />
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
</div>

// Card
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

// Flex row
<div className="flex items-center justify-between gap-4">

// Vertical stack
<div className="flex flex-col gap-4">
```

---

## Forbidden Patterns

```typescript
// ❌ Inline style
<div style={{ color: 'red', marginTop: 16 }}>

// ❌ Overusing arbitrary values
<div className="w-[347px] mt-[23px]">

// ❌ Separate CSS module file
// styles/Button.module.css → FORBIDDEN

// ✅ globals.css — only Tailwind directives
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root { --custom-var: value; }
}
```
