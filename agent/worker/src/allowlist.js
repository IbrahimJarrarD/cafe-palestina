export const ALLOWLIST = [
  "hoffmann.suraya@gmail.com",
  "alaayusuf100@gmail.com",
  "info@ibrahimjarrar.com",
  "tech@ibrahimjarrar.com",
];
export function isAllowed(from) {
  return ALLOWLIST.includes(String(from || "").trim().toLowerCase());
}
