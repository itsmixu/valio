# Valio Support Vision – Junction 2025

Valio Aimo’s Junction 2025 project delivers a calm, human-facing support portal that combines computer vision with instant escalation options. Customers upload their shipment photo, the site forwards it to an n8n workflow powered by OpenAI Vision, and the interface responds with a concise Finnish-language assessment plus a high-confidence helpline prompt when escalation is warranted.

## Experience flow

- **Hero onboarding** – A brand-focused introduction that explains the AI-assisted photo check in plain Finnish.
- **Intuitive upload** – Drag-and-drop or browse for a shipment image. The UI guides acceptable formats, enforces size limits, and previews the selected file.
- **Real-time analysis** – While the n8n workflow runs, the status banner shows progress (“Tarkistetaan kuvaa…”). Results surface as a single AI comment with optional notes, keeping the message clear for logistics staff.
- **Escalation-ready** – When the model is confident the shipment is real and identifies issues, a highlighted call-to-action reveals the dedicated Valio helpline (`+358 45 49 11233`) for instant follow-up.

## Technical outline

- **Frontend** – Vite + React + TypeScript with a light Finnish theme, responsive layouts, and animated gradients.
- **AI backend** – n8n webhook receives the image, orchestrates OpenAI Vision prompts, and returns structured JSON that the UI renders.
- **Data contract** – The workflow replies with keys such as `looksLikeShipment`, `confidenceThatPictureIsShipment`, `summary`, and optional `notes`, which the interface normalizes and displays.

## Event context

This site was crafted for **Junction 2025** to demonstrate how Valio Aimo can streamline customer support for logistics anomalies by pairing AI vision checks with trusted human escalation paths. It is designed for live demos, investor walkthroughs, and hackathon judging, focusing on clarity, accessibility, and rapid troubleshooting.
