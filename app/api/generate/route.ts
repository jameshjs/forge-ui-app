import { NextRequest, NextResponse } from "next/server"

type GenerateRequest = {
  prompt: string
  width: number
  height: number
  cfgScale?: number
  count?: number
  negativePrompt?: string
  samplerName?: string
  steps?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest

    const baseUrlRaw = process.env.A1111_BASE_URL || "http://127.0.0.1:7860"
    const baseUrl = normalizeBaseUrl(baseUrlRaw)

    const prompt = body.prompt?.trim() || ""
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const width = Number(body.width) || 512
    const height = Number(body.height) || 512
    const cfg_scale = Number(body.cfgScale ?? 7)
    const steps = Number(body.steps ?? 20)
    const n_iter = Math.max(1, Math.min(10, Number(body.count ?? 1)))
    const negative_prompt = body.negativePrompt ?? ""
    const sampler_name = body.samplerName || "DPM++ 2M Karras"

    const payload = {
      prompt,
      negative_prompt,
      width,
      height,
      cfg_scale,
      steps,
      n_iter,
      batch_size: 1,
      sampler_name,
      // You can tune additional fields here as needed
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    // Optional auth for A1111 when started with --api-auth or protected upstream
    const basicAuth = process.env.A1111_BASIC_AUTH ||
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

    const targetUrl = `${baseUrl}/sdapi/v1/txt2img`
    let res: Response
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: "A1111 fetch failed", message, url: targetUrl, baseUrl },
        { status: 502 },
      )
    }

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `A1111 error: ${res.status} ${res.statusText}`, url: targetUrl, details: text },
        { status: 502 },
      )
    }

    const data = (await res.json()) as { images?: string[] }
    const images = (data.images || []).map((b64) => `data:image/png;base64,${b64}`)

    return NextResponse.json({ images })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate images", message },
      { status: 500 },
    )
  }
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim()
  // Remove trailing slashes
  url = url.replace(/\/+$/g, "")
  // Remove accidental sdapi path if user included it
  url = url.replace(/\/?sdapi.*/i, "")
  return url
}


