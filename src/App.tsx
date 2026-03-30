import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Search, 
  Users, 
  Cpu, 
  LayoutGrid, 
  ArrowRight, 
  RefreshCw, 
  Bookmark, 
  Filter, 
  Zap,
  ChevronRight,
  Lightbulb,
  Target,
  BarChart3,
  Dna,
  Layers,
  Download,
  AlertCircle,
  Wand2
} from "lucide-react";
import { cn } from "./lib/utils";
import { AI_CAPABILITIES } from "./constants";
import { UserContext, IdeaCard, IdeaGroup } from "./types";
import { 
  generateUserContexts, 
  generateIdeas, 
  clusterIdeas, 
  identifyCapabilitiesForProblem, 
  generateIdeasFromProblem,
  remixIdea,
  generateSingleIdea,
  generateSingleIdeaFromProblem
} from "./services/gemini";

export default function App() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"domain_first" | "problem_first">("domain_first");
  const [domain, setDomain] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [isGeneratingContexts, setIsGeneratingContexts] = useState(false);
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [ideaCount, setIdeaCount] = useState(10);
  const [isWild, setIsWild] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [groups, setGroups] = useState<IdeaGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [sortBy, setSortBy] = useState<"user_value" | "business_value" | "technical_feasibility">("user_value");
  const [remixingId, setRemixingId] = useState<string | null>(null);

  const handleGenerateContexts = async () => {
    if (!domain) return;
    setIsGeneratingContexts(true);
    try {
      const result = await generateUserContexts(domain);
      setContexts(result);
      setStep(2);
    } catch (error) {
      console.error("Failed to generate contexts", error);
    } finally {
      setIsGeneratingContexts(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIdeas([]);
    setGroups([]);
    setStep(3);
    setIsGeneratingIdeas(true);

    try {
      if (mode === "domain_first") {
        if (selectedContexts.length === 0 || selectedCapabilities.length === 0) return;
        
        const contextTypes = selectedContexts.map(id => contexts.find(c => c.id === id)?.type || "");
        const capabilityLabels = selectedCapabilities.map(id => AI_CAPABILITIES.find(c => c.id === id)?.label || "");

        // Run in parallel to show them as they complete
        const tasks = Array.from({ length: ideaCount }).map(async () => {
          const randomContext = contextTypes[Math.floor(Math.random() * contextTypes.length)];
          const randomCap = capabilityLabels[Math.floor(Math.random() * capabilityLabels.length)];
          try {
            const idea = await generateSingleIdea(domain, randomContext, randomCap, isWild);
            setIdeas(prev => [...prev, idea]);
          } catch (err) {
            console.error("Failed to generate a single idea", err);
          }
        });
        
        await Promise.all(tasks);
      } else {
        if (!problemStatement) return;
        const identifiedCaps = await identifyCapabilitiesForProblem(problemStatement, domain);
        const capabilityLabels = AI_CAPABILITIES.filter(c => identifiedCaps.includes(c.id)).map(c => c.label);

        const tasks = Array.from({ length: ideaCount }).map(async () => {
          const randomCap = capabilityLabels[Math.floor(Math.random() * capabilityLabels.length)];
          try {
            const idea = await generateSingleIdeaFromProblem(problemStatement, domain, randomCap, isWild);
            setIdeas(prev => [...prev, idea]);
          } catch (err) {
            console.error("Failed to generate a single idea from problem", err);
          }
        });

        await Promise.all(tasks);
      }
    } catch (error) {
      console.error("Failed to generate ideas", error);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const handleRemix = async (idea: IdeaCard, remixType: "make_more_feasible" | "make_more_innovative" | "make_more_user_centered") => {
    setRemixingId(idea.id);
    try {
      const remixed = await remixIdea(idea, remixType);
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...remixed, id: idea.id } : i));
    } catch (error) {
      console.error("Failed to remix idea", error);
    } finally {
      setRemixingId(null);
    }
  };

  const handleGroupIdeas = async () => {
    if (ideas.length === 0) return;
    setIsGrouping(true);
    try {
      const result = await clusterIdeas(ideas);
      setGroups(result);
    } catch (error) {
      console.error("Failed to group ideas", error);
    } finally {
      setIsGrouping(false);
    }
  };

  const toggleSave = (id: string) => {
    const next = new Set(savedIdeaIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedIdeaIds(next);
  };

  const exportToCSV = () => {
    const headers = ["Title", "Capability", "User", "Concept", "Why it Matters", "Why Capability Fits", "UI Hint", "User Value", "Business Value", "Technical Feasibility"];
    const rows = ideas.map(i => [
      i.title,
      i.capability,
      i.user,
      i.concept,
      i.why_it_matters,
      i.why_this_capability_fits,
      i.ui_hint || "",
      i.value_scores.user_value,
      i.value_scores.business_value,
      i.value_scores.technical_feasibility
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_matchmaker_${domain.toLowerCase().replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredIdeas = useMemo(() => {
    let result = filter === "saved" ? ideas.filter(i => savedIdeaIds.has(i.id)) : ideas;
    return [...result].sort((a, b) => (b.value_scores[sortBy] || 0) - (a.value_scores[sortBy] || 0));
  }, [ideas, savedIdeaIds, filter, sortBy]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-sm">
            <Dna className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase leading-none">AI Matchmaker Studio</h1>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Cognitive Scaffolding for AI Ideation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="text-xs font-mono uppercase border border-[#141414] px-3 py-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
            >
              Back
            </button>
          )}
          <div className="text-xs font-mono opacity-50">STEP 0{step} / 03</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-12 py-12"
            >
              <div className="space-y-4">
                <h2 className="text-6xl font-bold tracking-tighter leading-[0.9] uppercase italic font-serif">
                  Define the <br /> Problem Space
                </h2>
                <div className="flex gap-4 mt-8 p-1 bg-[#141414]/5 border border-[#141414]/10 rounded-sm max-w-xs">
                  <button
                    onClick={() => setMode("domain_first")}
                    className={cn(
                      "flex-1 py-1.5 px-3 font-bold text-[10px] uppercase transition-all rounded-sm",
                      mode === "domain_first" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/10"
                    )}
                  >
                    Domain-First
                  </button>
                  <button
                    onClick={() => setMode("problem_first")}
                    className={cn(
                      "flex-1 py-1.5 px-3 font-bold text-[10px] uppercase transition-all rounded-sm",
                      mode === "problem_first" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/10"
                    )}
                  >
                    Problem-First
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {mode === "domain_first" ? (
                  <div className="relative group">
                    <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Industry or Domain</label>
                    <input 
                      type="text" 
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g. Travel, Healthcare, Fintech..."
                      className="w-full bg-transparent border-b-2 border-[#141414] py-4 text-4xl font-bold focus:outline-none placeholder:opacity-20"
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateContexts()}
                    />
                    <div className="absolute right-0 bottom-4 opacity-0 group-focus-within:opacity-100 transition-opacity">
                      <kbd className="text-[10px] font-mono bg-[#141414] text-[#E4E3E0] px-2 py-1 rounded">ENTER</kbd>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative group">
                      <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Problem Statement</label>
                      <textarea 
                        value={problemStatement}
                        onChange={(e) => setProblemStatement(e.target.value)}
                        placeholder="Describe a specific pain point or challenge..."
                        className="w-full bg-transparent border-b-2 border-[#141414] py-4 text-2xl font-bold focus:outline-none placeholder:opacity-20 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="relative group">
                      <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Context/Domain (Optional)</label>
                      <input 
                        type="text" 
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="e.g. Smart Home, Education..."
                        className="w-full bg-transparent border-b-2 border-[#141414] py-2 text-xl font-bold focus:outline-none placeholder:opacity-20"
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={mode === "domain_first" ? handleGenerateContexts : handleGenerateIdeas}
                  disabled={(mode === "domain_first" ? !domain : !problemStatement) || isGeneratingContexts || isGeneratingIdeas}
                  className="w-full bg-[#141414] text-[#E4E3E0] py-6 flex items-center justify-center gap-3 text-xl font-bold uppercase tracking-tighter hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGeneratingContexts || isGeneratingIdeas ? (
                    <>
                      <RefreshCw className="animate-spin w-6 h-6" />
                      {mode === "domain_first" ? "Analyzing Domain..." : "Generating Solutions..."}
                    </>
                  ) : (
                    <>
                      {mode === "domain_first" ? "Generate Contexts" : "Generate Solutions"}
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-12 border-t border-[#141414]/10">
                {[
                  { icon: Target, label: "Identify Personas" },
                  { icon: BarChart3, label: "Map JTBD" },
                  { icon: Zap, label: "Find Opportunities" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    <item.icon className="w-5 h-5 opacity-40" />
                    <span className="text-[10px] font-mono uppercase tracking-wider opacity-50">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-50">
                    <Search className="w-3 h-3" />
                    Domain: {domain}
                  </div>
                  <h2 className="text-5xl font-bold tracking-tighter uppercase leading-none">Matchmaking Setup</h2>
                </div>
                
                <div className="flex items-center gap-8 border-l border-[#141414]/20 pl-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase opacity-50 block">Idea Count</label>
                    <select 
                      value={ideaCount}
                      onChange={(e) => setIdeaCount(Number(e.target.value))}
                      className="bg-transparent font-bold border-b border-[#141414] focus:outline-none"
                    >
                      <option value={10}>10 Ideas</option>
                      <option value={25}>25 Ideas</option>
                      <option value={50}>50 Ideas</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-mono uppercase opacity-50">Wild Ideas</label>
                    <button 
                      onClick={() => setIsWild(!isWild)}
                      className={cn(
                        "w-12 h-6 rounded-full border border-[#141414] relative transition-colors",
                        isWild ? "bg-[#141414]" : "bg-transparent"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full transition-all",
                        isWild ? "right-1 bg-[#E4E3E0]" : "left-1 bg-[#141414]"
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                {/* User Contexts */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      01. Select User Contexts
                    </h3>
                    <button 
                      onClick={() => setSelectedContexts(contexts.map(c => c.id))}
                      className="text-[10px] uppercase underline opacity-50 hover:opacity-100"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {contexts.map((ctx) => (
                      <button
                        key={ctx.id}
                        onClick={() => {
                          setSelectedContexts(prev => 
                            prev.includes(ctx.id) ? prev.filter(id => id !== ctx.id) : [...prev, ctx.id]
                          );
                        }}
                        className={cn(
                          "text-left p-4 border transition-all group relative overflow-hidden",
                          selectedContexts.includes(ctx.id) 
                            ? "bg-[#141414] border-[#141414] text-[#E4E3E0]" 
                            : "bg-white/50 border-[#141414]/20 hover:border-[#141414]"
                        )}
                      >
                        <div className="relative z-10">
                          <div className="font-bold uppercase tracking-tight text-lg">{ctx.type}</div>
                          <div className="text-xs opacity-70 mt-1">{ctx.description}</div>
                        </div>
                        {selectedContexts.includes(ctx.id) && (
                          <motion.div 
                            layoutId="check-ctx"
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* AI Capabilities */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      02. Select AI Capabilities
                    </h3>
                    <button 
                      onClick={() => setSelectedCapabilities(AI_CAPABILITIES.map(c => c.id))}
                      className="text-[10px] uppercase underline opacity-50 hover:opacity-100"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {AI_CAPABILITIES.map((cap) => (
                      <button
                        key={cap.id}
                        onClick={() => {
                          setSelectedCapabilities(prev => 
                            prev.includes(cap.id) ? prev.filter(id => id !== cap.id) : [...prev, cap.id]
                          );
                        }}
                        className={cn(
                          "text-left p-4 border transition-all relative overflow-hidden",
                          selectedCapabilities.includes(cap.id) 
                            ? "bg-[#141414] border-[#141414] text-[#E4E3E0]" 
                            : "bg-white/50 border-[#141414]/20 hover:border-[#141414]"
                        )}
                      >
                        <div className="font-bold uppercase tracking-tighter text-sm leading-tight">{cap.label}</div>
                        <div className="text-[9px] opacity-60 mt-1 leading-tight">{cap.description}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="pt-12 border-t border-[#141414]">
                <button 
                  onClick={handleGenerateIdeas}
                  disabled={selectedContexts.length === 0 || selectedCapabilities.length === 0 || isGeneratingIdeas}
                  className="w-full bg-[#141414] text-[#E4E3E0] py-8 flex items-center justify-center gap-4 text-3xl font-bold uppercase tracking-tighter hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl"
                >
                  {isGeneratingIdeas ? (
                    <>
                      <RefreshCw className="animate-spin w-8 h-8" />
                      Matchmaking in progress...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8" />
                      Generate {ideaCount} Concepts
                    </>
                  )}
                </button>
                <p className="text-center mt-4 text-[10px] font-mono uppercase opacity-40">
                  {selectedContexts.length} Contexts × {selectedCapabilities.length} Capabilities = Divergent Space
                </p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/80 backdrop-blur-md p-4 border border-[#141414] sticky top-24 z-40">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-tight">{ideas.length} Concepts</span>
                  </div>
                  <div className="h-4 w-px bg-[#141414]/20" />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setFilter("all")}
                      className={cn("text-xs uppercase font-bold", filter === "all" ? "underline" : "opacity-40")}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFilter("saved")}
                      className={cn("text-xs uppercase font-bold flex items-center gap-1", filter === "saved" ? "underline" : "opacity-40")}
                    >
                      Saved ({savedIdeaIds.size})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 opacity-50" />
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-xs font-bold bg-transparent border-none focus:outline-none uppercase"
                    >
                      <option value="user_value">User Value</option>
                      <option value="business_value">Business Value</option>
                      <option value="technical_feasibility">Feasibility</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleGroupIdeas}
                    disabled={isGrouping}
                    className="bg-[#141414] text-[#E4E3E0] px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-[#2a2a2a] disabled:opacity-50"
                  >
                    {isGrouping ? <RefreshCw className="animate-spin w-3 h-3" /> : <Layers className="w-3 h-3" />}
                    {groups.length > 0 ? "Regroup Ideas" : "Group Ideas"}
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="border border-[#141414] px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Grouped View */}
              {groups.length > 0 && filter === "all" && (
                <div className="space-y-12">
                  {groups.map((group) => {
                    const groupIdeas = ideas.filter(i => group.ideaIds.includes(i.id));
                    if (groupIdeas.length === 0) return null;
                    return (
                      <section key={group.id} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl font-bold uppercase tracking-tighter bg-[#141414] text-[#E4E3E0] px-3 py-1">
                            {group.name}
                          </h3>
                          <div className="h-px flex-1 bg-[#141414]/10" />
                          <span className="text-xs font-mono opacity-40">{groupIdeas.length} IDEAS</span>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {groupIdeas.map((idea) => (
                            <IdeaCardComponent 
                              key={idea.id} 
                              idea={idea} 
                              isSaved={savedIdeaIds.has(idea.id)}
                              onSave={() => toggleSave(idea.id)}
                              onRemix={(type) => handleRemix(idea, type)}
                              isRemixing={remixingId === idea.id}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {/* Standard Grid View */}
              {(groups.length === 0 || filter === "saved") && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredIdeas.map((idea) => (
                    <IdeaCardComponent 
                      key={idea.id} 
                      idea={idea} 
                      isSaved={savedIdeaIds.has(idea.id)}
                      onSave={() => toggleSave(idea.id)}
                      onRemix={(type) => handleRemix(idea, type)}
                      isRemixing={remixingId === idea.id}
                    />
                  ))}
                  {isGeneratingIdeas && Array.from({ length: Math.max(0, ideaCount - ideas.length) }).map((_, i) => (
                    <SkeletonCard key={`skeleton-${i}`} />
                  ))}
                </div>
              )}

              {filteredIdeas.length === 0 && (
                <div className="py-24 text-center space-y-4">
                  <Lightbulb className="w-12 h-12 mx-auto opacity-10" />
                  <p className="text-xl font-bold uppercase opacity-30 tracking-tighter">No ideas found in this view</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="mt-24 border-t border-[#141414] p-12 bg-white/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2">
              <Dna className="w-5 h-5" />
              <span className="font-bold uppercase tracking-tighter">AI Matchmaker Studio</span>
            </div>
            <p className="text-xs opacity-60 leading-relaxed">
              A tool for externalizing expert mental models, structuring divergence, and enabling non-experts to think like AI-native designers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono uppercase opacity-40">Framework</h4>
              <ul className="text-xs font-bold uppercase space-y-1">
                <li>Capability + Context</li>
                <li>Matchmaking</li>
                <li>Divergent Thinking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono uppercase opacity-40">Built For</h4>
              <ul className="text-xs font-bold uppercase space-y-1">
                <li>Product Designers</li>
                <li>UX Researchers</li>
                <li>HCI Students</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-12 border-t border-[#141414]/10 text-[10px] font-mono uppercase opacity-30 flex justify-between">
          <span>CMU-Level Cognitive Scaffolding</span>
          <span>© 2026 AI Matchmaker Studio</span>
        </div>
      </footer>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white/50 border border-[#141414]/20 flex flex-col h-[400px] animate-pulse">
      <div className="p-4 border-b border-[#141414]/10 flex justify-between items-start">
        <div className="space-y-2 w-full">
          <div className="h-2 bg-[#141414]/10 w-1/4" />
          <div className="h-6 bg-[#141414]/10 w-3/4" />
        </div>
      </div>
      <div className="p-4 flex-1 space-y-4">
        <div className="space-y-2">
          <div className="h-2 bg-[#141414]/10 w-1/3" />
          <div className="h-12 bg-[#141414]/10 w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-[#141414]/10 w-1/4" />
          <div className="h-8 bg-[#141414]/10 w-full" />
        </div>
      </div>
      <div className="p-4 border-t border-[#141414]/10 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 bg-[#141414]/10 w-1/2" />
            <div className="h-1 bg-[#141414]/10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeaCardComponent({ 
  idea, 
  isSaved, 
  onSave, 
  onRemix, 
  isRemixing 
}: { 
  idea: IdeaCard, 
  isSaved: boolean, 
  onSave: () => void,
  onRemix: (type: "make_more_feasible" | "make_more_innovative" | "make_more_user_centered") => void,
  isRemixing: boolean
}) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-[#141414] flex flex-col group hover:shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] transition-all relative"
    >
      {isRemixing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-[10px] font-mono uppercase font-bold">Remixing...</span>
          </div>
        </div>
      )}
      <div className="p-4 border-b border-[#141414] flex justify-between items-start">
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase opacity-50 flex items-center gap-1">
            <Cpu className="w-2 h-2" />
            {idea.capability}
          </div>
          <h3 className="text-lg font-bold uppercase tracking-tighter leading-tight">{idea.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group/remix">
            <button className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors">
              <Wand2 className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] opacity-0 invisible group-hover/remix:opacity-100 group-hover/remix:visible transition-all z-20 w-48">
              {[
                { id: "make_more_feasible", label: "Make More Feasible" },
                { id: "make_more_innovative", label: "Make More Innovative" },
                { id: "make_more_user_centered", label: "Make More User-Centered" }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onRemix(type.id as any)}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono uppercase font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={onSave}
            className={cn(
              "p-2 border border-[#141414] transition-colors",
              isSaved ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414] hover:text-[#E4E3E0]"
            )}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-4">
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase opacity-50 flex items-center gap-1">
            <Users className="w-2 h-2" />
            For: {idea.user}
          </div>
          <p className="text-sm leading-snug">{idea.concept}</p>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-[9px] font-mono uppercase opacity-50">Why it matters</div>
            <p className="text-xs italic opacity-70">{idea.why_it_matters}</p>
          </div>
          
          <div className="space-y-1 bg-[#141414]/5 p-2 border-l-2 border-[#141414]">
            <div className="text-[9px] font-mono uppercase opacity-50 flex items-center gap-1">
              <AlertCircle className="w-2 h-2" />
              Capability Reasoning
            </div>
            <p className="text-[10px] leading-tight opacity-80">{idea.why_this_capability_fits}</p>
          </div>
        </div>

        {idea.ui_hint && (
          <div className="bg-[#E4E3E0]/50 p-2 border border-[#141414]/10">
            <div className="text-[8px] font-mono uppercase opacity-50 mb-1">UI Suggestion</div>
            <p className="text-[10px] leading-tight">{idea.ui_hint}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#141414] grid grid-cols-3 gap-2">
        {[
          { label: "User", val: idea.value_scores.user_value },
          { label: "Biz", val: idea.value_scores.business_value },
          { label: "Feas.", val: idea.value_scores.technical_feasibility }
        ].map((s, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-[8px] font-mono uppercase opacity-40">{s.label}</div>
              <div className="text-[8px] font-mono font-bold">{s.val}/5</div>
            </div>
            <div className="h-1 bg-[#141414]/10 relative overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(s.val || 0) * 20}%` }}
                className="absolute inset-y-0 left-0 bg-[#141414]"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
