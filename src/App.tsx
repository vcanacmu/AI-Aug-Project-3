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
  Wand2,
  Globe,
  Truck,
  Stethoscope,
  GraduationCap,
  Building2,
  Plane,
  Wallet,
  Info,
  Zap as EnergyIcon
} from "lucide-react";
import { cn } from "./lib/utils";
import { AI_CAPABILITIES } from "./constants";
import { UserContext, IdeaCard, IdeaGroup, UserContextStepResponse, ProblemDefinitionStepResponse, CapabilitiesStepResponse, AICapability, UserProblem } from "./types";
import { 
  generateUserContextStep, 
  generateProblemDefinitionStep,
  generateCapabilitiesStep,
  validateCustomCapability,
  generateIdeas, 
  clusterIdeas, 
  identifyCapabilitiesForProblem, 
  generateIdeasFromProblem,
  remixIdea,
  generateSingleIdea,
  generateSingleIdeaFromProblem
} from "./services/gemini";

const INDUSTRIES = [
  { name: "Commercial Aviation", tam: "$800B+", desc: "Aerospace, maintenance, and flight operations.", icon: Plane },
  { name: "Healthcare", tam: "$4T+", desc: "Diagnostics, patient care, and drug discovery.", icon: Stethoscope },
  { name: "Logistics", tam: "$10T+", desc: "Supply chain, last-mile delivery, and warehousing.", icon: Truck },
  { name: "Education", tam: "$7T+", desc: "Personalized learning and academic administration.", icon: GraduationCap },
  { name: "Real Estate", tam: "$300T+", desc: "Property management, valuation, and construction.", icon: Building2 },
  { name: "Travel", tam: "$9T+", desc: "Hospitality, booking, and destination experiences.", icon: Globe },
  { name: "Fintech", tam: "$25T+", desc: "Banking, payments, and decentralized finance.", icon: Wallet },
  { name: "Energy", tam: "$10T+", desc: "Renewables, grid management, and storage.", icon: EnergyIcon },
];

