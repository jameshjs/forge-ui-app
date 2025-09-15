import { NextRequest, NextResponse } from "next/server"

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

export async function POST(req: NextRequest) {
  try {
    const { globalPrompt } = (await req.json()) as { globalPrompt?: string }
    if (!globalPrompt || !globalPrompt.trim()) {
      return NextResponse.json({ error: "Missing globalPrompt" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY env var" },
        { status: 500 },
      )
    }

    const systemInstruction = `
You are generating structured prompts for a slots video game art pack.
Given a global theme prompt, return JSON with these keys:
{
  "background": string,            // 1 prompt for the game's background
  "frame": string,                 // 1 prompt for the game's UI frame
  "symbol_icons": string[20],      // 20 different symbol icon ideas; each a distinct object/concept
  "wild_icons": string[5]          // 5 different wild symbol ideas; distinct and thematically coherent
}

IMPORTANT: You MUST follow these exact prompt templates for each type:

Background Template:
"A highly detailed {theme} game background for a game, featuring {specific environment details like forest temple, space station, desert ruins}, in a {art style}, with {mood/color palette}, no characters, wide composition, suitable as a backdrop for gameplay."

UI Frame Template:
"A decorative UI frame for a {theme} game, designed in {art style}, with clean edges, symmetrical layout, {material/texture like gold filigree, neon circuits, stone carvings}, leaving transparent space inside for text or buttons, polished and readable."

Symbol Icon Template:
"A simple, clear symbol icon representing {object/idea: e.g., sword, star, coin, potion}, in {art style}, bold silhouette, {color palette}, designed for small-scale visibility, transparent background, crisp edges, minimal design, designed to blend seamlessly with the game interface without standing out too much."

Wild Icon Template:
"A glowing, attention-grabbing wild icon symbolizing {wild feature: e.g., phoenix, crown, magic crystal}, in {art style}, with luminous effects, bold outline, high contrast, {color palette}, designed to stand out from regular icons, minimal background, glowing aura, magical particles, dynamic energy."

Rules:
- Use concise, production-ready image prompts, include art style modifiers if helpful.
- Do NOT include JSON comments in the output.
- The JSON MUST be the only output (no markdown, no prose).
Global theme: "${globalPrompt.replace(/"/g, '\\"')}".
`

    const body = {
      contents: [
        {
          parts: [{ text: systemInstruction }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
      },
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Gemini error: ${res.status} ${res.statusText}`, details: text },
        { status: 502 },
      )
    }

    const data = (await res.json()) as any
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({ error: "No content from Gemini" }, { status: 502 })
    }

    const jsonText = extractJson(text)
    let parsed: {
      background: string
      frame: string
      symbol_icons: string[]
      wild_icons: string[]
    }
    try {
      parsed = JSON.parse(jsonText)
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse Gemini JSON", raw: text },
        { status: 502 },
      )
    }

    // Basic normalization
    parsed.symbol_icons = (parsed.symbol_icons || []).slice(0, 20)
    while (parsed.symbol_icons.length < 20) parsed.symbol_icons.push("")
    parsed.wild_icons = (parsed.wild_icons || []).slice(0, 5)
    while (parsed.wild_icons.length < 5) parsed.wild_icons.push("")

    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to expand prompts", message },
      { status: 500 },
    )
  }
}

function extractJson(text: string): string {
  // Try to extract a fenced ```json block if present
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fenceMatch?.[1]) return fenceMatch[1]
  return text.trim()
}


