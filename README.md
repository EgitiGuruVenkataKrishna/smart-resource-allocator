# Aegis Triage
>_ Zero-Latency Semantic Routing for Crisis Response.

**BaseLayer AI** is an independent studio focused on rapid prototyping and zero-bloat backend intelligence. We build the foundational data architectures, AI pipelines, and semantic routing powering high-stakes enterprise logistics.

---

### The Problem
When a crisis occurs, the operational bottleneck is rarely a lack of resources, but rather a **Visibility Gap**. Analog communications, unstructured transcripts, and raw field notes create data silos, delaying critical triage and resource allocation by hours or days. 

### The Solution
Aegis Triage bridges this gap. By ingesting unstructured data streams, Aegis utilizes autonomous Generative AI to structure intelligence in real-time, instantly routing critical field needs to optimal on-the-ground resources via localized semantic vectorization.

### Technical Stack
* **Intelligence:** Google Gemini 3.0 Pro (Extraction) & Gemini Embeddings (Routing)
* **Frontend:** React + TypeScript + Tailwind CSS (True Black Aesthetic)
* **Backend:** Node.js + Express
* **Deployment:** Vercel Edge Network

### Key Features
* **Zero-Latency Ingestion:** Parse continuous, unstructured analog field reports and transcripts instantly.
* **Semantic Vector Mapping:** Map arbitrary supply and logistical requests to personnel skillsets via mathematical cosine similarity.
* **High-Contrast UI:** Distraction-free, terminal-grade True Black aesthetic optimized for low-bandwidth and high-stress environments.

### Architecture
```text
[ Raw Field Input ] 
        |
        v
[ Gemini Parsing Node (Structuring) ]
        |
        v
[ Semantic Vector Matching (Embeddings) ]
        |
        v
[ Dispatch / UI State ]
```

### Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   A valid Google GenAI API key is required to initialize the node. Create a `.env` file in the root directory:
   ```env
   GOOGLE_GENAI_API_KEY="your_api_key_here"
   GEMINI_API_KEY="your_api_key_here"
   ```

3. **Initialize Environment**
   ```bash
   npm run dev
   ```
