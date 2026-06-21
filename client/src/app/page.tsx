"use client"

import axios from "axios"
import { FormEvent, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SourceDetail = {
  source: string
  chunkId: number
}

type AskResponse = {
  answer: string
  confidence: number
  sources?: SourceDetail[]
  source?: SourceDetail[]
}

type IngestResult = {
  ok: boolean
  docCount: number
  chunkCount: number
  source: string
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5000/kb"

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error ?? data?.message ?? error.message
  }

  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export default function LightRagKB() {
  const [ingestText, setIngestText] = useState("")
  const [ingestSource, setIngestSource] = useState("")
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestMsg, setIngestMsg] = useState<string | null>(null)

  const [askQuery, setAskQuery] = useState("")
  const [askK, setAskK] = useState(2)
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askAnswer, setAskAnswer] = useState<string>("")
  const [askConfidence, setAskConfidence] = useState<number | null>(null)
  const [askSources, setAskSources] = useState<SourceDetail[]>([])

  async function handleIngest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!ingestText.trim()) {
      setIngestMsg("Please enter text to ingest.")
      return
    }

    setIngestLoading(true)
    setIngestMsg(null)

    try {
      const payload = {
        text: ingestText,
        source: ingestSource.trim() || "pasted text",
      }

      const { data } = await axios.post<IngestResult>(`${API_BASE}/ingest`, payload)

      setIngestMsg(
        `Ingested ${data.docCount} document with ${data.chunkCount} chunks from ${data.source}.`
      )
      setIngestText("")
    } catch (error) {
      setIngestMsg(getErrorMessage(error))
    } finally {
      setIngestLoading(false)
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (askQuery.trim().length < 3) {
      setAskError("Ask a longer query (minimum 3 characters).")
      return
    }

    setAskLoading(true)
    setAskError(null)

    try {
      const { data } = await axios.post<AskResponse>(`${API_BASE}/ask`, {
        query: askQuery,
        k: askK,
      })

      setAskAnswer(data.answer ?? "")
      setAskConfidence(typeof data.confidence === "number" ? data.confidence : null)
      setAskSources(data.sources ?? data.source ?? [])
    } catch (error) {
      setAskError(getErrorMessage(error))
      setAskAnswer("")
      setAskConfidence(null)
      setAskSources([])
    } finally {
      setAskLoading(false)
    }
  }

  async function handleReset() {
    setIngestLoading(true)
    setIngestMsg(null)

    try {
      await axios.post(`${API_BASE}/reset`)
      setIngestMsg("Knowledge base reset successfully.")
      setAskAnswer("")
      setAskConfidence(null)
      setAskSources([])
    } catch (error) {
      setIngestMsg(getErrorMessage(error))
    } finally {
      setIngestLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col gap-4 px-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out overflow-hidden">
      <header className="space-y-1 text-center mb-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground text-yellow-400">Knowledge Base</h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          Ingest text on the left and ask grounded questions on the right.
        </p>
      </header>

      <section className="flex-1 min-h-0 grid grid-cols-1 gap-4 lg:grid-cols-2 pb-4">
        <Card className="h-full min-h-0 flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Add To KB</CardTitle>
            <CardDescription>Ingest text into your RAG knowledge base.</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto">
            <form className="space-y-4" onSubmit={handleIngest}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Text</label>
                <textarea
                  rows={6}
                  value={ingestText}
                  onChange={(event) => setIngestText(event.target.value)}
                  placeholder="Paste your content here..."
                  className="w-full resize-y rounded-md border bg-background/50 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Source</label>
                <input
                  type="text"
                  value={ingestSource}
                  onChange={(event) => setIngestSource(event.target.value)}
                  placeholder="example: policy-doc"
                  className="w-full rounded-md border bg-background/50 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={ingestLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                >
                  {ingestLoading ? "Ingesting..." : "Ingest"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={ingestLoading}
                  className="rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                >
                  Reset KB
                </button>
              </div>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground">{ingestMsg ?? "Ready"}</p>
          </CardFooter>
        </Card>

        <Card className="h-full min-h-0 flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ask Query</CardTitle>
            <CardDescription>Ask from ingested content and review chunk sources.</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto ">
            <form className="space-y-4" onSubmit={handleAsk}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Query</label>
                <textarea
                  rows={6}
                  value={askQuery}
                  onChange={(event) => setAskQuery(event.target.value)}
                  placeholder="Ask your question here..."
                  className="w-full resize-y rounded-md border bg-background/50 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Top Chunks (k)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={askK}
                  onChange={(event) => setAskK(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                  className="w-full rounded-md border bg-background/50 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={askLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                >
                  {askLoading ? "Asking..." : "Ask"}
                </button>
              </div>
            </form>

            {askError ? <p className="mt-4 text-sm text-destructive">{askError}</p> : null}

            {askAnswer ? (
              <div className="mt-6 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-inner animate-in fade-in slide-in-from-top-2 duration-500">
                <div>
                  <h3 className="text-sm font-semibold">Answer</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{askAnswer}</p>
                </div>

                <p className="text-sm">
                  <span className="font-medium">Confidence:</span>{" "}
                  {askConfidence !== null ? askConfidence : "N/A"}
                </p>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Sources</h3>
                  {askSources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sources returned.</p>
                  ) : (
                    askSources.map((item, index) => (
                      <div
                        key={`${item.source}-${item.chunkId}-${index}`}
                        className="rounded-md border border-border/50 bg-background/50 p-3 text-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                      >
                        <p>
                          <span className="font-medium">Source:</span> {item.source}
                        </p>
                        <p>
                          <span className="font-medium">Chunk ID:</span> {item.chunkId}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}