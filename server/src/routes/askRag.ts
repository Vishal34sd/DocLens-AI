import {Router} from "express";
import * as z from "zod";
import {ingestText} from "../rag_kb/ingest"
import {resetStore} from "../rag_kb/store"
import {askKB} from "../rag_kb/ask"

export const kbRouter = Router();

const ingestBody = z.object({
    text : z.string().min(1, "Provide some text to ingest"),
    source : z.string().optional()
})

type ingestBodyT = z.infer<typeof ingestBody>

kbRouter.post("/ingest" , async(req , res)=>{
    try{
        const body = ingestBody.parse(req.body) as ingestBodyT

        const result = await ingestText({text : body.text , source : body.source ?? "pasted text" });

        return res.status(200).json({ok : true , ...result})
    }
    catch(err){
        console.log("Something went wrong " , err)
        return res.status(500).json({ok: false, error: err instanceof Error ? err.message : "Ingestion failed"})
    }
});

kbRouter.post("/reset" , async(_req , res)=>{
    resetStore();
    return res.status(200).json({ok : true , cleared : true })
})

const askBody = z.object({
    query : z.string().min(3, "Please ask a complete query"),
    k: z.number().int().min(1).max(10).optional()
})

type askBodyT = z.infer<typeof askBody>

kbRouter.post("/ask", async(req , res)=>{
    try{
        const body = askBody.parse(req.body) as askBodyT ;

        const result = await askKB(body.query , body.k ?? 2 );

        return res.status(200).json({
            answer : result.answer ,
            sources : result.sources ,
            confidence : result.confidence
        });
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ok: false, error: err instanceof Error ? err.message : "Ask failed"})
    }
})

export default kbRouter ;