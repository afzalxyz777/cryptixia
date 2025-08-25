🧠 Cryptixia Memory Schema
Overview

Memories in Cryptixia are stored as embeddings in Pinecone (vector DB).
They capture agent knowledge, traits, events, successes, and weaknesses for retrieval during missions and interactions.

Schema Fields
| Field       | Type      | Description                                                                  |
| ----------- | --------- | ---------------------------------------------------------------------------- |
| `id`        | string    | Unique memory ID (e.g., `"memory_001"`)                                      |
| `agent_id`  | string    | Identifier for the agent this memory belongs to (e.g., `"agent_x_001"`)      |
| `text`      | string    | The actual content of the memory (knowledge, event, trait, etc.)             |
| `tags`      | string\[] | (Optional) Categories for filtering (e.g., `["diplomacy", "success"]`)       |
| `timestamp` | string    | (Optional) ISO datetime of when the memory was created or recorded           |
| `source`    | string    | (Optional) Where the memory came from (manual entry, simulation, logs, etc.) |

Example: Agent X Memories
{
  "id": "memory_1",
  "agent_id": "agent_x_001",
  "text": "Agent X is a master negotiator, skilled in persuasion and conflict resolution.",
  "tags": ["trait", "negotiation", "diplomacy"],
  "timestamp": "2025-08-25T10:00:00Z",
  "source": "manual-entry"
}
{
  "id": "memory_2",
  "agent_id": "agent_x_001",
  "text": "Agent X negotiated a ceasefire between rival guilds in 2023.",
  "tags": ["event", "diplomacy", "achievement"],
  "timestamp": "2023-11-12T00:00:00Z",
  "source": "lore-database"
}

Notes

All memories embed into vectors for semantic search.

tags help with filtering by category (e.g., only “weaknesses”).

Schema is designed to scale for multiple agents