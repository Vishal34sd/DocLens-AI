// ask the kb - knowledge -> retrieval + ans
// what is our refund policy for late payments ? -> query

// 1-> embed the query
//vector -> array of numbers
//we must use the same embeddings model that we used while indexing the KB

// 2-> retrive most similar chunks from our vector store

//build a ans/grounded answer
// built a prompt
// tell the model
// model is going give the final ans & confidence score also

// [{answer : "" , sources : [] , confidence}]

// ask the kb - knowledge -> retrieval + answer

// ask the kb - knowledge -> retrieval + answer

import {getVectorStore} from "./store"
import {getChatModel} from "./model"
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export type KBSource = {
  source: string;
  chunkId: number;
};

export type KBAskResult = {
  answer: string;
  sources: KBSource[];
  confidence: number;
};

function buildContext(chunks: { text: string; meta: any }[]) {
  return chunks
    .map(({ text, meta }, i) =>
      [
        `[#${i + 1}] (${String(meta?.source ?? "unknown")} #${String(
          meta?.chunkId ?? "?"
        )})`,
        text ?? "Empty text",
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

// 🔹 LLM call
async function buildFinalAnswerFromLLM(query: string, context: string) {
  const model = getChatModel({ temperature: 0.2 });

  const res = await model.invoke([
    new SystemMessage(
      [
        "You are a helpful assistant that answers only using the provided context.",
        "If the answer is not found in the current context, say so briefly.",
        "Be concise (4 - 5 sentences), neutral, and avoid any marketing info.",
        "Do not fabricate sources or cite anything that is not in the context",
      ].join("\n")
    ),

    new HumanMessage(
      [
        `Question:\n${query}`, 
        "",
        "Context: (quoted chunks) ->",
        context || "no relevant context",
      ].join("\n")
    ),
  ]);

  const finalRes =
    typeof res.content === "string" ? res.content : String(res.content);

  return finalRes.trim().slice(0, 1500);
}

// 🔹 Confidence
function buildConfidence(scores: number[]): number {
  if (!scores.length) return 0;

  const clamped = scores.map((score) =>
    Math.max(0, Math.min(1, score))
  );

  const avg =
    clamped.reduce((a, b) => a + b, 0) / clamped.length; 

  return Math.round(avg * 100) / 100;
}

// 🔹 Main function
export async function askKB(
  query: string,
  k = 2
): Promise<KBAskResult> {
  const validatedQuery = (query ?? "").trim();

  if (!validatedQuery) {
    throw new Error("Query is empty");
  }

  const store = getVectorStore();

  // 1️⃣ Embed query
  const embedQuery = await store.embeddings.embedQuery(validatedQuery);

  // 2️⃣ Retrieve chunks
  const pairs = await store.similaritySearchVectorWithScore(embedQuery, k);

  const chunks = pairs.map(([doc]) => ({
    text: doc.pageContent || "",
    meta: doc.metadata || {},
  }));

  const scores = pairs.map(([_, score]) => Number(score) || 0);

  // 3️⃣ Context
  const context = buildContext(chunks);

  // 4️⃣ Answer
  const answer = await buildFinalAnswerFromLLM(validatedQuery, context);

  // 5️⃣ Sources
  const sources: KBSource[] = chunks.map((c: { text: string; meta: Record<string, any> }) => ({
    source: String(c.meta?.source ?? "unknown"),
    chunkId: Number(c.meta?.chunkId ?? 0), 
  }));

  // 6️⃣ Confidence
  const confidence = buildConfidence(scores);

  return {
    answer,
    sources,
    confidence,
  };
}