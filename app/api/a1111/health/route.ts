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
    const [modelsRes, samplersRes, optionsRes] = await Promise.all([
      fetch(`${baseUrl}/sdapi/v1/sd-models`, { headers }),
      fetch(`${baseUrl}/sdapi/v1/samplers`, { headers }),
      fetch(`${baseUrl}/sdapi/v1/options`, { headers }),
    ])

    const ok = modelsRes.ok && samplersRes.ok && optionsRes.ok
    const details: Record<string, any> = { baseUrl, ok }
    details.modelsStatus = `${modelsRes.status} ${modelsRes.statusText}`
    details.samplersStatus = `${samplersRes.status} ${samplersRes.statusText}`
    details.optionsStatus = `${optionsRes.status} ${optionsRes.statusText}`

    let models: any[] | undefined
    if (modelsRes.ok) {
      models = (await modelsRes.json()) as any[]
      details.modelCount = models?.length ?? 0
    }
    if (samplersRes.ok) {
      const samplers = (await samplersRes.json()) as any[]
      details.samplerCount = samplers?.length ?? 0
    }
    if (optionsRes.ok) {
      const options = await optionsRes.json()
      details.sd_model_checkpoint = options?.sd_model_checkpoint
    }

    return NextResponse.json(details, { status: ok ? 200 : 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ baseUrl, ok: false, error: message }, { status: 502 })
  }
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim()
  url = url.replace(/\/+$/g, "")
  url = url.replace(/\/?sdapi.*/i, "")
  return url
}


