/**
 * Team Management — Permission Helper
 *
 * RBAC matrix:
 *
 * UserRole (from prisma schema / rbac.ts):
 *   ADMIN | SOCIO | ADVOGADO | ESTAGIARIO
 *
 * TeamRole (from prisma schema, Team Management module):
 *   SOCIO | ADVOGADO_SENIOR | ADVOGADO_PLENO | ADVOGADO_JUNIOR | ESTAGIARIO | PARALEGAL | ADMINISTRATIVO
 *
 * Access rules:
 *  - ADMIN / SOCIO (UserRole):              full access to all permissions
 *  - ADVOGADO (UserRole) + ADVOGADO_SENIOR (TeamRole):
 *      elevated access — can view subordinates' data, give manager feedback, schedule 1:1s as manager
 *  - ADVOGADO (UserRole) + ADVOGADO_PLENO / ADVOGADO_JUNIOR (TeamRole):
 *      standard lawyer — own data only, public feedback, give recognition, wellbeing check-in
 *  - ESTAGIARIO (UserRole) / PARALEGAL / ADMINISTRATIVO (TeamRole):
 *      most restricted — own data only, respond to surveys, submit complaints
 *
 * NOTE: TeamRole.SOCIO overrides UserRole for team-module checks the same way as ADMIN/SOCIO UserRole.
 */

// ─── Type definitions ────────────────────────────────────────────────────────

export type TeamPermission =
  // Full-panel visibility (dashboard, all members' data)
  | 'VIEW_FULL_PANEL'
  // OKR visibility for the whole team
  | 'VIEW_TEAM_OKRS'
  // KPI dashboard for the whole team
  | 'VIEW_TEAM_KPIS'
  // Create / manage 360-review cycles
  | 'CREATE_360_CYCLE'
  // See consolidated 360 results for any team member (not just self)
  | 'VIEW_360_RESULTS_TEAM'
  // Schedule a 1:1 as the manager side
  | 'SCHEDULE_1ON1_AS_MANAGER'
  // Create pulse / climate / eNPS surveys
  | 'CREATE_SURVEY'
  // See aggregated survey results
  | 'VIEW_SURVEY_RESULTS'
  // Trigger a client NPS send
  | 'SEND_CLIENT_NPS'
  // See all client NPS scores
  | 'VIEW_CLIENT_NPS'
  // Manage / investigate complaints (assign, resolve, archive)
  | 'MANAGE_COMPLAINTS'
  // See the wellbeing / burnout risk dashboard
  | 'VIEW_WELLBEING_DASHBOARD'
  // Access own performance data (OKRs, KPIs, feedbacks, PDI)
  | 'VIEW_OWN_DATA'
  // Submit feedback to another team member (positive, constructive, feedforward)
  | 'GIVE_FEEDBACK'
  // Respond to a survey
  | 'RESPOND_SURVEY'
  // Submit a complaint (even anonymously)
  | 'SUBMIT_COMPLAINT'
  // Send a recognition badge / highlight
  | 'GIVE_RECOGNITION'
  // Submit a daily/weekly wellbeing check-in
  | 'WELLBEING_CHECKIN';

// ─── Internal permission matrix ──────────────────────────────────────────────

/**
 * Permissions held by ADMIN / SOCIO (UserRole) — full access to everything.
 */
const ADMIN_PERMISSIONS: TeamPermission[] = [
  'VIEW_FULL_PANEL',
  'VIEW_TEAM_OKRS',
  'VIEW_TEAM_KPIS',
  'CREATE_360_CYCLE',
  'VIEW_360_RESULTS_TEAM',
  'SCHEDULE_1ON1_AS_MANAGER',
  'CREATE_SURVEY',
  'VIEW_SURVEY_RESULTS',
  'SEND_CLIENT_NPS',
  'VIEW_CLIENT_NPS',
  'MANAGE_COMPLAINTS',
  'VIEW_WELLBEING_DASHBOARD',
  'VIEW_OWN_DATA',
  'GIVE_FEEDBACK',
  'RESPOND_SURVEY',
  'SUBMIT_COMPLAINT',
  'GIVE_RECOGNITION',
  'WELLBEING_CHECKIN',
];

