import React, { useState } from 'react';
import { Network, Activity, FileText, Search, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FieldReport {
  report_id: string;
  location: string;
  required_vectors: string[];
  urgency_level: number; // 1-5
  raw_text: string;
}

interface VolunteerProfile {
  volunteer_id: string;
  name: string;
  required_vectors: string[];
  region: string;
  capacity: number;
}

interface MatchResult {
  volunteer: VolunteerProfile;
  score: number;
}

export default function App() {
  const [report, setReport] = useState<FieldReport | null>(null);

  const resetState = () => {
    setReport(null);
  }

  return (
    <div className="min-h-screen bg-black text-[#FAF9F6] font-mono selection:bg-[#FAF9F6] selection:text-black flex flex-col">
      <header className="border-b border-[#FAF9F6]/20 py-4 px-6 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none border border-[#FAF9F6] text-[#FAF9F6] flex items-center justify-center">
              <Network size={16} />
            </div>
            <span className="font-mono text-sm tracking-widest uppercase">AEGIS_TRIAGE_</span>
          </div>
          {report && (
            <button 
              onClick={resetState}
              className="text-xs font-mono uppercase tracking-widest border-b border-[#FAF9F6]/30 hover:border-[#FAF9F6] transition-colors pb-0.5"
            >
              New Intake
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {!report ? (
            <motion.div 
              key="intake"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Intake onReportCreated={setReport} />
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard report={report} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-[#FAF9F6]/20 py-6 text-center text-[#FAF9F6]/40 font-mono text-xs uppercase tracking-widest">
        Architected by BaseLayer AI | Powered by Google GenAI
      </footer>
    </div>
  );
}

function Intake({ onReportCreated }: { onReportCreated: (r: FieldReport) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text })
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "API Request Failed");
      }
      
      if (data.success && data.report) {
         onReportCreated(data.report);
      } else {
         throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error(err);
      setError("[ERR_NETWORK] Connection to Google GenAI failed. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-wide mb-2 uppercase">Data Ingestion</h1>
        <p className="text-[#FAF9F6]/60 text-sm font-mono tracking-wide max-w-xl">
          Enter raw field notes or unstructured transcripts to digitize and extract critical logistics requirements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border border-[#FAF9F6]/30 group focus-within:border-[#FAF9F6] transition-colors relative">
          <div className="absolute top-0 left-0 bg-[#FAF9F6] text-black text-[10px] uppercase font-mono px-2 py-0.5 font-bold tracking-widest">
            RAW_INPUT_BUFFER
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder=">_ WAITING FOR FIELD INTEL..."
            className="w-full bg-transparent text-[#FAF9F6] p-6 pt-8 font-mono resize-none h-64 focus:outline-none placeholder:text-[#FAF9F6]/40 text-lg font-light leading-relaxed disabled:opacity-50"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <div className="border border-[#FAF9F6]/30 p-4 flex items-center gap-3 bg-[#FAF9F6]/5">
            <AlertTriangle size={18} className="text-[#FAF9F6]" />
            <span className="font-mono text-xs">{error}</span>
            <button 
              type="button" 
              onClick={() => setError(null)}
              className="ml-auto text-xs font-mono uppercase border-b border-[#FAF9F6]/30 hover:border-[#FAF9F6] pb-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full border border-[#FAF9F6] py-4 uppercase font-mono tracking-widest text-[#FAF9F6] hover:bg-[#FAF9F6] hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
        >
          {loading ? (
             <>
               <Loader2 size={16} className="animate-spin" />
               Processing
             </>
          ) : (
             <>
               Execute Extraction <Activity size={16} className="group-hover/btn:animate-pulse" />
             </>
          )}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ report }: { report: FieldReport }) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${report.report_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match API Failed");
      setMatches(data);
    } catch (err: any) {
      console.error(err);
      setError("[ERR_NETWORK] Connection to Google GenAI failed. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMatches();
  }, [report.report_id]);

  return (
    <div className="space-y-12">
      {/* Target Brief */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-6 border-b border-[#FAF9F6]/20 pb-3">
          <FileText size={18} />
          <h2 className="uppercase font-mono tracking-widest text-sm">Active Need Profile</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[#FAF9F6]/30 p-5 relative pt-7">
            <div className="absolute top-0 left-0 bg-[#FAF9F6]/20 text-[#FAF9F6] text-[10px] uppercase font-mono px-2 py-0.5 tracking-widest">
              REPORT_ID
            </div>
            <div className="font-mono text-[#FAF9F6]/80 truncate">{report.report_id}</div>
          </div>
          
          <div className="border border-[#FAF9F6]/30 p-5 relative pt-7">
            <div className="absolute top-0 left-0 bg-[#FAF9F6]/20 text-[#FAF9F6] text-[10px] uppercase font-mono px-2 py-0.5 tracking-widest">
              LOCATION_SECTOR
            </div>
            <div className="font-sans text-xl font-light">{report.location}</div>
          </div>
          
          <div className="border border-[#FAF9F6]/30 p-5 relative pt-7 md:col-span-2">
            <div className="absolute top-0 left-0 bg-[#FAF9F6]/20 text-[#FAF9F6] text-[10px] uppercase font-mono px-2 py-0.5 tracking-widest">
              REQUIRED_VECTORS
            </div>
            <div className="flex gap-2 flex-wrap">
              {report.required_vectors.length === 0 && <span className="font-mono text-sm text-[#FAF9F6]/50">NO_VECTORS_DETECTED</span>}
              {report.required_vectors.map((need, idx) => (
                <div key={idx} className="border border-[#FAF9F6]/50 px-3 py-1 font-mono text-sm uppercase">
                  {need}
                </div>
              ))}
            </div>
          </div>
          
           <div className="border border-[#FAF9F6]/30 p-5 relative pt-7 md:col-span-2">
            <div className="absolute top-0 left-0 bg-[#FAF9F6]/20 text-[#FAF9F6] text-[10px] uppercase font-mono px-2 py-0.5 tracking-widest">
              URGENCY_LEVEL
            </div>
            <div className="flex gap-1">
               {[1,2,3,4,5].map(level => (
                 <div key={level} className={`h-8 flex-1 border border-[#FAF9F6] ${level <= report.urgency_level ? 'bg-[#FAF9F6]' : 'bg-transparent'}`} />
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roster / Matching */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-6 border-b border-[#FAF9F6]/20 pb-3">
          <div className="flex items-center gap-3">
            <Search size={18} />
            <h2 className="uppercase font-mono tracking-widest text-sm">Routing Engine Results</h2>
          </div>
          {loading && <Loader2 size={16} className="animate-spin text-[#FAF9F6]/50" />}
        </div>
        
        {error ? (
          <div className="border border-[#FAF9F6]/30 p-6 flex flex-col items-center justify-center text-center gap-4 bg-[#FAF9F6]/5">
            <AlertTriangle size={24} className="text-[#FAF9F6]/50" />
            <p className="font-mono text-sm uppercase">{error}</p>
            <button 
              onClick={fetchMatches}
              className="border border-[#FAF9F6] px-4 py-2 uppercase font-mono tracking-widest text-xs hover:bg-[#FAF9F6] hover:text-black transition-colors flex items-center gap-2"
            >
              <RefreshCcw size={14} /> Retry Query
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {matches.map((match, idx) => (
              <div 
                key={match.volunteer.volunteer_id} 
                className="border border-[#FAF9F6]/30 p-5 hover:border-[#FAF9F6] transition-colors relative flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="absolute top-0 left-0 bg-[#FAF9F6]/10 text-[#FAF9F6] text-[10px] uppercase font-mono px-2 py-0.5 tracking-widest">
                  RANK: 0{idx + 1}
                </div>
                
                <div className="mt-3 md:mt-0 flex-1">
                  <h3 className="font-light text-2xl mb-1">{match.volunteer.name}</h3>
                  <div className="font-mono text-xs uppercase text-[#FAF9F6]/60 flex items-center gap-3">
                    <span>ID: {match.volunteer.volunteer_id}</span>
                    <span>•</span>
                    <span>{match.volunteer.region}</span>
                    <span>•</span>
                    <span>CAPACITY: {match.volunteer.capacity}</span>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-3 md:w-1/2">
                   <div className="flex gap-2 flex-wrap">
                    {match.volunteer.required_vectors.map((skill, si) => (
                      <span key={si} className="border border-[#FAF9F6]/20 px-2 py-0.5 text-[10px] uppercase font-mono text-[#FAF9F6]/80 rounded-none">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="font-mono text-xs text-[#FAF9F6]/60 border-t border-[#FAF9F6]/20 w-full pt-2 flex justify-between items-center md:hidden mt-2">
                     <span>Similarity Score</span>
                     <span>{(match.score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-[#FAF9F6]/40">
                    SIM_SCORE: {(match.score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
            
            {!loading && matches.length === 0 && (
              <div className="text-center p-12 border border-[#FAF9F6]/20 font-mono text-sm uppercase text-[#FAF9F6]/40">
                0 MATCHES_FOUND
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

