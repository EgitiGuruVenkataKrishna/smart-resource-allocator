import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
let apiKey = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY;
let ai: GoogleGenAI;
try {
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("API Key is not set or is using the default placeholder.");
  }
  ai = new GoogleGenAI({ apiKey });
} catch (e: any) {
  console.warn("⚠️ Warning: GoogleGenAI initialization failed. Did you configure your API key?");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// --- SCHEMAS ---
interface FieldReport {
  report_id: string;
  location: string;
  needs: string[];
  urgency: number; // 1-5
  raw_text: string;
}

interface VolunteerProfile {
  volunteer_id: string;
  name: string;
  skills: string[];
  region: string;
  capacity: number;
}

// --- STATE MANAGEMENT ---
const reportsDB = new Map<string, FieldReport>();

// Hardcoded array of VolunteerProfile (Indian context)
const volunteers: VolunteerProfile[] = [
  {
    volunteer_id: "v1",
    name: "Kiran",
    skills: ["first-aid", "driving", "logistics"],
    region: "Vijayawada",
    capacity: 5
  },
  {
    volunteer_id: "v2",
    name: "Sita",
    skills: ["translation", "childcare", "nursing"],
    region: "Guntur",
    capacity: 8
  },
  {
    volunteer_id: "v3",
    name: "Rahul",
    skills: ["manual-labor", "construction", "driving"],
    region: "Vijayawada",
    capacity: 10
  }
];

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- API ROUTES ---

// 1. Ingestion Endpoint
app.post("/api/reports", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API Key is missing or invalid. Please check your AI Studio secrets." });
  }

  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: "rawText is required" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract the field report data from the following text based on the required schema. Ensure urgency is an integer from 1 to 5.
      
      Text: "${rawText}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Structured extraction of a field report.",
          properties: {
            location: { type: Type.STRING, description: "The mentioned location or region." },
            needs: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Specific needs mentioned, e.g., 'medical supplies', 'translator'."
            },
            urgency: { type: Type.INTEGER, description: "Urgency level from 1 (lowest) to 5 (highest)." }
          },
          required: ["location", "needs", "urgency"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    const extractedData = JSON.parse(jsonStr);

    const report_id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    
    const fieldReport: FieldReport = {
      report_id,
      location: extractedData.location || "Unknown",
      needs: extractedData.needs || [],
      urgency: extractedData.urgency || 1,
      raw_text: rawText
    };

    reportsDB.set(report_id, fieldReport);
    res.json({ success: true, report: fieldReport });
  } catch (error: any) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: "Failed to process report." });
  }
});

// Get all reports (for dashboard)
app.get("/api/reports", (req, res) => {
  res.json(Array.from(reportsDB.values()));
});

// Get all volunteers (for dashboard)
app.get("/api/volunteers", (req, res) => {
  res.json(volunteers);
});

// 2. Matching Endpoint
app.get("/api/matches/:reportId", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API Key is missing or invalid. Please check your AI Studio secrets." });
  }

  const reportId = req.params.reportId;
  const report = reportsDB.get(reportId);

  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  try {
    // 1. Embed the report's needs
    const reportNeedsText = report.needs.join(", ");
    
    let reportEmbedding: number[] = [];
    if (reportNeedsText.trim()) {
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview", // Use the correct embedding model
        contents: reportNeedsText
      });
      reportEmbedding = embedResponse.embeddings?.[0]?.values || [];
    }

    // 2. Embed each volunteer's skills and compare
    // Note: In an optimized environment, volunteer embeddings would be pre-calculated and cached.
    const scoredVolunteers = await Promise.all(volunteers.map(async (vol) => {
      const volSkillsText = vol.skills.join(", ");
      let volEmbedding: number[] = [];
      let similarityScore = 0;

      if (reportEmbedding.length > 0 && volSkillsText.trim()) {
         const vEmbResponse = await ai.models.embedContent({
           model: "gemini-embedding-2-preview",
           contents: volSkillsText
         });
         volEmbedding = vEmbResponse.embeddings?.[0]?.values || [];
         
         if (volEmbedding.length > 0) {
            similarityScore = cosineSimilarity(reportEmbedding, volEmbedding);
         }
      }

      // Add a minor location bonus
      if (vol.region.toLowerCase().includes(report.location.toLowerCase()) || 
          report.location.toLowerCase().includes(vol.region.toLowerCase())) {
          similarityScore += 0.15;
      }

      return {
        volunteer: vol,
        score: similarityScore
      };
    }));

    // Sort by descending score
    scoredVolunteers.sort((a, b) => b.score - a.score);

    res.json(scoredVolunteers);
  } catch (error: any) {
    console.error("Match error:", error);
    res.status(500).json({ error: "Failed to generate matches." });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
