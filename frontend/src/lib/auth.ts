import type { TokenResponse } from "./types";

export function saveAuth(data: TokenResponse) {
  localStorage.setItem("symbio_token", data.access_token);
  localStorage.setItem("symbio_org_id", data.org_id);
  localStorage.setItem(
    "symbio_user",
    JSON.stringify({
      user_id: data.user_id,
      org_id: data.org_id,
      org_name: data.org_name,
      role: data.role,
    })
  );
}

export function getAuth(): {
  token: string | null;
  org_id: string | null;
  user: { user_id: string; org_id: string; org_name: string; role: string } | null;
} {
  if (typeof window === "undefined") return { token: null, org_id: null, user: null };
  const token = localStorage.getItem("symbio_token");
  const org_id = localStorage.getItem("symbio_org_id");
  const raw = localStorage.getItem("symbio_user");
  const user = raw ? JSON.parse(raw) : null;
  return { token, org_id, user };
}

export function clearAuth() {
  localStorage.removeItem("symbio_token");
  localStorage.removeItem("symbio_org_id");
  localStorage.removeItem("symbio_user");
}

export function isAuthenticated(): boolean {
  return !!getAuth().token;
}
