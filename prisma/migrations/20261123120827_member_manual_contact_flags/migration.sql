-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "emailIsManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneIsManual" BOOLEAN NOT NULL DEFAULT false;
