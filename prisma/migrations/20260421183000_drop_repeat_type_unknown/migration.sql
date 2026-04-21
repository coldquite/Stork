-- Migrate legacy UNKNOWN values before tightening enum domain.
UPDATE "StudentItem"
SET "repeatType" = 'BOTH'
WHERE "repeatType" = 'UNKNOWN';

-- PostgreSQL enum values cannot be removed in-place in a portable way,
-- so recreate the enum without UNKNOWN and cast the column.
ALTER TYPE "RepeatType" RENAME TO "RepeatType_old";

CREATE TYPE "RepeatType" AS ENUM ('NONE', 'THESIS_DEFENSE', 'ORAL_EXAM', 'BOTH');

ALTER TABLE "StudentItem"
ALTER COLUMN "repeatType" TYPE "RepeatType"
USING ("repeatType"::text::"RepeatType");

DROP TYPE "RepeatType_old";