export default function App() {
  const [step, setStep] = useState(0); // Start at Step 0 (Hero)
  const [mode, setMode] = useState<"domain_first" | "problem_first">("domain_first");
  const [domain, setDomain] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [isGeneratingContexts, setIsGeneratingContexts] = useState(false);
  const [contextStepData, setContextStepData] = useState<UserContextStepResponse | null>(null);
  const [problemStepData, setProblemStepData] = useState<ProblemDefinitionStepResponse | null>(null);
  const [capabilitiesStepData, setCapabilitiesStepData] = useState<CapabilitiesStepResponse | null>(null);
  const [isGeneratingProblems, setIsGeneratingProblems] = useState(false);
  const [isGeneratingCapabilities, setIsGeneratingCapabilities] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
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
  const [expandedContextId, setExpandedContextId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customCapabilityError, setCustomCapabilityError] = useState<string | null>(null);
  const [customCapabilitySuggestions, setCustomCapabilitySuggestions] = useState<AICapability[]>([]);

  const handleGenerateContexts = async (selectedDomain?: string) => {
    const domainToUse = selectedDomain || domain;
    if (!domainToUse) return;
    setIsGeneratingContexts(true);
    try {
      const result = await generateUserContextStep(domainToUse);
      setContextStepData(result);
      setStep(2);
    } catch (error) {
      console.error("Failed to generate contexts", error);
    } finally {
      setIsGeneratingContexts(false);
    }
  };

  const handleGoToProblems = async () => {
    if (!selectedContextId || !contextStepData) return;
    
    // Find the selected user label
    const allUsers = contextStepData.user_context_groups.flatMap(g => g.users);
    const selectedUser = allUsers.find(u => u.id === selectedContextId);
    const userLabel = selectedUser ? selectedUser.label : selectedContextId.replace('custom-', '');

    setIsGeneratingProblems(true);
    try {
      const result = await generateProblemDefinitionStep(domain, userLabel, mode === "problem_first" ? problemStatement : undefined);
      setProblemStepData(result);
      setStep(3);
    } catch (error) {
      console.error("Failed to generate problems", error);
    } finally {
      setIsGeneratingProblems(false);
    }
  };

  const handleGoToCapabilities = async () => {
    if (!selectedContextId || !selectedProblemId || !problemStepData) return;
    
    // Find the selected user label
    const allUsers = contextStepData?.user_context_groups.flatMap(g => g.users) || [];
    const selectedUser = allUsers.find(u => u.id === selectedContextId);
    const userLabel = selectedUser ? selectedUser.label : selectedContextId.replace('custom-', '');

    // Find the selected problem label
    const selectedProblem = problemStepData.problems.find(p => p.id === selectedProblemId);
    const problemLabel = selectedProblem ? selectedProblem.problem_statement : selectedProblemId.replace('custom-prob-', '');

    setIsGeneratingCapabilities(true);
    try {
      const result = await generateCapabilitiesStep(domain, userLabel, problemLabel);
      setCapabilitiesStepData(result);
      setStep(4);
    } catch (error) {
      console.error("Failed to generate capabilities", error);
    } finally {
      setIsGeneratingCapabilities(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIdeas([]);
    setGroups([]);
    setStep(5);
    setIsGeneratingIdeas(true);

    try {
      if (mode === "domain_first") {
        if (!selectedContextId || !selectedProblemId || selectedCapabilities.length === 0 || !contextStepData) return;
        
        const allUsers = contextStepData.user_context_groups.flatMap(g => g.users);
        const selectedUserLabel = allUsers.find(u => u.id === selectedContextId)?.label || selectedContextId.replace('custom-', '');
        
        const selectedProblem = problemStepData?.problems.find(p => p.id === selectedProblemId);
        const problemLabel = selectedProblem ? selectedProblem.problem_statement : selectedProblemId.replace('custom-prob-', '');

        const capabilityLabels = selectedCapabilities.map(id => {
          const found = capabilitiesStepData?.capability_categories.flatMap(cat => cat.capabilities).find(c => c.id === id);
          return found ? found.label : id.replace('custom-cap-', '');
        });

        // Run in parallel to show them as they complete
        const tasks = Array.from({ length: ideaCount }).map(async () => {
          const randomCap = capabilityLabels[Math.floor(Math.random() * capabilityLabels.length)];
          try {
            // We use generateSingleIdea but maybe we should pass the problem too?
            // The prompt for generateSingleIdea doesn't take problem currently.
            // Let's use generateSingleIdeaFromProblem but it identifies user context itself.
            // Actually, let's just use generateSingleIdea and pass the problem in the domain or userType string if needed, 
            // OR update the service. For now, let's just use the existing generateSingleIdea.
            const idea = await generateSingleIdea(domain, `${selectedUserLabel} facing the problem: ${problemLabel}`, randomCap, isWild);
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
      {step >= 1 && (
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
            {step < 5 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="text-xs font-mono uppercase border border-[#141414] px-3 py-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
              >
                Back
              </button>
            )}
            {step <= 4 ? (
              <div className="text-xs font-mono opacity-50">STEP 0{step} / 04</div>
            ) : (
              <div className="text-xs font-mono font-bold uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-2 py-1">Ideation Studio</div>
            )}
          </div>
        </header>
      )}

      <main className={cn(step >= 1 ? "max-w-7xl mx-auto p-6 md:p-12" : "")}>
        <AnimatePresence mode="wait">
          {/* Step 0: Hero Intro */}
          {step === 0 && (
            <motion.div 
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#E4E3E0] text-[#141414]"
            >
              <div className="max-w-3xl w-full space-y-12 text-center">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 border border-[#141414] rounded-full text-[10px] font-mono uppercase font-bold tracking-widest"
                  >
                    <Sparkles className="w-3 h-3" />
                    Opportunity Discovery Engine
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-6xl md:text-8xl font-serif italic tracking-tighter leading-[0.9]"
                  >
                    Architect the next generation of value.
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl md:text-2xl font-sans opacity-70 max-w-2xl mx-auto leading-relaxed"
                  >
                    AI Matchmaker Studio maps frontier capabilities to high-stakes problem spaces. Stop guessing. Start building.
                  </motion.p>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="grid md:grid-cols-3 gap-8 text-left border-t border-[#141414]/10 pt-12"
                >
                  {[
                    { title: "Divergent Ideation", desc: "Move beyond obvious chat-wrappers and generic wrappers." },
                    { title: "Market-First Logic", desc: "Start with high-TAM industries where value already exists." },
                    { title: "Capability Reasoning", desc: "Understand exactly why a technology fits a context." }
                  ].map((prop, i) => (
                    <div key={i} className="space-y-2">
                      <div className="text-xs font-mono uppercase font-bold opacity-40">0{i+1}</div>
                      <h3 className="font-bold uppercase tracking-tight">{prop.title}</h3>
                      <p className="text-sm opacity-60 leading-snug">{prop.desc}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="group relative inline-flex items-center gap-4 bg-[#141414] text-[#E4E3E0] px-12 py-6 text-xl font-bold uppercase tracking-tighter hover:bg-[#141414]/90 transition-all shadow-[8px_8px_0px_0px_rgba(20,20,20,0.2)]"
                >
                  Identify Opportunities
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Problem Space Selection */}
          {step === 1 && (
            <motion.div 
              key="problem-space"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-5xl font-serif italic tracking-tighter">Where will you build?</h2>
                    <p className="text-lg opacity-60">Start with a space where value already exists, or explore something new.</p>
                  </div>
                  
                  <div className="flex gap-2 p-1 border border-[#141414] bg-white/50 backdrop-blur-sm">
                    <button 
                      onClick={() => setMode("domain_first")}
                      className={cn(
                        "px-4 py-2 text-[10px] font-mono uppercase font-bold transition-all",
                        mode === "domain_first" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                      )}
                    >
                      Industry-First
                    </button>
                    <button 
                      onClick={() => setMode("problem_first")}
                      className={cn(
                        "px-4 py-2 text-[10px] font-mono uppercase font-bold transition-all",
                        mode === "problem_first" ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                      )}
                    >
                      Problem-First
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 opacity-30 group-focus-within:opacity-100 transition-opacity" />
                    <input 
                      type="text"
                      value={mode === "domain_first" ? domain : problemStatement}
                      onChange={(e) => mode === "domain_first" ? setDomain(e.target.value) : setProblemStatement(e.target.value)}
                      placeholder={mode === "domain_first" ? "Enter an industry, domain, or problem space..." : "Describe a specific problem you've observed..."}
                      className="w-full bg-white border-2 border-[#141414] px-16 py-8 text-2xl font-sans focus:outline-none focus:ring-4 ring-[#141414]/5 transition-all placeholder:opacity-30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (mode === "domain_first") handleGenerateContexts();
                          else setStep(2);
                        }
                      }}
                    />
                    <button 
                      onClick={() => mode === "domain_first" ? handleGenerateContexts() : setStep(2)}
                      disabled={isGeneratingContexts || (mode === "domain_first" ? !domain : !problemStatement)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#141414] text-[#E4E3E0] px-6 py-3 font-bold uppercase tracking-tighter disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGeneratingContexts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Continue
                    </button>
                  </div>

                  {mode === "domain_first" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {INDUSTRIES.map((industry) => (
                        <motion.button
                          key={industry.name}
                          whileHover={{ y: -4 }}
                          onClick={() => {
                            setDomain(industry.name);
                            handleGenerateContexts(industry.name);
                          }}
                          className="group text-left bg-white border border-[#141414]/10 p-6 space-y-4 hover:border-[#141414] hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="p-2 border border-[#141414]/10 group-hover:border-[#141414] transition-colors">
                              <industry.icon className="w-5 h-5" />
                            </div>
                            <div className="text-[10px] font-mono font-bold text-[#141414]/40 group-hover:text-[#141414] transition-colors">
                              {industry.tam}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-bold uppercase tracking-tight">{industry.name}</h3>
                            <p className="text-[10px] opacity-50 leading-tight">{industry.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
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
                  <h2 className="text-5xl font-bold tracking-tighter uppercase leading-none">Target User</h2>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                {/* User Contexts */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      01. Select Target User
                    </h3>
                  </div>
                  <div className="space-y-10">
                    {contextStepData?.user_context_groups.map((group) => (
                      <div key={group.category} className="space-y-4">
                        <div className="flex flex-col">
                          <h4 className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#141414]/60">{group.category}</h4>
                        </div>
                        <div className="grid gap-2">
                          {group.users.map((ctx) => (
                            <div key={ctx.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedContextId(ctx.id === selectedContextId ? null : ctx.id);
                                }}
                                className={cn(
                                  "w-full text-left p-3 border transition-all group relative overflow-hidden",
                                  selectedContextId === ctx.id 
                                    ? "bg-[#141414] border-[#141414] text-[#E4E3E0]" 
                                    : "bg-white/50 border-[#141414]/20 hover:border-[#141414]"
                                )}
                              >
                                <div className="relative z-10 flex justify-between items-start">
                                  <div className="space-y-0.5 pr-8">
                                    <div className="font-bold uppercase tracking-tight text-sm">{ctx.label}</div>
                                    <div className="text-[10px] opacity-70 leading-tight">{ctx.description}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className={cn(
                                      "text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-full border",
                                      ctx.opportunity_signal === "high" 
                                        ? "bg-green-500/10 border-green-500/50 text-green-600" 
                                        : ctx.opportunity_signal === "medium"
                                          ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-600"
                                          : "bg-red-500/10 border-red-500/50 text-red-600"
                                    )}>
                                      {ctx.opportunity_signal}
                                    </div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedContextId(expandedContextId === ctx.id ? null : ctx.id);
                                      }}
                                      className="p-1 hover:bg-[#141414]/10 rounded-full transition-colors"
                                    >
                                      <Info className={cn("w-3 h-3 transition-colors", selectedContextId === ctx.id ? "text-[#E4E3E0]/50 hover:text-[#E4E3E0]" : "text-[#141414]/30 hover:text-[#141414]")} />
                                    </button>
                                  </div>
                                </div>
                                {selectedContextId === ctx.id && (
                                  <ChevronRight className="absolute right-3 bottom-3 w-4 h-4 opacity-20" />
                                )}
                              </button>
                              
                              <AnimatePresence>
                                {expandedContextId === ctx.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-[#141414]/5 border-l-2 border-[#141414] p-3 text-[10px] italic opacity-80 leading-relaxed">
                                      <span className="font-bold uppercase not-italic mr-2">Signal:</span>
                                      {ctx.opportunity_reason}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Custom Input */}
                    <div className="pt-6 border-t border-[#141414]/10 space-y-3">
                      <label className="text-[10px] font-mono uppercase font-bold opacity-50 block">
                        Add your own user
                      </label>
                      <div className="relative group">
                        <input 
                          type="text"
                          placeholder="e.g. freelance travel photographer"
                          className="w-full bg-white/50 border border-[#141414]/20 px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#141414] transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                const customId = `custom-${val}`;
                                setSelectedContextId(customId);
                                e.currentTarget.value = "";
                              }
                            }
                          }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                          <kbd className="text-[9px] font-mono bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">ENTER</kbd>
                        </div>
                      </div>
                      {selectedContextId?.startsWith('custom-') && (
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => setSelectedContextId(null)}
                            className="bg-[#141414] text-[#E4E3E0] px-2 py-1 text-[10px] font-mono uppercase flex items-center gap-1 hover:bg-red-900 transition-colors"
                          >
                            {selectedContextId.replace('custom-', '')}
                            <span className="opacity-50">×</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-12">
                    <button 
                      onClick={handleGoToProblems}
                      disabled={!selectedContextId || isGeneratingProblems}
                      className="w-full bg-[#141414] text-[#E4E3E0] py-6 flex items-center justify-center gap-4 text-xl font-bold uppercase tracking-tighter hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isGeneratingProblems ? (
                        <>
                          <RefreshCw className="animate-spin w-5 h-5" />
                          Analyzing Market...
                        </>
                      ) : (
                        <>
                          Next: Define Problem
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-50">
                    <Users className="w-3 h-3" />
                    Target: {contextStepData?.user_context_groups.flatMap(g => g.users).find(u => u.id === selectedContextId)?.label || selectedContextId?.replace('custom-', '')}
                  </div>
                  <h2 className="text-5xl font-bold tracking-tighter uppercase leading-none">Problem Definition</h2>
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-12">
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      02. Select or Define a Problem
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {problemStepData?.problems.map((prob) => (
                      <button
                        key={prob.id}
                        onClick={() => setSelectedProblemId(prob.id)}
                        className={cn(
                          "text-left p-6 border transition-all relative overflow-hidden group",
                          selectedProblemId === prob.id 
                            ? "bg-[#141414] border-[#141414] text-[#E4E3E0]" 
                            : "bg-white/50 border-[#141414]/20 hover:border-[#141414]"
                        )}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold uppercase tracking-tighter text-xl leading-tight max-w-[80%]">
                            {prob.problem_statement}
                          </div>
                          <div className={cn(
                            "text-[8px] font-mono uppercase px-2 py-0.5 rounded border",
                            prob.severity === "high" ? "border-red-500/30 text-red-600" : prob.severity === "medium" ? "border-yellow-500/30 text-yellow-600" : "border-green-500/30 text-green-600"
                          )}>
                            Severity: {prob.severity}
                          </div>
                        </div>
                        <p className="text-xs opacity-70 leading-relaxed italic">
                          "{prob.why_it_matters}"
                        </p>
                        {selectedProblemId === prob.id && (
                          <div className="absolute right-4 bottom-4">
                            <Target className="w-5 h-5 text-yellow-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Problem Input */}
                  <div className="pt-8 border-t border-[#141414]/10 space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono uppercase font-bold opacity-50 block">
                        {problemStepData?.custom_input.label || "Define a Custom Problem"}
                      </label>
                    </div>
                    
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder={problemStepData?.custom_input.placeholder || "e.g. High customer churn due to complex onboarding"}
                        className="w-full bg-white/50 border border-[#141414]/20 px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#141414] transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const customId = `custom-prob-${val}`;
                              setSelectedProblemId(customId);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <kbd className="text-[9px] font-mono bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">ENTER</kbd>
                      </div>
                    </div>

                    {selectedProblemId?.startsWith('custom-prob-') && (
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setSelectedProblemId(null)}
                          className="bg-[#141414] text-[#E4E3E0] px-2 py-1 text-[10px] font-mono uppercase flex items-center gap-1 hover:bg-red-900 transition-colors"
                        >
                          {selectedProblemId.replace('custom-prob-', '')}
                          <span className="opacity-50">×</span>
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                <div className="pt-12">
                  <button 
                    onClick={handleGoToCapabilities}
                    disabled={!selectedProblemId || isGeneratingCapabilities}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-6 flex items-center justify-center gap-4 text-xl font-bold uppercase tracking-tighter hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isGeneratingCapabilities ? (
                      <>
                        <RefreshCw className="animate-spin w-5 h-5" />
                        Identifying Capabilities...
                      </>
                    ) : (
                      <>
                        Next: Select Capabilities
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest opacity-50">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {contextStepData?.user_context_groups.flatMap(g => g.users).find(u => u.id === selectedContextId)?.label || selectedContextId?.replace('custom-', '')}
                    </div>
                    <div className="w-1 h-1 bg-[#141414]/20 rounded-full" />
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {problemStepData?.problems.find(p => p.id === selectedProblemId)?.problem_statement || selectedProblemId?.replace('custom-prob-', '')}
                    </div>
                  </div>
                  <h2 className="text-5xl font-bold tracking-tighter uppercase leading-none">AI Capabilities</h2>
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

              <div className="max-w-4xl mx-auto space-y-12">
                {/* AI Capabilities */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between border-b border-[#141414] pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      02. Select AI Capabilities
                    </h3>
                    <button 
                      onClick={() => {
                        const allIds = capabilitiesStepData?.capability_categories.flatMap(cat => cat.capabilities.map(c => c.id)) || [];
                        setSelectedCapabilities(allIds);
                      }}
                      className="text-[10px] uppercase underline opacity-50 hover:opacity-100"
                    >
                      Select All
                    </button>
                  </div>

                  <div className="space-y-4">
                    {capabilitiesStepData?.capability_categories.map((category) => (
                      <div key={category.label} className="border border-[#141414]/10 bg-white/30 overflow-hidden">
                        <button 
                          onClick={() => setExpandedCategory(expandedCategory === category.label ? null : category.label)}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#141414]/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="font-bold uppercase tracking-tight text-lg">{category.label}</div>
                            <div className="text-[10px] font-mono opacity-40 uppercase">
                              {category.capabilities.filter(c => selectedCapabilities.includes(c.id)).length} / {category.capabilities.length} Selected
                            </div>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 transition-transform", expandedCategory === category.label && "rotate-90")} />
                        </button>

                        <AnimatePresence>
                          {expandedCategory === category.label && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 bg-[#141414]/5 border-t border-[#141414]/10 space-y-6">
                                {/* Category Info */}
                                <div className="grid md:grid-cols-2 gap-8 pb-6 border-b border-[#141414]/10">
                                  <div className="space-y-4">
                                    <div>
                                      <div className="text-[9px] font-mono uppercase opacity-50 mb-1">Explanation</div>
                                      <p className="text-sm leading-relaxed">{category.explanation}</p>
                                    </div>
                                    <div>
                                      <div className="text-[9px] font-mono uppercase opacity-50 mb-1">How it works</div>
                                      <p className="text-xs opacity-70 leading-relaxed">{category.how_it_works}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <div className="text-[9px] font-mono uppercase opacity-50 mb-1">Typical Models</div>
                                      <p className="text-xs font-mono opacity-70">{category.typical_models}</p>
                                    </div>
                                    <div className="bg-[#141414] text-[#E4E3E0] p-3 rounded-sm">
                                      <div className="text-[9px] font-mono uppercase opacity-50 mb-1">Implementation Hint</div>
                                      <p className="text-[10px] leading-tight">{category.implementation_hint}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Specific Capabilities */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {category.capabilities.map((cap) => (
                                    <button
                                      key={cap.id}
                                      onClick={() => {
                                        setSelectedCapabilities(prev => 
                                          prev.includes(cap.id) ? prev.filter(id => id !== cap.id) : [...prev, cap.id]
                                        );
                                      }}
                                      className={cn(
                                        "text-left p-4 border transition-all relative overflow-hidden group",
                                        selectedCapabilities.includes(cap.id) 
                                          ? "bg-[#141414] border-[#141414] text-[#E4E3E0]" 
                                          : "bg-white/80 border-[#141414]/10 hover:border-[#141414]"
                                      )}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold uppercase tracking-tighter text-xs leading-tight">{cap.label}</div>
                                        <div className="flex gap-1">
                                          <div className={cn(
                                            "text-[6px] font-mono uppercase px-1 rounded border",
                                            cap.effort_level === "low" ? "border-green-500/30 text-green-600" : cap.effort_level === "medium" ? "border-yellow-500/30 text-yellow-600" : "border-red-500/30 text-red-600"
                                          )}>
                                            E: {cap.effort_level}
                                          </div>
                                          <div className={cn(
                                            "text-[6px] font-mono uppercase px-1 rounded border",
                                            cap.expense_level === "low" ? "border-green-500/30 text-green-600" : cap.expense_level === "medium" ? "border-yellow-500/30 text-yellow-600" : "border-red-500/30 text-red-600"
                                          )}>
                                            C: {cap.expense_level}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-[9px] opacity-60 leading-tight">{cap.description}</div>
                                      {selectedCapabilities.includes(cap.id) && (
                                        <div className="absolute right-2 bottom-2">
                                          <Zap className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* Custom Capability Input */}
                  <div className="pt-8 border-t border-[#141414]/10 space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono uppercase font-bold opacity-50 block">
                        Add Custom AI Capability
                      </label>
                      <p className="text-[9px] opacity-40 italic">Must be an AI-driven action (e.g. "Synthesize market trends" or "Predict supply gaps")</p>
                    </div>
                    
                    <div className="relative group">
                      <input 
                        type="text"
                        placeholder="e.g. Automate document verification"
                        className={cn(
                          "w-full bg-white/50 border border-[#141414]/20 px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#141414] transition-all",
                          customCapabilityError && "border-red-500 focus:border-red-500"
                        )}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const input = e.currentTarget;
                              input.disabled = true;
                              setCustomCapabilityError(null);
                              setCustomCapabilitySuggestions([]);
                              try {
                                const validation = await validateCustomCapability(val);
                                if (validation.is_valid) {
                                  const customId = `custom-cap-${val}`;
                                  if (!selectedCapabilities.includes(customId)) {
                                    setSelectedCapabilities(prev => [...prev, customId]);
                                  }
                                  input.value = "";
                                } else {
                                  setCustomCapabilityError(`"${val}" is not a valid AI capability.`);
                                  setCustomCapabilitySuggestions(validation.suggested_alternatives || []);
                                }
                              } catch (err) {
                                console.error("Validation failed", err);
                                setCustomCapabilityError("Validation failed. Please try again.");
                              } finally {
                                input.disabled = false;
                                input.focus();
                              }
                            }
                          }
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <kbd className="text-[9px] font-mono bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded">ENTER</kbd>
                      </div>
                    </div>

                    {customCapabilityError && (
                      <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase font-mono">
                          <AlertCircle className="w-3 h-3" />
                          {customCapabilityError}
                        </div>
                        {customCapabilitySuggestions.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[9px] font-mono uppercase opacity-50">Suggested Alternatives:</div>
                            <div className="flex flex-wrap gap-2">
                              {customCapabilitySuggestions.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    const customId = `custom-cap-${s.label}`;
                                    if (!selectedCapabilities.includes(customId)) {
                                      setSelectedCapabilities(prev => [...prev, customId]);
                                    }
                                    setCustomCapabilityError(null);
                                    setCustomCapabilitySuggestions([]);
                                  }}
                                  className="bg-white border border-[#141414]/10 px-2 py-1 text-[10px] font-mono uppercase hover:border-[#141414] transition-colors"
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {selectedCapabilities.filter(id => id.startsWith('custom-cap-')).map(id => (
                        <button 
                          key={id}
                          onClick={() => setSelectedCapabilities(prev => prev.filter(i => i !== id))}
                          className="bg-[#141414] text-[#E4E3E0] px-2 py-1 text-[10px] font-mono uppercase flex items-center gap-1 hover:bg-red-900 transition-colors"
                        >
                          {id.replace('custom-cap-', '')}
                          <span className="opacity-50">×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="pt-12 border-t border-[#141414]">
                  <button 
                    onClick={handleGenerateIdeas}
                    disabled={selectedCapabilities.length === 0 || isGeneratingIdeas}
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
                    1 Target User × {selectedCapabilities.length} Capabilities = Focused Innovation
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
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
