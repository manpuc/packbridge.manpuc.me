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

export function generateManifestContent(
  name: string,
  description: string,
  headerUuid: string,
  moduleUuid: string,
  minEngineVersion: [number, number, number]
): string {
  const credit = "\nConverted by PackBridge (packbridge.manpuc.me)";
  const manifest = {
    format_version: 2,
    header: {
      description: description + credit,
      name: name,
      uuid: headerUuid,
      version: [1, 0, 0],
      min_engine_version: minEngineVersion
    },
    modules: [
      {
        description: description + credit,
        type: "resources",
        uuid: moduleUuid,
        version: [1, 0, 0]
      }
    ]
  };
  return JSON.stringify(manifest, null, 2);
}

export function generateMcmetaContent(description: string, packFormat: number): string {
  let finalDescription: any = description;
  try {
    let baseComp: any;
    try {
      baseComp = JSON.parse(description);
    } catch {
      baseComp = { text: description };
    }
    if (typeof baseComp !== 'object' || baseComp === null) {
      baseComp = { text: String(baseComp) };
    } else if (Array.isArray(baseComp)) {
      baseComp = { text: "", extra: baseComp };
    }
    if (!baseComp.extra) baseComp.extra = [];
    baseComp.extra.push({ text: "\nConverted with ", color: "gray" });
    baseComp.extra.push({
      text: "PackBridge",
      color: "blue",
      underlined: true,
      clickEvent: { action: "open_url", value: "https://packbridge.manpuc.me" }
    });
    finalDescription = baseComp;
  } catch {
    finalDescription = description + "\nConverted with PackBridge (https://packbridge.manpuc.me)";
  }

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