/**
 * Additional permissions granted to ADVOGADO_SENIOR via TeamRole
 * (stacked on top of the base ADVOGADO permissions).
 */
const SENIOR_EXTRA_PERMISSIONS: TeamPermission[] = [
  'VIEW_FULL_PANEL',
  'VIEW_TEAM_OKRS',
  'VIEW_TEAM_KPIS',
  'VIEW_360_RESULTS_TEAM',
  'SCHEDULE_1ON1_AS_MANAGER',
  'VIEW_SURVEY_RESULTS',
  'VIEW_CLIENT_NPS',
  'VIEW_WELLBEING_DASHBOARD',
];

/**
 * Base permissions for a standard ADVOGADO (Pleno, Junior) — own data + social actions.
 */
const ADVOGADO_BASE_PERMISSIONS: TeamPermission[] = [
  'VIEW_OWN_DATA',
  'GIVE_FEEDBACK',
  'RESPOND_SURVEY',
  'SUBMIT_COMPLAINT',
  'GIVE_RECOGNITION',
  'WELLBEING_CHECKIN',
];

/**
 * Permissions for ESTAGIARIO / PARALEGAL / ADMINISTRATIVO — most restricted set.
 */
const ESTAGIARIO_PERMISSIONS: TeamPermission[] = [
  'VIEW_OWN_DATA',
  'RESPOND_SURVEY',
  'SUBMIT_COMPLAINT',
  'GIVE_RECOGNITION',
  'WELLBEING_CHECKIN',
];

// ─── Helper utilities ────────────────────────────────────────────────────────

/** Returns true when the UserRole grants full team-management access. */
function isAdminOrSocio(userRole: string): boolean {
  return userRole === 'ADMIN' || userRole === 'SOCIO';
}

/** Returns true when the TeamRole is effectively at partner level. */
function isSocioTeamRole(teamRole: string): boolean {
  return teamRole === 'SOCIO';
}

/** Returns true when the TeamRole represents a senior lawyer acting as manager. */
function isSeniorTeamRole(teamRole: string): boolean {
  return teamRole === 'ADVOGADO_SENIOR';
}

