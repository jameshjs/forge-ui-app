import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY env var" },
        { status: 500 }
      )
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Generate a high-quality test icon: simple flat minimal vector icon, clean design, 64x64 pixels, professional artwork"
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { ok: false, status: `${res.status} ${res.statusText}`, details: text },
        { status: 502 },
      )
    }

    const data = (await res.json()) as any
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const base64Image = data.candidates[0].content.parts[0].inlineData.data
      return NextResponse.json({ ok: true, preview: `data:image/png;base64,${base64Image}` })
    } else {
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
      return NextResponse.json(
        { ok: false, error: "Gemini returned text instead of image", details: textResponse },
        { status: 502 }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}


