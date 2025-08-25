# CRYPTIXIA Token Metadata Spec (v1.0)

## Purpose
Defines JSON structure for NFT agent metadata used by CRYPTIXIA.

## Top-level fields
- `version` (string) — spec version. Example: `"1.0"`.  
- `name` (string) — display name.  
- `description` (string) — short text.  
- `image` (string) — IPFS URI to image. Format: `ipfs://<cid>`.  
- `external_url` (string, optional) — project or agent page.  
- `attributes` (array) — OpenSea-compatible traits. Each item:  
  - `trait_type` (string)  
  - `value` (string | number | boolean)  
- `memory_uri` (string, optional) — IPFS URI linking extended memory bundle.  
- `agent_id` (string) — unique id inside project.  
- `created_at` (string, ISO-8601) — e.g. `"2025-08-24T12:00:00Z"`.

## Constraints
- URIs must be `ipfs://` where possible.  
- Strings UTF-8.  
- `attributes` length ≤ 50.  
- Numbers finite.  
- Booleans literal `true|false`.

## Notes
- Extra project fields are allowed but must not break the above keys.  
- Use lowercase snake_case for any new keys.

## JSON Schema (machine-readable)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Cryptixia Token Metadata",
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "image": { "type": "string", "pattern": "^ipfs://.+" },
    "external_url": { "type": "string" },
    "attributes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "trait_type": { "type": "string" },
          "value": {}
        },
        "required": ["trait_type", "value"]
      }
    },
    "memory_uri": { "type": "string", "pattern": "^ipfs://.+" },
    "agent_id": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  },
  "required": ["version", "name", "description", "image", "attributes", "agent_id", "created_at"]
}

## Example Metadata JSON

```json
{
  "version": "1.0",
  "name": "Agent X",
  "description": "A stealth hacker operating in the underworld of Cryptixia.",
  "image": "ipfs://bafybeigdyrzt4examplehashxyz/image.png",
  "external_url": "https://cryptixia.example/agents/agentx",
  "attributes": [
    { "trait_type": "Faction", "value": "Shadow Guild" },
    { "trait_type": "Skill", "value": "Hacking" },
    { "trait_type": "Level", "value": 7 },
    { "trait_type": "Notoriety", "value": "High" }
  ],
  "memory_uri": "ipfs://bafybeihashofagentxmemories",
  "agent_id": "agent_x_001",
  "created_at": "2025-08-24T12:00:00Z"
}
