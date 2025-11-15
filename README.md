# Valio Support Vision App

Sleek customer-support portal that validates shipment photos with OpenAI Vision via an n8n webhook before routing customers to the helpline.

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy the example environment file and add your webhook URL:
   ```sh
   cp .env.example .env
   ```
   - `VITE_N8N_WEBHOOK_URL` should point to your n8n workflow that wraps the OpenAI Vision API.
3. Run the dev server:
   ```sh
   npm run dev
   ```

## n8n Webhook Contract

The React app posts a multipart request that only contains the uploaded shipment photo:

- `file`: the shipment image (`File`)

Handle prompts, metadata, and any additional context inside your n8n workflow. The workflow should call the OpenAI Vision model, decide how to phrase the question, and finally respond with JSON shaped like:

```json
{
  "looksLikeShipment": true,
  "missingItems": ["Packing slip"],
  "confidence": 0.82,
  "summary": "The palette shows all labelled boxes and appears complete.",
  "notes": "Escalate only if labels do not match manifest."
}
```

Fields:

- `looksLikeShipment` (boolean) — whether the AI confirms it’s a shipment photo.
- `missingItems` (string[]) — list items the AI thinks are missing (empty if none).
- `confidence` (number 0–1) — normalized confidence score.
- `summary` (string) — single-paragraph human-readable explanation.
- `notes` (string, optional) — extra context or escalation guidance.

Additional keys are ignored, but missing fields fall back to safe defaults. Confidence ≥ 0.7 reveals the helpline number in the UI.

## Production Build

To create a production bundle:

```sh
npm run build
```

Then serve `dist/` with your preferred static host.
