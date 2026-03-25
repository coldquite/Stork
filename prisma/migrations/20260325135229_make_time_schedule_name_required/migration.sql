/*
  Warnings:

  - Made the column `name` on table `TimeSchedule` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TimeSchedule" ALTER COLUMN "name" SET NOT NULL;

-- Enforce retention for future inserts.
CREATE OR REPLACE FUNCTION "prune_auto_time_schedules"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."type" <> 'AUTO'::"TimeScheduleType" THEN
    RETURN NEW;
  END IF;

  DELETE FROM "TimeSchedule" ts
  WHERE ts.id IN (
    SELECT t.id
    FROM "TimeSchedule" t
    WHERE t."type" = 'AUTO'::"TimeScheduleType"
    ORDER BY t."createdAt" DESC, t.id DESC
    OFFSET 100
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_prune_auto_time_schedules" ON "TimeSchedule";

CREATE TRIGGER "trg_prune_auto_time_schedules"
AFTER INSERT ON "TimeSchedule"
FOR EACH ROW
EXECUTE FUNCTION "prune_auto_time_schedules"();
