/**
 * Normalizes player names by stripping parentheses, roles, nicknames, and extra spaces.
 * E.g., "Jerry (Onye Army)" -> "Jerry"
 * E.g., "Jerry (Captain)" -> "Jerry"
 * E.g., "Jerry" -> "Jerry"
 */
export const normalizePlayerName = (name: string): string => {
  if (!name) return '';
  
  // 1. Convert to string and clean/lowercase
  let val = String(name).trim();
  
  // 2. Extract content outside parenthesis if it exists
  // E.g. "Jerry (Onye Army)" -> "Jerry "
  const parenIndex = val.indexOf('(');
  let suffixToKeep = '';
  if (parenIndex !== -1) {
    const endParen = val.indexOf(')', parenIndex);
    if (endParen !== -1) {
      const inside = val.substring(parenIndex + 1, endParen).trim();
      const insideLower = inside.toLowerCase();
      // Check if it's a distinct person tag/suffix (like "new", "junior", "senior", "jr", "sr", etc.)
      const isDistinct = /^(new|junior|senior|jr|sr|ii|iii|[a-f]|\d+)$/i.test(insideLower);
      if (isDistinct) {
        suffixToKeep = inside;
      }
    }
    val = val.substring(0, parenIndex).trim();
  }
  
  // 3. Strip roles and common suffix abbreviations
  let lower = val.toLowerCase();
  
  // Remove standalone role terms
  lower = lower.replace(/\b(captain|gk|c)\b/gi, '');
  
  // 4. Remove any non-alphanumeric characters (except spaces)
  lower = lower.replace(/[^a-zA-Z0-9\s]/g, ' ');
  
  // 5. Trim and collapse multiple spaces, and title-case the result
  let cleaned = lower.trim().replace(/\s+/g, ' ');
  
  if (suffixToKeep) {
    const cleanedSuffix = suffixToKeep.charAt(0).toUpperCase() + suffixToKeep.slice(1).toLowerCase();
    cleaned = `${cleaned} (${cleanedSuffix})`;
  }
  
  if (!cleaned) return 'Unknown Player';
  
  if (cleaned.includes('(')) {
    const basePart = cleaned.substring(0, cleaned.indexOf('(')).trim();
    const suffixPart = cleaned.substring(cleaned.indexOf('(')).trim();
    const capitalizedBase = basePart
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
    return `${capitalizedBase} ${suffixPart}`;
  }
  
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
};
