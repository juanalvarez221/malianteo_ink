/**
 * Entrada del panel. Se define por entorno (ADMIN_GATE_PATH) para que la ruta
 * opaca no quede publicada en el repositorio; no usar /admin/login.
 */
export const ADMIN_GATE_PATH = process.env.ADMIN_GATE_PATH?.trim() || "/acceso-panel";
export const ADMIN_HOME_PATH = "/admin";

export function isAdminGatePath(pathname: string): boolean {
  return pathname === ADMIN_GATE_PATH || pathname.startsWith(`${ADMIN_GATE_PATH}/`);
}

export function isStaffUiPath(pathname: string): boolean {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`) || isAdminGatePath(pathname);
}

/** Destino post-login. Solo rutas internas del panel. */
export function sanitizeAdminNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return ADMIN_HOME_PATH;
  }
  if (isAdminGatePath(next)) return ADMIN_HOME_PATH;
  if (!next.startsWith(`${ADMIN_HOME_PATH}/`) && next !== ADMIN_HOME_PATH) {
    return ADMIN_HOME_PATH;
  }
  if (next === `${ADMIN_HOME_PATH}/login` || next.startsWith(`${ADMIN_HOME_PATH}/login/`)) {
    return ADMIN_HOME_PATH;
  }
  return next;
}
