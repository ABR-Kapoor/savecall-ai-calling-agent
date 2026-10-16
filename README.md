# SaveCall IDE Instruction Pack

This is an instruction/documentation pack for an IDE coding assistant. It does not modify application code and does not prove any feature is implemented.

Start with `START_HERE.md`, then use `IDE_EXECUTION_PROMPT.md` as the first prompt in your coding IDE.

The pack is designed around the existing public repository and its advertised stack (TanStack Start, React/TypeScript, Clerk, InsForge/PostgreSQL, LiveKit, Groq, and Ollama), while explicitly requiring a source audit before implementation. The most important rule is to fix tenant isolation, authentication, synthetic data, and false-success behavior before adding more product features.
