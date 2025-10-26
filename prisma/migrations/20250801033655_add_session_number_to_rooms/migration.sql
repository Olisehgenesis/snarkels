/*
  Warnings:

  - A unique constraint covering the columns `[snarkelId,sessionNumber]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "rooms_snarkelId_key";

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "sessionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "rooms_snarkelId_sessionNumber_key" ON "rooms"("snarkelId", "sessionNumber");