/** Returns true when the TeamRole belongs to the intern / support track. */
function isJuniorOrSupportTeamRole(teamRole: string): boolean {
  return (
    teamRole === 'ESTAGIARIO' ||
    teamRole === 'PARALEGAL' ||
    teamRole === 'ADMINISTRATIVO'
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * hasTeamPermission
 *
 * Check whether a user (identified by their UserRole and, optionally, their
 * TeamRole within the team-management module) holds the requested permission.
 *
 * @param userRole   The user's global role (UserRole enum: ADMIN | SOCIO | ADVOGADO | ESTAGIARIO)
 * @param teamRole   The user's role inside the Team Management module (TeamRole enum), optional
 * @param permission The TeamPermission to check
 */
export function hasTeamPermission(
  userRole: string,
  teamRole: string | undefined | null,
  permission: TeamPermission,
): boolean {
  return getTeamPermissions(userRole, teamRole).includes(permission);
}

/**
 * getTeamPermissions
 *
 * Return the full set of TeamPermissions for the given combination of
 * UserRole and (optional) TeamRole.
 *
 * @param userRole  The user's global role
 * @param teamRole  The user's role inside the Team Management module, optional
 */
export function getTeamPermissions(
  userRole: string,
  teamRole?: string | null,
): TeamPermission[] {
  // ADMIN and SOCIO at the global UserRole level get everything.
  if (isAdminOrSocio(userRole)) {
    return [...ADMIN_PERMISSIONS];
  }

  // A TeamRole of SOCIO is treated identically to the global SOCIO/ADMIN.
  if (teamRole && isSocioTeamRole(teamRole)) {
    return [...ADMIN_PERMISSIONS];
  }

  // ADVOGADO (UserRole) with ADVOGADO_SENIOR (TeamRole): manager-level access.
  if (userRole === 'ADVOGADO' && teamRole && isSeniorTeamRole(teamRole)) {
    const merged = new Set<TeamPermission>([
      ...ADVOGADO_BASE_PERMISSIONS,
      ...SENIOR_EXTRA_PERMISSIONS,
    ]);
    return Array.from(merged);
  }

  // ADVOGADO (UserRole) without a senior team role: standard lawyer access.
  if (userRole === 'ADVOGADO') {
    // PARALEGAL and ADMINISTRATIVO in the ADVOGADO UserRole bucket are
    // support roles and get the more restricted set.
    if (teamRole && isJuniorOrSupportTeamRole(teamRole)) {
      return [...ESTAGIARIO_PERMISSIONS];
    }
    return [...ADVOGADO_BASE_PERMISSIONS];
  }

  // ESTAGIARIO (UserRole): most restricted set.
  return [...ESTAGIARIO_PERMISSIONS];
}

/**
 * isManagerOf
 *
 * Async check: returns true when `managerId` (a TeamMember.id) is the direct
 * manager of `subordinateId` (another TeamMember.id).
 *
 * The relationship is stored in TeamMember.managerMemberId (self-relation
 * "ManagerSubordinate" in the Prisma schema).
 *
 * @param managerId      TeamMember.id of the potential manager
 * @param subordinateId  TeamMember.id of the potential subordinate
 * @param db             Prisma client instance (typed as `any` for flexibility)
 */
export async function isManagerOf(
  managerId: string,
  subordinateId: string,
  db: any,
): Promise<boolean> {
  if (!managerId || !subordinateId || managerId === subordinateId) {
    return false;
  }

  const subordinate = await db.teamMember.findUnique({
    where: { id: subordinateId },
    select: { managerMemberId: true },
  });

  if (!subordinate) return false;
  return subordinate.managerMemberId === managerId;
}

/**
 * canViewMemberData
 *
 * Async check: returns true when the viewer is allowed to see another team
 * member's personal data (OKRs, KPIs, feedbacks, PDI, wellbeing scores, etc.).
 *
 * Rules:
 *  1. ADMIN / SOCIO (UserRole) — always yes.
 *  2. Viewing own data — always yes.
 *  3. ADVOGADO_SENIOR (TeamRole) — yes if they are the direct manager of the target.
 *  4. All other cases — no.
 *
 * @param viewerUserRole       The viewer's global UserRole
 * @param viewerTeamMemberId   The viewer's TeamMember.id
 * @param targetTeamMemberId   The target TeamMember.id
 * @param db                   Prisma client instance
 */
export async function canViewMemberData(
  viewerUserRole: string,
  viewerTeamMemberId: string,
  targetTeamMemberId: string,
  db: any,
): Promise<boolean> {
  // Rule 1: global admins see everything.
  if (isAdminOrSocio(viewerUserRole)) {
    return true;
  }

  // Rule 2: viewing own data is always permitted.
  if (viewerTeamMemberId === targetTeamMemberId) {
    return true;
  }

  // Rule 3: senior lawyers can see subordinates' data if they are the direct manager.
  const viewerMember = await db.teamMember.findUnique({
    where: { id: viewerTeamMemberId },
    select: { role: true },
  });

  if (!viewerMember) return false;

  if (
    viewerUserRole === 'ADVOGADO' &&
    (viewerMember.role === 'ADVOGADO_SENIOR' || viewerMember.role === 'SOCIO')
  ) {
    return isManagerOf(viewerTeamMemberId, targetTeamMemberId, db);
  }

  // Rule 4: all other combinations are denied.
  return false;
}
