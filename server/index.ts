import express from "express"
import cors from "cors"
import dotenv from "dotenv"

import pinMetadataRouter from "./api/pinMetadata"
import initAgentProfileRouter from "./api/initAgentProfile"

dotenv.config({ path: ".env.local" })

const app = express()
app.use(cors())
app.use(express.json())

// ✅ API routes
app.use("/api/pinMetadata", pinMetadataRouter)
app.use("/api/initAgentProfile", initAgentProfileRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
