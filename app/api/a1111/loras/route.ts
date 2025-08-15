import { NextResponse } from "next/server"

export const runtime = "nodejs"

function buildHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const basicAuth =
    process.env.A1111_BASIC_AUTH ||
    (process.env.A1111_USERNAME && process.env.A1111_PASSWORD
      ? `${process.env.A1111_USERNAME}:${process.env.A1111_PASSWORD}`
      : undefined)
  const bearer = process.env.A1111_BEARER_TOKEN
  if (basicAuth) {
    const encoded = Buffer.from(basicAuth, "utf8").toString("base64")
    headers["Authorization"] = `Basic ${encoded}`
  } else if (bearer) {
    headers["Authorization"] = `Bearer ${bearer}`
  }
  return headers
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim()
  url = url.replace(/\/+$/g, "")
  url = url.replace(/\/?sdapi.*/i, "")
  return url
}

export async function GET() {
  const baseUrl = normalizeBaseUrl(process.env.A1111_BASE_URL || "http://127.0.0.1:7860")
  try {
    const headers = buildHeaders()
    const res = await fetch(`${baseUrl}/sdapi/v1/loras`, { headers })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { ok: false, status: `${res.status} ${res.statusText}`, details: text },
        { status: 502 },
      )
    }
    const raw = (await res.json()) as any[]
    const loras = (raw || []).map((it) => ({
      name: it?.name ?? "",
      alias: it?.alias ?? undefined,
    })).filter((it) => it.name)
    return NextResponse.json({ ok: true, loras })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}


