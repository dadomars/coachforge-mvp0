export function titleCaseIt(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLocaleLowerCase("it-IT");
  return lower.replace(
    /(^|[\s'’\-\/\.\(\)]+)(\p{L})/gu,
    (match, sep, letter: string) => `${sep}${letter.toLocaleUpperCase("it-IT")}`
  );
}

export function formatTypeUpper(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "RUN") return "CORSA";
  return raw;
}

export function formatStatusItUpper(status: unknown): string {
  const raw = String(status ?? "").trim().toUpperCase();
  if (raw === "PLANNED") return "PIANIFICATA";
  if (raw === "DONE") return "CONCLUSA";
  if (raw === "CANCELLED") return "ANNULLATA";
  return raw;
}
