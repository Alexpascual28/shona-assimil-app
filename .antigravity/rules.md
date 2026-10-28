# Workspace Rules: Shona (Zezuru) Assimil Platform
- **Architecture**: Python 3.11+ for the offline data pipeline (`/pipeline`); Electron + React + TypeScript + Vite + TailwindCSS for the offline desktop app (`/app`).
- **Data Contract**: The Python pipeline outputs `/app/public/course_data.json` and copies normalized `.wav`/`.mp3` files into `/app/public/audio/`.
- **Linguistic Standard**: All LLM-generated notes, translations, and exercises must strictly follow Central Shona (Zezuru dialect - Harare standard), emphasizing noun classes (mipanda yemazita 1-21), concords (zvivakashure), and high/low tone patterns.
- **Verification**: Always generate an Implementation Plan Artifact before writing code. For UI tasks, use `/browser` to record a walkthrough Artifact verifying state transitions.