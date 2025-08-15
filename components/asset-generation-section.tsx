"use client"

import { useState, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, RefreshCcw, Trash2, Check, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface AssetGenerationSectionProps {
  title: string
  defaultWidth: number
  defaultHeight: number
  globalPrompt: string
  globalStyle: string
  globalVariantCount: number
  globalLoraModel: string
  globalCfgScale: number
  injectedPrompt?: string
  onRegisterGenerate: (generateFn: (overrideVariantCount?: number) => void) => void
  onSetFinal?: (args: { title: string; imageUrl: string; width: number; height: number }) => void
  cohesionHint?: string
  minWords?: number
}

export function AssetGenerationSection({
  title,
  defaultWidth,
  defaultHeight,
  globalPrompt,
  globalStyle,
  globalVariantCount,
  globalLoraModel,
  globalCfgScale,
  injectedPrompt,
  onRegisterGenerate,
  onSetFinal,
  cohesionHint,
  minWords,
}: AssetGenerationSectionProps) {
  const [sectionPrompt, setSectionPrompt] = useState("")
  const [isPromptOverridden, setIsPromptOverridden] = useState(false)
  const [width, setWidth] = useState(defaultWidth)
  const [height, setHeight] = useState(defaultHeight)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [progressText, setProgressText] = useState<string>("")

  // Keep section prompt in sync with global until user edits this section
  useEffect(() => {
    if (!isPromptOverridden) {
      setSectionPrompt(globalPrompt)
    }
  }, [globalPrompt, isPromptOverridden])

  // Allow parent to inject a specific prompt (e.g., from Gemini expansion)
  useEffect(() => {
    if (injectedPrompt !== undefined) {
      setSectionPrompt(injectedPrompt)
      setIsPromptOverridden(true)
    }
  }, [injectedPrompt])

  // Poll A1111 progress while generating
  useEffect(() => {
    if (!isGenerating && regeneratingIndex === null) {
      setProgress(0)
      setProgressText("")
      return
    }
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/a1111/progress?skip_current_image=true`)
        if (!res.ok) return
        const data = (await res.json()) as {
          ok?: boolean
          progress?: number
          eta_relative?: number | null
          state?: { job?: string | null; sampling_step?: number | null; sampling_steps?: number | null }
        }
        if (cancelled) return
        let pct = progress
        if (typeof data?.progress === "number") {
          pct = data.progress
          setProgress(pct)
        }
        const step = data?.state?.sampling_step ?? null
        const steps = data?.state?.sampling_steps ?? null
        const eta = data?.eta_relative ?? null
        const parts: string[] = [`${pct}%`]
        if (step !== null && steps !== null) parts.push(`${step}/${steps}`)
        if (eta !== null) parts.push(`ETA ${Math.max(0, Math.round(eta))}s`)
        setProgressText(parts.join(" · "))
      } catch {
        // ignore polling error
      }
    }, 700)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isGenerating, regeneratingIndex])

  const handleGenerate = useCallback(
    (overrideVariantCount?: number) => {
      const effectivePrompt = sectionPrompt.trim() === "" ? globalPrompt : sectionPrompt
      const countToGenerate = overrideVariantCount !== undefined ? overrideVariantCount : globalVariantCount

      if (!effectivePrompt.trim()) {
        alert(`Please enter a prompt for ${title} or in the global prompt area before generating.`)
        return
      }

      ;(async () => {
        try {
          setIsGenerating(true)
          const promptParts = [
            effectivePrompt,
            globalStyle,
            globalLoraModel && globalLoraModel !== "none" ? `<lora:${globalLoraModel}:1>` : "",
            cohesionHint || "",
          ].filter(Boolean)
          let finalPrompt = promptParts.join(", ")
          if (minWords && minWords > 0) {
            finalPrompt = ensureMinWords(finalPrompt, minWords)
          }
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: finalPrompt,
              width,
              height,
              cfgScale: globalCfgScale,
              count: countToGenerate,
              negativePrompt: "",
            }),
          })
          if (!res.ok) {
            const text = await res.text()
            alert(`Generation failed: ${res.status} ${res.statusText}\n${text}`)
            return
          }
          const data = (await res.json()) as { images?: string[] }
          setGeneratedImages(data.images ?? [])
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          alert(`Generation error: ${message}`)
        } finally {
          setIsGenerating(false)
          setProgress(0)
          setProgressText("")
        }
      })()
    },
    [sectionPrompt, globalPrompt, width, height, globalStyle, globalVariantCount, globalLoraModel, globalCfgScale, title],
  )

  useEffect(() => {
    onRegisterGenerate(handleGenerate)
  }, [onRegisterGenerate, handleGenerate])

  const handleRegenerate = (index: number) => {
    const effectivePrompt = sectionPrompt.trim() === "" ? globalPrompt : sectionPrompt
    ;(async () => {
      try {
        setRegeneratingIndex(index)
        const promptParts = [
          effectivePrompt,
          globalStyle,
          globalLoraModel && globalLoraModel !== "none" ? `<lora:${globalLoraModel}:1>` : "",
          cohesionHint || "",
        ].filter(Boolean)
        let finalPrompt = promptParts.join(", ")
        if (minWords && minWords > 0) {
          finalPrompt = ensureMinWords(finalPrompt, minWords)
        }
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            width,
            height,
            cfgScale: globalCfgScale,
            count: 1,
            negativePrompt: "",
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          alert(`Regeneration failed: ${res.status} ${res.statusText}\n${text}`)
          return
        }
        const data = (await res.json()) as { images?: string[] }
        if (data.images && data.images[0]) {
          const updatedImages = [...generatedImages]
          updatedImages[index] = data.images[0]
          setGeneratedImages(updatedImages)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        alert(`Regeneration error: ${message}`)
      } finally {
        setRegeneratingIndex(null)
        setProgress(0)
        setProgressText("")
      }
    })()
  }

  const handleDiscard = (index: number) => {
    setGeneratedImages(generatedImages.filter((_, i) => i !== index))
  }

  const handleDownload = (imageUrl: string) => {
    try {
      const link = document.createElement("a")
      link.href = imageUrl
      const isPng = imageUrl.startsWith("data:image/png")
      const isJpeg = imageUrl.startsWith("data:image/jpeg") || imageUrl.startsWith("data:image/jpg")
      const ext = isPng ? "png" : isJpeg ? "jpg" : "png"
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      link.download = `${safeTitle}-${Date.now()}.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert(`Download failed: ${message}`)
    }
  }

  const handleSetAsFinal = (imageUrl: string) => {
    onSetFinal?.({ title, imageUrl, width, height })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${title.toLowerCase()}-prompt`}>Prompt (inherits from global if empty)</Label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPromptOverridden(false)
                setSectionPrompt(globalPrompt)
              }}
            >
              Use global prompt
            </Button>
          </div>
          <Textarea
            id={`${title.toLowerCase()}-prompt`}
            placeholder={`Specific prompt for ${title}`}
            value={sectionPrompt}
            onChange={(e) => {
              setIsPromptOverridden(true)
              setSectionPrompt(e.target.value)
            }}
            className="min-h-[60px] resize-y"
          />
        </div>
        {/* Style moved to global settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${title.toLowerCase()}-width`}>Width</Label>
            <Input
              id={`${title.toLowerCase()}-width`}
              type="number"
              value={width}
              onChange={(e) => setWidth(Number.parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${title.toLowerCase()}-height`}>Height</Label>
            <Input
              id={`${title.toLowerCase()}-height`}
              type="number"
              value={height}
              onChange={(e) => setHeight(Number.parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        {/* Progress while generating */}
        {(isGenerating || regeneratingIndex !== null) && (
          <div className="grid gap-1">
            <div className="text-sm text-muted-foreground">{progressText || "Working..."}</div>
            <Progress value={progress} />
          </div>
        )}
        {/* Transparency removed from section */}
        {/* Variant count moved to global settings */}
        {/* LoRA model moved to global settings */}
        {/* CFG Scale moved to global settings */}
        <Button onClick={() => handleGenerate()} className="w-full mt-4" disabled={isGenerating}>
          {isGenerating ? (
            <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</span>
          ) : (
            <>Generate {title}</>
          )}
        </Button>
        {generatedImages.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Generated {title} Previews</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((imageUrl, index) => (
                <Card key={index} className="relative group">
                  <CardContent className="p-2">
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt={`${title} preview ${index + 1}`}
                      width={width}
                      height={height}
                      className="w-full h-auto object-contain rounded-md aspect-video sm:aspect-square"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md">
                      <Button variant="secondary" size="sm" onClick={() => handleSetAsFinal(imageUrl)}>
                        <Check className="mr-2 h-4 w-4" /> Set as Final
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDownload(imageUrl)}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleRegenerate(index)} disabled={regeneratingIndex === index}>
                        {regeneratingIndex === index ? (
                          <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating</span>
                        ) : (
                          <><RefreshCcw className="mr-2 h-4 w-4" /> Regenerate</>
                        )}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDiscard(index)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ensureMinWords(prompt: string, minWords: number): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean)
  if (words.length >= minWords) return prompt
  // Descriptive padding phrases to reach at least minWords
  const padding = [
    "highly detailed",
    "intricate shading",
    "volumetric lighting",
    "dramatic contrast",
    "cinematic composition",
    "professional rendering",
    "realistic materials",
    "coherent color palette",
    "rich textures",
    "studio quality",
    "ultra sharp",
    "depth and dimension",
    "natural shadows",
    "refined highlights",
    "polished finish",
  ]
  const needed = Math.max(0, minWords - words.length)
  const extra = padding.slice(0, Math.min(padding.length, needed))
  const suffix = extra.length > 0 ? ", " + extra.join(", ") : ""
  return prompt + suffix
}
