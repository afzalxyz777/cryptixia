import express from "express"
import dotenv from "dotenv"
import cors from "cors"

// Load env
dotenv.config({ path: ".env.local" })

const app = express()

// Allow frontend (localhost:3000) to call backend (localhost:3001)
app.use(cors())
app.use(express.json())

// Import routes
import pinMetadata from "./api/pinMetadata"
app.use("/api/pinMetadata", pinMetadata)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
