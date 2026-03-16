-- Add lightweight review/spaced-repetition fields for VocabularyWord

ALTER TABLE "VocabularyWord"
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "correctStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN "nextReviewAt" TIMESTAMP(3);

