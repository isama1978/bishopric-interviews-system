-- ============================================================
-- Restricciones que Prisma no puede declarar en schema.prisma
-- ============================================================
-- Cómo usarlo:
--   1) npx prisma migrate dev --name init            (crea las tablas)
--   2) npx prisma migrate dev --create-only --name constraints
--   3) Pegar el contenido de este archivo en el migration.sql generado
--   4) npx prisma migrate dev                        (lo aplica)
-- Los nombres de tablas y columnas van entre comillas porque Prisma usa
-- los nombres exactos del modelo (camelCase).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------
-- Entrevistas: coherencia de horarios
-- ------------------------------------------------------------
ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_ends_after_starts"
  CHECK ("endsAt" > "startsAt");

-- Un líder no puede tener dos entrevistas que se solapen.
-- Ocupan agenda: SCHEDULED, COMPLETED y NO_SHOW. Las canceladas liberan el horario.
-- Los sobreturnos quedan fuera de la restricción.
ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_no_leader_overlap"
  EXCLUDE USING gist (
    "leaderId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (
    "isOverbooking" = false
    AND "status" IN ('SCHEDULED', 'COMPLETED', 'NO_SHOW')
  );

-- Un miembro no puede estar en dos entrevistas a la vez (con líderes distintos)
ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_no_member_overlap"
  EXCLUDE USING gist (
    "memberId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (
    "status" IN ('SCHEDULED', 'COMPLETED', 'NO_SHOW')
  );

-- ------------------------------------------------------------
-- Calendario: rangos válidos
-- ------------------------------------------------------------
ALTER TABLE "SchedulePattern"
  ADD CONSTRAINT "SchedulePattern_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "SchedulePattern_minutes_range"
    CHECK (
      "startMinute" BETWEEN 0 AND 1439
      AND "lastStartMinute" BETWEEN 0 AND 1439
      AND "lastStartMinute" >= "startMinute"
    );

ALTER TABLE "ScheduleDay"
  ADD CONSTRAINT "ScheduleDay_minutes_range"
    CHECK (
      ("startMinute" IS NULL AND "lastStartMinute" IS NULL)
      OR (
        "startMinute" BETWEEN 0 AND 1439
        AND "lastStartMinute" BETWEEN 0 AND 1439
        AND "lastStartMinute" >= "startMinute"
      )
    );

-- ------------------------------------------------------------
-- Líderes: duraciones y topes positivos
-- ------------------------------------------------------------
ALTER TABLE "Leader"
  ADD CONSTRAINT "Leader_minutes_positive"
    CHECK ("minutesPerInterview" IS NULL OR "minutesPerInterview" > 0),
  ADD CONSTRAINT "Leader_max_positive"
    CHECK ("maxInterviewsPerDay" IS NULL OR "maxInterviewsPerDay" > 0);

ALTER TABLE "LeaderDayOverride"
  ADD CONSTRAINT "LeaderDayOverride_minutes_positive"
    CHECK ("minutesPerInterview" IS NULL OR "minutesPerInterview" > 0),
  ADD CONSTRAINT "LeaderDayOverride_max_positive"
    CHECK ("maxInterviews" IS NULL OR "maxInterviews" > 0);

-- ------------------------------------------------------------
-- Personal: un solo líder principal y un solo secretario activos
-- (el máximo de consejeros se controla en la aplicación con una constante)
-- ------------------------------------------------------------
CREATE UNIQUE INDEX "StaffUser_single_active_principal"
  ON "StaffUser" ("role")
  WHERE "role" = 'PRINCIPAL' AND "isActive" = true;

CREATE UNIQUE INDEX "StaffUser_single_active_secretary"
  ON "StaffUser" ("role")
  WHERE "role" = 'SECRETARY' AND "isActive" = true;

-- ------------------------------------------------------------
-- Configuración: fila única
-- ------------------------------------------------------------
ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_singleton" CHECK ("id" = 1);

-- ------------------------------------------------------------
-- Historial de eventos: solo-alta (no se edita ni se borra)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_interview_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'InterviewEvent es de solo alta';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InterviewEvent_append_only"
  BEFORE UPDATE OR DELETE ON "InterviewEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_interview_event_mutation();
