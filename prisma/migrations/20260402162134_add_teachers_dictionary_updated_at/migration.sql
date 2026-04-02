-- AlterTable
ALTER TABLE "TeachersDictionary" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure updatedAt is always refreshed on any UPDATE at database level
CREATE OR REPLACE FUNCTION "set_teachers_dictionary_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "teachers_dictionary_set_updated_at"
BEFORE UPDATE ON "TeachersDictionary"
FOR EACH ROW
EXECUTE FUNCTION "set_teachers_dictionary_updated_at"();
