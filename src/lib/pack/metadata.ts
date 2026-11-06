/**
 * Common metadata and UUID helpers for pack conversion
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails
    }
  }
  // RFC4122 version 4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeDescriptionText(desc: unknown): string {
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'number' || typeof desc === 'boolean') return String(desc);
  if (Array.isArray(desc)) {
    return desc.map(normalizeDescriptionText).join('');
  }
  if (desc && typeof desc === 'object') {
    const obj = desc as Record<string, unknown>;
    const base = typeof obj.text === 'string' ? obj.text : (typeof obj.translate === 'string' ? obj.translate : '');
    const extra = Array.isArray(obj.extra) ? obj.extra.map(normalizeDescriptionText).join('') : '';
    return base + extra;
  }
  return '';
}

export function generateManifestContent(
  name: string,
  description: unknown,
  headerUuid: string,
  moduleUuid: string,
  minEngineVersion: [number, number, number]
): string {
  const cleanDesc = normalizeDescriptionText(description) || "Converted by PackBridge";
  const credit = "\nConverted by PackBridge (packbridge.manpuc.me)";
  const manifest = {
    format_version: 2,
    header: {
      description: cleanDesc + credit,
      name: String(name || "Pack"),
      uuid: headerUuid,
      version: [1, 0, 0],
      min_engine_version: minEngineVersion
    },
    modules: [
      {
        description: cleanDesc + credit,
        type: "resources",
        uuid: moduleUuid,
        version: [1, 0, 0]
      }
    ]
  };
  return JSON.stringify(manifest, null, 2);
}

export function generateMcmetaContent(description: unknown, packFormat: number): string {
  const cleanDesc = normalizeDescriptionText(description) || "Converted by PackBridge";
  const finalDescription = `${cleanDesc}\nConverted with PackBridge (packbridge.manpuc.me)`;

  const packObj: any = {
    pack_format: packFormat,
    description: finalDescription
  };

  if (packFormat >= 69) {
    packObj.min_format = packFormat;
    packObj.max_format = packFormat;
  }

  return JSON.stringify({
    pack: packObj
  }, null, 2);
}
