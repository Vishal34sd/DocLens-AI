import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import cors from "cors" ;
import kbRouter from "./src/routes/askRag"



const app = express();


app.use(
    cors({
        origin :['http://localhost:3000'],
        methods : ['POST' , 'DELETE' , 'GET' , 'OPTIONS'],
        allowedHeaders : ['Content-Type', 'Authorization'],
        credentials : false
    })
)

app.use(express.json());
app.use("/kb", kbRouter)



const PORT = process.env.PORT || 5000;

app.listen(PORT , ()=>{
    console.log(`Server is running on port ${PORT}`)
})