export const STAFF_ROLES = {
  PRINCIPAL: "PRINCIPAL",
  SECRETARY: "SECRETARY",
  COUNSELOR: "COUNSELOR",
} as const;

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

/** Máximo de usuarios activos por rol (1 obispo, 1 secretario, hasta 2 consejeros). */
export const MAX_ACTIVE_USERS_BY_ROLE: Readonly<Record<StaffRole, number>> = {
  PRINCIPAL: 1,
  SECRETARY: 1,
  COUNSELOR: 2,
};
