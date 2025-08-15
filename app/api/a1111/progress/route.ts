import { NextRequest, NextResponse } from "next/server"

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

export async function GET(request: NextRequest) {
  const baseUrl = normalizeBaseUrl(process.env.A1111_BASE_URL || "http://127.0.0.1:7860")
  const skipParam = request.nextUrl.searchParams.get("skip_current_image")
  const skipCurrentImage = skipParam === null ? true : skipParam === "true"
  try {
    const headers = buildHeaders()
    const res = await fetch(`${baseUrl}/sdapi/v1/progress?skip_current_image=${skipCurrentImage}`, { headers })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { ok: false, status: `${res.status} ${res.statusText}`, details: text },
        { status: 502 },
      )
    }
    const data = (await res.json()) as any
    const percent = typeof data?.progress === "number" ? Math.max(0, Math.min(100, Math.round(data.progress * 100))) : 0
    const state = data?.state || {}
    return NextResponse.json({
      ok: true,
      progress: percent,
      eta_relative: data?.eta_relative ?? null,
      state: {
        job: state?.job ?? null,
        job_count: state?.job_count ?? null,
        sampling_step: state?.sampling_step ?? null,
        sampling_steps: state?.sampling_steps ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}


