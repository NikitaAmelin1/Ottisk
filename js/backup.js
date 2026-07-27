/**
 * Portable progress backup. The file/code stays on the user's device.
 * It is not cloud sync and never uploads progress.
 */
(function attachOttiskBackup() {
  const FORMAT = "ottisk-backup";
  const VERSION = 1;
  const PREFIX = "OTTISK1:";

  function checksum(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function encodeUtf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function decodeUtf8(value) {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function sanitizeMeta(meta) {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
      throw new Error("В резервной копии нет прогресса");
    }
    const copy = JSON.parse(JSON.stringify(meta));
    // Store purchases must be restored by Apple/Google, not forged by a backup.
    delete copy.iapHeroes;
    delete copy.starterPackBought;
    return copy;
  }

  function create(meta) {
    const payload = {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      meta: sanitizeMeta(meta),
    };
    const body = JSON.stringify(payload);
    return { payload, json: body, code: `${PREFIX}${checksum(body)}:${encodeUtf8(body)}` };
  }

  function parse(input) {
    const text = String(input || "").trim();
    let body = text;
    if (text.startsWith(PREFIX)) {
      const separator = text.indexOf(":", PREFIX.length);
      if (separator < 0) throw new Error("Код переноса повреждён");
      const expected = text.slice(PREFIX.length, separator);
      body = decodeUtf8(text.slice(separator + 1));
      if (checksum(body) !== expected) throw new Error("Код переноса повреждён");
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (_) {
      throw new Error("Не удалось прочитать резервную копию");
    }
    if (payload?.format !== FORMAT || payload?.version !== VERSION) {
      throw new Error("Неподдерживаемая версия резервной копии");
    }
    return sanitizeMeta(payload.meta);
  }

  function download(meta) {
    const backup = create(meta);
    const blob = new Blob([backup.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ottisk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return backup.code;
  }

  globalThis.OttiskBackup = { create, parse, download, format: FORMAT, version: VERSION };
})();
