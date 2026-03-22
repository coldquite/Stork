-- CreateEnum
CREATE TYPE "TimeScheduleType" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "CommitteeItemType" AS ENUM ('STUDENT', 'PAUSE');

-- CreateEnum
CREATE TYPE "RepeatType" AS ENUM ('NONE', 'THESIS_DEFENSE', 'ORAL_EXAM', 'BOTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ThesisLanguage" AS ENUM ('CZECH', 'ENGLISH', 'SLOVAK');

-- CreateTable
CREATE TABLE "TimeSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" "TimeScheduleType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "timeScheduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL DEFAULT 525,
    "date" TIMESTAMP(3),
    "room" TEXT,
    "secretaryName" TEXT,
    "invigilators" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeItem" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "type" "CommitteeItemType" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CommitteeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentItem" (
    "itemId" TEXT NOT NULL,
    "personalNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobilePhone" TEXT,
    "titlesBefore" TEXT,
    "titlesAfter" TEXT,
    "specialization" TEXT NOT NULL,
    "thesisTitleLocal" TEXT,
    "thesisTitleEn" TEXT,
    "thesisLanguage" "ThesisLanguage",
    "supervisorName" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "repeatType" "RepeatType" NOT NULL DEFAULT 'NONE',
    "elsa" BOOLEAN NOT NULL DEFAULT false,
    "prepareMinutes" INTEGER NOT NULL DEFAULT 45,
    "examMinutes" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "StudentItem_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "PauseItem" (
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "PauseItem_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE INDEX "TimeSchedule_type_updatedAt_idx" ON "TimeSchedule"("type", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Committee_timeScheduleId_code_key" ON "Committee"("timeScheduleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Committee_timeScheduleId_sortOrder_key" ON "Committee"("timeScheduleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeItem_committeeId_position_key" ON "CommitteeItem"("committeeId", "position");

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_timeScheduleId_fkey" FOREIGN KEY ("timeScheduleId") REFERENCES "TimeSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeItem" ADD CONSTRAINT "CommitteeItem_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentItem" ADD CONSTRAINT "StudentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CommitteeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PauseItem" ADD CONSTRAINT "PauseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CommitteeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Manually written domain checks (Prisma ORM doesn't support them)
-- ============================================================
-- Time in minutes from midnight: 0..1439
ALTER TABLE "Committee"
  ADD CONSTRAINT "Committee_startMinute_range_chk"
  CHECK ("startMinute" BETWEEN 0 AND 1439);

-- Sort position cannot be negative
ALTER TABLE "Committee"
  ADD CONSTRAINT "Committee_sortOrder_nonnegative_chk"
  CHECK ("sortOrder" >= 0);

-- Item position inside committee cannot be negative
ALTER TABLE "CommitteeItem"
  ADD CONSTRAINT "CommitteeItem_position_nonnegative_chk"
  CHECK ("position" >= 0);

-- Durations must be positive
ALTER TABLE "StudentItem"
  ADD CONSTRAINT "StudentItem_prepareMinutes_positive_chk"
  CHECK ("prepareMinutes" > 0);

ALTER TABLE "StudentItem"
  ADD CONSTRAINT "StudentItem_examMinutes_positive_chk"
  CHECK ("examMinutes" > 0);

ALTER TABLE "PauseItem"
  ADD CONSTRAINT "PauseItem_durationMinutes_positive_chk"
  CHECK ("durationMinutes" > 0);


-- ============================================================
-- CommitteeItem subtype integrity (CTI pattern)
-- Exactly one subtype row must exist for each CommitteeItem:
-- - type = STUDENT  -> StudentItem exists, PauseItem does not
-- - type = PAUSE    -> PauseItem exists, StudentItem does not
--
-- NOTE: This cannot be enforced with a plain CHECK constraint,
-- because CHECK cannot safely validate data across tables.
-- Therefore we use deferred constraint triggers.
-- ============================================================

CREATE OR REPLACE FUNCTION "check_committee_item_subtype_consistency"(p_item_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_type "CommitteeItemType";
  v_has_student BOOLEAN;
  v_has_pause BOOLEAN;
BEGIN
  -- Read the CommitteeItem row and its type.
  -- If it was already deleted (for example by cascade), stop the check.
  SELECT ci."type"
  INTO v_type
  FROM "CommitteeItem" ci
  WHERE ci.id = p_item_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Detect subtype presence
  SELECT EXISTS(SELECT 1 FROM "StudentItem" s WHERE s."itemId" = p_item_id)
  INTO v_has_student;

  SELECT EXISTS(SELECT 1 FROM "PauseItem" p WHERE p."itemId" = p_item_id)
  INTO v_has_pause;

  -- XOR: must be exactly one
  IF v_has_student = v_has_pause THEN
    RAISE EXCEPTION
      'CommitteeItem % must have exactly one subtype row (StudentItem xor PauseItem)',
      p_item_id;
  END IF;

  IF v_type = 'STUDENT'::"CommitteeItemType" AND NOT v_has_student THEN
    RAISE EXCEPTION 'CommitteeItem % has type STUDENT but no StudentItem row', p_item_id;
  ELSIF v_type = 'PAUSE'::"CommitteeItemType" AND NOT v_has_pause THEN
    RAISE EXCEPTION 'CommitteeItem % has type PAUSE but no PauseItem row', p_item_id;
  END IF;
END;
$$;

-- Trigger adapter for writes directly on CommitteeItem.
-- Verifies consistency after insert/update/delete of the parent row.
CREATE OR REPLACE FUNCTION "trg_check_subtype_from_committee_item"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM "check_committee_item_subtype_consistency"(COALESCE(NEW.id, OLD.id));
  RETURN NULL;
END;
$$;

-- Trigger adapter for writes on StudentItem subtype table.
-- Re-validates the corresponding parent CommitteeItem.
CREATE OR REPLACE FUNCTION "trg_check_subtype_from_student_item"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM "check_committee_item_subtype_consistency"(COALESCE(NEW."itemId", OLD."itemId"));
  RETURN NULL;
END;
$$;

-- Trigger adapter for writes on PauseItem subtype table.
-- Re-validates the corresponding parent CommitteeItem.
CREATE OR REPLACE FUNCTION "trg_check_subtype_from_pause_item"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM "check_committee_item_subtype_consistency"(COALESCE(NEW."itemId", OLD."itemId"));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "committee_item_subtype_chk_on_committee_item"
AFTER INSERT OR UPDATE OR DELETE ON "CommitteeItem"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "trg_check_subtype_from_committee_item"();

CREATE CONSTRAINT TRIGGER "committee_item_subtype_chk_on_student_item"
AFTER INSERT OR UPDATE OR DELETE ON "StudentItem"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "trg_check_subtype_from_student_item"();

CREATE CONSTRAINT TRIGGER "committee_item_subtype_chk_on_pause_item"
AFTER INSERT OR UPDATE OR DELETE ON "PauseItem"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "trg_check_subtype_from_pause_item"();
