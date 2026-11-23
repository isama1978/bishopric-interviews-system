-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('PRINCIPAL', 'SECRETARY', 'COUNSELOR');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StaffTokenPurpose" AS ENUM ('ACTIVATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_MEMBER', 'CANCELLED_BY_LEADER_PENDING', 'CANCELLED_NOTIFIED');

-- CreateEnum
CREATE TYPE "InterviewEventType" AS ENUM ('CREATED', 'RESCHEDULED', 'CANCELLED_BY_MEMBER', 'CANCELLED_BY_LEADER', 'REASSIGNED', 'TAKEN_BY_PRINCIPAL', 'MEMBER_NOTIFIED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'NUMBER');

-- CreateEnum
CREATE TYPE "BannerLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "churchUuid" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fullNameSearch" TEXT NOT NULL,
    "phoneEnc" TEXT,
    "emailEnc" TEXT,
    "linkTokenVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "themeMode" "ThemeMode" NOT NULL DEFAULT 'SYSTEM',
    "totpSecretEnc" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffToken" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "purpose" "StaffTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "issuedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "minutesPerInterview" INTEGER,
    "maxInterviewsPerDay" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderDayOverride" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutesPerInterview" INTEGER,
    "maxInterviews" INTEGER,

    CONSTRAINT "LeaderDayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulePattern" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "lastStartMinute" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SchedulePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "startMinute" INTEGER,
    "lastStartMinute" INTEGER,
    "note" TEXT,

    CONSTRAINT "ScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterviewCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "type" "FormFieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isOverbooking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvent" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" "InterviewEventType" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorStaffId" TEXT,
    "fromStartsAt" TIMESTAMPTZ(3),
    "toStartsAt" TIMESTAMPTZ(3),
    "fromLeaderId" TEXT,
    "toLeaderId" TEXT,

    CONSTRAINT "InterviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "level" "BannerLevel" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Cordoba',
    "defaultMemberTheme" "ThemeMode" NOT NULL DEFAULT 'LIGHT',
    "defaultMinutesPerInterview" INTEGER NOT NULL DEFAULT 30,
    "maxOverbookingsPerDay" INTEGER NOT NULL DEFAULT 3,
    "privacyNotice" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorStaffId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_churchUuid_key" ON "Member"("churchUuid");

-- CreateIndex
CREATE INDEX "Member_fullNameSearch_idx" ON "Member"("fullNameSearch");

-- CreateIndex
CREATE INDEX "Member_isActive_idx" ON "Member"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser"("username");

-- CreateIndex
CREATE INDEX "StaffUser_role_isActive_idx" ON "StaffUser"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffSession_staffUserId_idx" ON "StaffSession"("staffUserId");

-- CreateIndex
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffToken_tokenHash_key" ON "StaffToken"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffToken_staffUserId_purpose_idx" ON "StaffToken"("staffUserId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_staffUserId_key" ON "Leader"("staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderDayOverride_leaderId_date_key" ON "LeaderDayOverride"("leaderId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulePattern_weekday_key" ON "SchedulePattern"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleDay_date_key" ON "ScheduleDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewCategory_name_key" ON "InterviewCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_key_key" ON "FormField"("key");

-- CreateIndex
CREATE INDEX "Interview_leaderId_startsAt_idx" ON "Interview"("leaderId", "startsAt");

-- CreateIndex
CREATE INDEX "Interview_memberId_startsAt_idx" ON "Interview"("memberId", "startsAt");

-- CreateIndex
CREATE INDEX "Interview_status_startsAt_idx" ON "Interview"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Interview_categoryId_idx" ON "Interview"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAnswer_interviewId_fieldId_key" ON "InterviewAnswer"("interviewId", "fieldId");

-- CreateIndex
CREATE INDEX "InterviewEvent_interviewId_idx" ON "InterviewEvent"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewEvent_type_occurredAt_idx" ON "InterviewEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "Banner_isActive_startsAt_endsAt_idx" ON "Banner"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorStaffId_idx" ON "AuditLog"("actorStaffId");

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffToken" ADD CONSTRAINT "StaffToken_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffToken" ADD CONSTRAINT "StaffToken_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderDayOverride" ADD CONSTRAINT "LeaderDayOverride_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterviewCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_fromLeaderId_fkey" FOREIGN KEY ("fromLeaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvent" ADD CONSTRAINT "InterviewEvent_toLeaderId_fkey" FOREIGN KEY ("toLeaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
