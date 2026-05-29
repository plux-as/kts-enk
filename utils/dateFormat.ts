
const MONTHS_NO = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

/**
 * Formats an ISO 8601 date string to Norwegian long-form date.
 * Example: "2025-03-03T12:00:00Z" → "3. mars 2025"
 */
export function formatNorwegianDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getUTCDate();
    const month = MONTHS_NO[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day}. ${month} ${year}`;
  } catch {
    return iso;
  }
}
