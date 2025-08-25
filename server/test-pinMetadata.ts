// server/test-pinMetadata.ts
import axios from "axios";

async function testPinMetadata() {
  try {
    const metadata = {
      name: "Agent X",
      description: "A test agent for Cryptixia mint flow.",
      attributes: [
        { trait_type: "role", value: "negotiator" },
        { trait_type: "strength", value: "diplomacy" },
      ],
    };

    console.log("📡 Sending metadata to /api/pinMetadata...");
    const response = await axios.post("http://localhost:3001/api/pinMetadata", metadata, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Server response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("❌ Error during test-pinMetadata:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testPinMetadata();
