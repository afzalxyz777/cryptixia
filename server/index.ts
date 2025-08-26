// server/index.ts
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import pinMetadata from "./api/pinMetadata"
import initAgentProfile from "./api/initAgentProfile"   // ✅ import

dotenv.config({ path: ".env.local" })

const app = express()
app.use(cors())
app.use(express.json())

// ✅ register API routes
app.use("/api/pinMetadata", pinMetadata)
app.use("/api/initAgentProfile", initAgentProfile)

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001")
})
