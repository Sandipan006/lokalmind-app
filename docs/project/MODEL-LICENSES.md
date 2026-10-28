# Model licenses

LokalMind does not ship models inside the app. They are downloaded to the device on request (`src/infrastructure/downloads/modelConfig.ts`). Each model keeps its own license.

| Model (file) | Publisher | License (from the model card, last checked: see note) |
|---|---|---|
| Qwen3.5 0.8B / 2B / 4B (`Qwen_Qwen3.5-*-Q4_K_M.gguf`) | Alibaba Qwen | Apache 2.0 |
| Qwen3 4B (`Qwen_Qwen3-4B-Q4_K_M.gguf`) | Alibaba Qwen | Apache 2.0 |
| DeepSeek-R1-Distill-Qwen-1.5B | DeepSeek | MIT (derived from Qwen2.5, Apache 2.0) |
| Gemma 3 4B IT (`google_gemma-3-4b-it-Q4_K_M.gguf`) | Google | Gemma Terms of Use (custom; includes a prohibited-use policy) |
| Whisper base (`ggml-base.bin`) | OpenAI | MIT |
| all-MiniLM-L6-v2 (`all-MiniLM-L6-v2-Q4_K_M.gguf`) | sentence-transformers | Apache 2.0 |

**Note:** the licenses above come from the maintainer's knowledge, not from a fresh read of each model card. Before each release, open the model card for every file in `modelConfig.ts` and confirm the license, then update this table and the date.

Gemma is the one to watch: its terms are not an OSI license. Users must accept Google's terms and prohibited-use policy to use it.
