export function safeJsonStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined; // skip circular references
        }
        seen.add(value);
        // Exclude DOM nodes, React elements, Window, and circular internal refs
        if ('nodeType' in value || (value.constructor && value.constructor.name === 'HTMLDocument') || value === window) {
          return undefined;
        }
      }
      if (typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
      }
      return value;
    }, space) || '{}';
  } catch (err) {
    console.warn("safeJsonStringify error:", err);
    return '{}';
  }
}
