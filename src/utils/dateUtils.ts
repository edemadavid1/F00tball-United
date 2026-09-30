/**
 * Normalizes various date string formats to a standard ISO YYYY-MM-DD format.
 * E.g. "14 Feb 2026 • 10:30" -> "2026-02-14"
 * E.g. "14 February 2026" -> "2026-02-14"
 * E.g. "2026-02-14" -> "2026-02-14"
 */
export const normalizeDateToISO = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const cleaned = String(dateStr).split(' • ')[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 3) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', may_full: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };
    const yearPart = parts.find(p => /^\d{4}$/.test(p));
    const dayPart = parts.find(p => /^\d{1,2}$/.test(p) && p !== yearPart);
    const monthPart = parts.find(p => /[a-zA-Z]/.test(p));
    if (yearPart && dayPart && monthPart) {
      const monthKey = monthPart.substring(0, 3).toLowerCase();
      const month = months[monthKey] || '01';
      const day = dayPart.padStart(2, '0');
      return `${yearPart}-${month}-${day}`;
    }
  }
  try {
    const parsed = Date.parse(cleaned);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const hasTime = dateStr.includes(':') || dateStr.includes('T');
      if (!hasTime) {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } else {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
  } catch (e) {}
  return cleaned;
};
