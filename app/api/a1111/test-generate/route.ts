import { NextResponse } from "next/server"

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

export async function GET() {
  const baseUrl = normalizeBaseUrl(process.env.A1111_BASE_URL || "http://127.0.0.1:7860")
  try {
    const headers = buildHeaders()
    const payload = {
      prompt: "test icon, flat minimal vector, simple",
      width: 64,
      height: 64,
      cfg_scale: 7,
      steps: 10,
      n_iter: 1,
      batch_size: 1,
      sampler_name: "DPM++ 2M Karras",
    }
    const url = `${baseUrl}/sdapi/v1/txt2img`
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { ok: false, status: `${res.status} ${res.statusText}`, url, details: text },
        { status: 502 },
      )
    }
    const data = (await res.json()) as { images?: string[] }
    const img = data.images?.[0]
    if (!img) return NextResponse.json({ ok: false, error: "No image returned" }, { status: 502 })
    return NextResponse.json({ ok: true, preview: `data:image/png;base64,${img}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim()
  url = url.replace(/\/+$/g, "")
  url = url.replace(/\/?sdapi.*/i, "")
  return url
}


