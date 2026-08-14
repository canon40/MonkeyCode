type UnknownRecord = Record<string, unknown>

function b64decode(text: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(text), (c) => c.charCodeAt(0)))
}

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

/** Extract plain text from ACP content blocks (matches desktop codec.toolContentText). */
export function extractAcpTextContent(content: unknown, depth = 0): string {
  if (depth > 5 || content === undefined || content === null) return ""
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content.map((item) => extractAcpTextContent(item, depth + 1)).filter(Boolean).join("\n")
  }

  const source = record(content)
  if (!source) return ""
  if (typeof source.text === "string") return source.text
  if (source.content !== undefined) return extractAcpTextContent(source.content, depth + 1)
  return ""
}

/** Decode task stream chunk payloads (base64 JSON, inline object, or raw JSON string). */
export function decodeTaskStreamPayload<T = Record<string, unknown>>(data: unknown): T | null {
  if (data === undefined || data === null) return null
  if (typeof data === "object") return data as T
  if (typeof data !== "string") return null

  try {
    return JSON.parse(b64decode(data)) as T
  } catch {
    try {
      return JSON.parse(data) as T
    } catch {
      return null
    }
  }
}
