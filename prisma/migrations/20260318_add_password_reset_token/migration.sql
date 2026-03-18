-- Add password reset tokens for "forgot password" flow

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_token_key" UNIQUE ("token")
);

CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

