import { NextResponse } from "next/server"

export async function GET() {
  try {
    const replicateToken = process.env.REPLICATE_API_TOKEN
    const geminiKey = process.env.GEMINI_API_KEY
    
    if (!replicateToken) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Missing REPLICATE_API_TOKEN env var",
          provider: "Replicate + Gemini",
          textProvider: "Gemini",
          imageProvider: "Replicate"
        }, 
        { status: 500 }
      )
    }

    if (!geminiKey) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Missing GEMINI_API_KEY env var",
          provider: "Replicate + Gemini",
          textProvider: "Gemini",
          imageProvider: "Replicate"
        }, 
        { status: 500 }
      )
    }

    // Test Replicate API connectivity
    const replicateRes = await fetch("https://api.replicate.com/v1/models", {
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json"
      }
    })

    const details: Record<string, any> = { 
      ok: replicateRes.ok,
      provider: "Replicate + Gemini",
      textProvider: "Gemini",
      imageProvider: "Replicate",
      replicateStatus: `${replicateRes.status} ${replicateRes.statusText}`,
      supportsImageGeneration: true,
      maxImagesPerRequest: 4,
      model: "stability-ai/stable-diffusion"
    }

    if (replicateRes.ok) {
      details.status = "Connected successfully"
      details.replicateStatus = "Connected successfully"
    } else {
      const text = await replicateRes.text()
      details.error = text
    }

    return NextResponse.json(details, { status: replicateRes.ok ? 200 : 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ 
      ok: false, 
      error: message,
      provider: "Replicate + Gemini",
      textProvider: "Gemini",
      imageProvider: "Replicate"
    }, { status: 502 })
  }
}


