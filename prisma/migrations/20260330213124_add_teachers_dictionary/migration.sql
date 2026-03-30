-- CreateTable
CREATE TABLE "TeachersDictionary" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedLookupKey" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeachersDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeachersDictionary_normalizedLookupKey_key" ON "TeachersDictionary"("normalizedLookupKey");

-- CreateIndex
CREATE INDEX "TeachersDictionary_isCustom_idx" ON "TeachersDictionary"("isCustom");
