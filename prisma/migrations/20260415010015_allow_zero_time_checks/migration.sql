-- Allow zero values for student duration fields while keeping non-negative bounds.
ALTER TABLE "StudentItem"
  DROP CONSTRAINT IF EXISTS "StudentItem_prepareMinutes_positive_chk";

ALTER TABLE "StudentItem"
  DROP CONSTRAINT IF EXISTS "StudentItem_examMinutes_positive_chk";

ALTER TABLE "StudentItem"
  ADD CONSTRAINT "StudentItem_prepareMinutes_nonnegative_chk"
  CHECK ("prepareMinutes" >= 0);

ALTER TABLE "StudentItem"
  ADD CONSTRAINT "StudentItem_examMinutes_nonnegative_chk"
  CHECK ("examMinutes" >= 0);
