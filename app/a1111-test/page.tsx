"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function A1111TestPage() {
  const [health, setHealth] = useState<any>(null)
  const [gen, setGen] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runHealth = async () => {
    setLoading(true)
    setGen(null)
    try {
      const res = await fetch("/api/a1111/health")
      const data = await res.json()
      setHealth(data)
    } finally {
      setLoading(false)
    }
  }

  const runGen = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/a1111/test-generate")
      const data = await res.json()
      setGen(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Automatic1111 Connectivity Test</h1>
      <div className="flex gap-3 mb-6">
        <Button onClick={runHealth} disabled={loading}>Check Health</Button>
        <Button onClick={runGen} disabled={loading}>Run Test Generation</Button>
      </div>
      {health && (
        <pre className="text-sm bg-muted p-3 rounded mb-6 overflow-auto">
{JSON.stringify(health, null, 2)}
        </pre>
      )}
      {gen && (
        <div className="grid gap-2">
          <pre className="text-sm bg-muted p-3 rounded overflow-auto">{JSON.stringify({ ...gen, preview: gen.preview ? "<image>" : undefined }, null, 2)}</pre>
          {gen.preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gen.preview} alt="test" width={128} height={128} className="border rounded" />
          )}
        </div>
      )}
    </div>
  )
}


