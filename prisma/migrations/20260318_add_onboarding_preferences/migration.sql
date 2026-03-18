-- Add lightweight onboarding preferences (goal + interest)

ALTER TABLE "User"
ADD COLUMN "learningGoal" TEXT,
ADD COLUMN "interestArea" TEXT;

