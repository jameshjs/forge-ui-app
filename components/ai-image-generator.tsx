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
  const [expanded, setExpanded] = useState<null | {
    background: string
    frame: string
    symbol_icons: string[]
    wild_icons: string[]
  }>(null)
  const [finalsByTitle, setFinalsByTitle] = useState<Record<string, { imageUrl: string; width: number; height: number }>>({})
  
  // Flux API parameters
  const [goFast, setGoFast] = useState(true)
  const [guidance, setGuidance] = useState([3.5])
  const [megapixels, setMegapixels] = useState([1.0])
  const [numOutputs, setNumOutputs] = useState("1")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [outputFormat, setOutputFormat] = useState("webp")
  const [outputQuality, setOutputQuality] = useState([90])
  const [promptStrength, setPromptStrength] = useState([0.8])
  const [numInferenceSteps, setNumInferenceSteps] = useState([20])

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


        {/* Flux Generation Parameters */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Flux Generation Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="go-fast">Go Fast</Label>
              <Select value={goFast ? "true" : "false"} onValueChange={(value) => setGoFast(value === "true")}>
                <SelectTrigger id="go-fast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Fast</SelectItem>
                  <SelectItem value="false">Slow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="guidance">Guidance: {guidance[0]}</Label>
              <Slider id="guidance" min={1} max={20} step={0.1} value={guidance} onValueChange={setGuidance} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="megapixels">Megapixels: {megapixels[0]}</Label>
              <Slider id="megapixels" min={0.5} max={4.0} step={0.1} value={megapixels} onValueChange={setMegapixels} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="num-outputs">Number of Outputs</Label>
              <Select value={numOutputs} onValueChange={setNumOutputs}>
                <SelectTrigger id="num-outputs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger id="aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                  <SelectItem value="2:3">2:3 (Portrait)</SelectItem>
                  <SelectItem value="3:2">3:2 (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="output-format">Output Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger id="output-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="output-quality">Output Quality: {outputQuality[0]}</Label>
              <Slider id="output-quality" min={1} max={100} step={1} value={outputQuality} onValueChange={setOutputQuality} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="prompt-strength">Prompt Strength: {promptStrength[0]}</Label>
              <Slider id="prompt-strength" min={0.1} max={1.0} step={0.1} value={promptStrength} onValueChange={setPromptStrength} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="num-inference-steps">Inference Steps: {numInferenceSteps[0]}</Label>
              <Slider id="num-inference-steps" min={1} max={50} step={1} value={numInferenceSteps} onValueChange={setNumInferenceSteps} />
            </div>
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
          injectedPrompt={expanded?.background}
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
          // Flux parameters
          goFast={goFast}
          guidance={guidance[0]}
          megapixels={megapixels[0]}
          numOutputs={Number.parseInt(numOutputs)}
          aspectRatio={aspectRatio}
          outputFormat={outputFormat}
          outputQuality={outputQuality[0]}
          promptStrength={promptStrength[0]}
          numInferenceSteps={numInferenceSteps[0]}
        />

        {/* UI Frame */}
        <AssetGenerationSection
          title="UI Frame"
          defaultWidth={512}
          defaultHeight={512}
          globalPrompt={globalPrompt}
          globalStyle={globalStyle}
          globalVariantCount={Number.parseInt(globalVariantCount || "1")}
          injectedPrompt={expanded?.frame}
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
          // Flux parameters
          goFast={goFast}
          guidance={guidance[0]}
          megapixels={megapixels[0]}
          numOutputs={Number.parseInt(numOutputs)}
          aspectRatio={aspectRatio}
          outputFormat={outputFormat}
          outputQuality={outputQuality[0]}
          promptStrength={promptStrength[0]}
          numInferenceSteps={numInferenceSteps[0]}
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
            injectedPrompt={expanded?.symbol_icons?.[i]}
            onRegisterGenerate={registerGenerateFunction}
            onSetFinal={handleSetFinal}
            cohesionHint={`A simple, clear symbol icon representing {object/idea: e.g., sword, star, coin, potion}, in {art style}, bold silhouette, {color palette}, designed for small-scale visibility, transparent background, crisp edges, minimal design, designed to blend seamlessly with the game interface without standing out too much.`}
            minWords={25}
            // Flux parameters
            goFast={goFast}
            guidance={guidance[0]}
            megapixels={megapixels[0]}
            numOutputs={Number.parseInt(numOutputs)}
            aspectRatio={aspectRatio}
            outputFormat={outputFormat}
            outputQuality={outputQuality[0]}
            promptStrength={promptStrength[0]}
            numInferenceSteps={numInferenceSteps[0]}
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
            injectedPrompt={expanded?.wild_icons?.[i]}
            onRegisterGenerate={registerGenerateFunction}
            onSetFinal={handleSetFinal}
            cohesionHint={`A glowing, attention-grabbing wild icon symbolizing {wild feature: e.g., phoenix, crown, magic crystal}, in {art style}, with luminous effects, bold outline, high contrast, {color palette}, designed to stand out from regular icons, minimal background, glowing aura, magical particles, dynamic energy.`}
            minWords={25}
            // Flux parameters
            goFast={goFast}
            guidance={guidance[0]}
            megapixels={megapixels[0]}
            numOutputs={Number.parseInt(numOutputs)}
            aspectRatio={aspectRatio}
            outputFormat={outputFormat}
            outputQuality={outputQuality[0]}
            promptStrength={promptStrength[0]}
            numInferenceSteps={numInferenceSteps[0]}
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
          onRegisterGenerate={registerGenerateFunction}
          onSetFinal={handleSetFinal}
          cohesionHint={`Follow the visual language set by the Background and UI Frame for palette, lighting, and style.`}
          // Flux parameters
          goFast={goFast}
          guidance={guidance[0]}
          megapixels={megapixels[0]}
          numOutputs={Number.parseInt(numOutputs)}
          aspectRatio={aspectRatio}
          outputFormat={outputFormat}
          outputQuality={outputQuality[0]}
          promptStrength={promptStrength[0]}
          numInferenceSteps={numInferenceSteps[0]}
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
