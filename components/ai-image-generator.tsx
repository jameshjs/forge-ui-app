"use client"

import { useState, useCallback, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { AssetGenerationSection } from "./asset-generation-section"

export function AiImageGenerator() {
  const [globalPrompt, setGlobalPrompt] = useState("")
  const [generateAllFunctions, setGenerateAllFunctions] = useState<((overrideCount?: number) => void)[]>([])
  const [globalStyle, setGlobalStyle] = useState("")
  const [globalVariantCount, setGlobalVariantCount] = useState("1")
  const [globalLoraModel, setGlobalLoraModel] = useState("none")
  const [globalCfgScale, setGlobalCfgScale] = useState([7])
  const [loadingLoras, setLoadingLoras] = useState(false)
  const [availableLoras, setAvailableLoras] = useState<{ name: string; alias?: string }[]>([])
  const [expanded, setExpanded] = useState<null | {
    background: string
    frame: string
    symbol_icons: string[]
    wild_icons: string[]
  }>(null)
  const [finalsByTitle, setFinalsByTitle] = useState<Record<string, { imageUrl: string; width: number; height: number }>>({})

  // Using a ref or a more robust state management for registered functions
  // to avoid issues with stale closures if components re-render frequently.
  // For this example, a simple array state is sufficient.
  const registerGenerateFunction = useCallback((fn: (overrideCount?: number) => void) => {
    setGenerateAllFunctions((prev) => {
      // Ensure no duplicates are added if component re-renders
      if (!prev.includes(fn)) {
        return [...prev, fn]
      }
      return prev
    })
  }, [])

  const handleGenerateAll = () => {
    if (!globalPrompt.trim()) {
      alert("Please enter a global prompt before generating all assets.")
      return
    }
    const count = Number.parseInt(globalVariantCount || "1")
    generateAllFunctions.forEach((fn) => fn(count))
    alert("Generating all assets (check console for details).")
  }

  const handleExpandPrompts = async () => {
    if (!globalPrompt.trim()) {
      alert("Please enter a global prompt first.")
      return
    }
    try {
      const res = await fetch("/api/expand-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalPrompt }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Prompt expansion failed: ${res.status} ${res.statusText}\n${text}`)
        return
      }
      const data = (await res.json()) as {
        background: string
        frame: string
        symbol_icons: string[]
        wild_icons: string[]
      }
      setExpanded(data)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert(`Prompt expansion error: ${message}`)
    }
  }

  // Load available LoRA models from A1111
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        setLoadingLoras(true)
        const res = await fetch("/api/a1111/loras")
        if (!res.ok) return
        const data = (await res.json()) as { ok?: boolean; loras?: { name: string; alias?: string }[] }
        if (isMounted && data?.loras) setAvailableLoras(data.loras)
      } catch {
        // ignore, keep default "None"
      } finally {
        if (isMounted) setLoadingLoras(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSetFinal = useCallback((args: { title: string; imageUrl: string; width: number; height: number }) => {
    setFinalsByTitle((prev) => ({ ...prev, [args.title]: { imageUrl: args.imageUrl, width: args.width, height: args.height } }))
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4">AI Image Generator</h1>
        <div className="grid gap-2 mb-4">
          <label htmlFor="global-prompt" className="text-lg font-medium text-gray-900 dark:text-gray-50">
            Global Prompt Input
          </label>
          <Textarea
            id="global-prompt"
            placeholder="Enter your global prompt here, e.g., 'A futuristic city at sunset, highly detailed, cyberpunk style'"
            value={globalPrompt}
            onChange={(e) => setGlobalPrompt(e.target.value)}
            className="min-h-[100px] resize-y"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sections inherit this prompt unless you edit them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="grid gap-2">
            <Label htmlFor="global-style">Global Style</Label>
            <Input
              id="global-style"
              placeholder="e.g., cinematic, highly detailed"
              value={globalStyle}
              onChange={(e) => setGlobalStyle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="global-variant-count">Variant Count</Label>
            <Select value={globalVariantCount} onValueChange={setGlobalVariantCount}>
              <SelectTrigger id="global-variant-count">
                <SelectValue placeholder="Select count" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="grid gap-2">
            <Label htmlFor="global-lora">LoRA Model</Label>
            <Select value={globalLoraModel} onValueChange={setGlobalLoraModel}>
              <SelectTrigger id="global-lora">
                <SelectValue placeholder="Select LoRA model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {loadingLoras && (
                  <SelectItem value="__loading" disabled>
                    Loading...
                  </SelectItem>
                )}
                {!loadingLoras &&
                  availableLoras.map((l) => (
                    <SelectItem key={l.name} value={l.name}>
                      {l.alias ? `${l.alias} (${l.name})` : l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="global-cfg">CFG Scale: {globalCfgScale[0]}</Label>
            <Slider id="global-cfg" min={1} max={20} step={1} value={globalCfgScale} onValueChange={setGlobalCfgScale} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={handleExpandPrompts} className="w-full">Generate Section Prompts (Gemini)</Button>
          <Button onClick={handleGenerateAll} className="w-full">Generate All Assets ({globalVariantCount} Variants Each)</Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AssetGenerationSection
          title="Background"
          defaultWidth={512}
          defaultHeight={512}
          globalPrompt={globalPrompt}
          globalStyle={globalStyle}
          globalVariantCount={Number.parseInt(globalVariantCount || "1")}
          globalLoraModel={globalLoraModel}
          globalCfgScale={globalCfgScale[0]}
          injectedPrompt={expanded?.background}
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
        />

        {/* UI Frame */}
        <AssetGenerationSection
          title="UI Frame"
          defaultWidth={512}
          defaultHeight={512}
          globalPrompt={globalPrompt}
          globalStyle={globalStyle}
          globalVariantCount={Number.parseInt(globalVariantCount || "1")}
          globalLoraModel={globalLoraModel}
          globalCfgScale={globalCfgScale[0]}
          injectedPrompt={expanded?.frame}
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
        />

        {/* 20 Symbol Icons */}
        {Array.from({ length: 20 }, (_, i) => (
          <AssetGenerationSection
            key={`symbol-${i}`}
            title={`Symbol Icon ${i + 1}`}
            defaultWidth={256}
            defaultHeight={256}
            globalPrompt={globalPrompt}
            globalStyle={globalStyle}
            globalVariantCount={Number.parseInt(globalVariantCount || "1")}
            globalLoraModel={globalLoraModel}
            globalCfgScale={globalCfgScale[0]}
            injectedPrompt={expanded?.symbol_icons?.[i]}
            onRegisterGenerate={registerGenerateFunction}
            onSetFinal={handleSetFinal}
            cohesionHint={`Single, centered subject with a clear silhouette; minimal or flat background; match Background and UI Frame palette and lighting; specify material and surface (polished metal, carved wood, faceted gem), fine engraving, soft ambient occlusion, subtle rim light, balanced saturation, clean negative space, icon-ready, no text.`}
            minWords={25}
          />
        ))}

        {/* 5 Wild Icons */}
        {Array.from({ length: 5 }, (_, i) => (
          <AssetGenerationSection
            key={`wild-${i}`}
            title={`Wild Icon ${i + 1}`}
            defaultWidth={512}
            defaultHeight={512}
            globalPrompt={globalPrompt}
            globalStyle={globalStyle}
            globalVariantCount={Number.parseInt(globalVariantCount || "1")}
            globalLoraModel={globalLoraModel}
            globalCfgScale={globalCfgScale[0]}
            injectedPrompt={expanded?.wild_icons?.[i]}
            onRegisterGenerate={registerGenerateFunction}
            onSetFinal={handleSetFinal}
            cohesionHint={`Single, centered subject with dynamic energy or aura; glowing effects and magical particles; match Background and UI Frame palette and lighting; specify material and surface qualities, motion streaks, high-contrast rim light, minimal backdrop, clean negative space, icon-ready, no text.`}
            minWords={25}
          />
        ))}

        {/* Bonus Art (optional) */}
        <AssetGenerationSection
          title="Bonus Art"
          defaultWidth={768}
          defaultHeight={768}
          globalPrompt={globalPrompt}
          globalStyle={globalStyle}
          globalVariantCount={Number.parseInt(globalVariantCount || "1")}
          globalLoraModel={globalLoraModel}
          globalCfgScale={globalCfgScale[0]}
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
          cohesionHint={`Follow the visual language set by the Background and UI Frame for palette, lighting, and style.`}
        />
      </main>

      {/* Final Canvas */}
      {Object.keys(finalsByTitle).length > 0 && (
        <section className="w-full max-w-6xl mx-auto mt-10">
          <h2 className="text-2xl font-semibold mb-4">Final Canvas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(finalsByTitle).map(([title, item]) => (
              <div key={title} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">{item.width}×{item.height}</div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={`${title} final`}
                  className="w-full h-auto object-contain rounded"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
