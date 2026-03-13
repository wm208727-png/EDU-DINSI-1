import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  Languages, 
  GraduationCap, 
  ChevronRight, 
  Loader2, 
  Globe,
  ArrowLeft,
  Code,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Youtube,
  ExternalLink,
  User,
  X,
  Shield,
  FileText,
  Rocket,
  Music,
  Calculator,
  FlaskConical,
  Monitor,
  History as HistoryIcon,
  Map,
  Type as TypeIcon,
  PenTool,
  Flower2,
  HeartPulse,
  Trophy,
  Star,
  MessageCircle,
  Send,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from "@google/genai";
import { fetchWikipediaSummary, searchWikipedia, type WikipediaSummary } from './services/wikipediaService';
import { translateText, generateExpertSummary } from './services/translationService';
import { GRADE_SUBJECTS, LANGUAGES, WEB_DEV_LESSONS } from './constants';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  type User as FirebaseUser
} from './firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUBJECT_CONFIG: Record<string, { icon: any, color: string }> = {
  "Mathematics": { icon: Calculator, color: "bg-blue-500" },
  "Science": { icon: FlaskConical, color: "bg-purple-500" },
  "ICT": { icon: Monitor, color: "bg-indigo-500" },
  "History": { icon: HistoryIcon, color: "bg-amber-500" },
  "Geography": { icon: Map, color: "bg-orange-500" },
  "English": { icon: TypeIcon, color: "bg-rose-500" },
  "Sinhala": { icon: PenTool, color: "bg-teal-500" },
  "Music": { icon: Music, color: "bg-pink-500" },
  "Buddhism": { icon: Flower2, color: "bg-emerald-500" },
  "Tamil": { icon: Languages, color: "bg-emerald-500" },
  "Health": { icon: HeartPulse, color: "bg-emerald-500" },
  "Korean": { icon: Languages, color: "bg-emerald-500" },
  "Japanese": { icon: Languages, color: "bg-emerald-500" }
};

export default function App() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentArticle, setCurrentArticle] = useState<WikipediaSummary | null>(null);
  const [expertSummary, setExpertSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{ title: string; content: string } | null>(null);
  
  // Persistent Knowledge Score
  const [knowledgePoints, setKnowledgePoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('edu_dinsi_knowledge_points');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('edu_dinsi_knowledge_points', knowledgePoints.toString());
  }, [knowledgePoints]);

  const [flowerKey, setFlowerKey] = useState(0);

  // Rating State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "ratings"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRatings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRatings(fetchedRatings);
    });
    return () => unsubscribe();
  }, []);

  const handleRatingSubmit = async () => {
    if (!user) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        console.error("Login failed", error);
        return;
      }
    }

    if (userRating === 0) return;

    setIsSubmittingRating(true);
    try {
      await addDoc(collection(db, "ratings"), {
        rating: userRating,
        comment: ratingComment,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || "Anonymous",
        createdAt: serverTimestamp()
      });
      setShowRatingSuccess(true);
      setUserRating(0);
      setRatingComment("");
      setTimeout(() => setShowRatingSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting rating", error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
    : "0.0";
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Section State
  const [activeSection, setActiveSection] = useState<'home' | 'webdev' | 'specialized'>('home');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: "Hello! I'm your EDU DINSI AI assistant. How can I help you with your studies today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: chatMessages.concat({ role: 'user', text: userMessage }).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: "You are EDU DINSI AI, a helpful and encouraging educational assistant for students. Keep your answers clear, concise, and professional. Use emojis occasionally to be friendly. You are part of the EDU DINSI platform created by Disas Dinsitha."
        }
      });

      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that." }]);
      addKnowledgePoints(5); // AI interaction points
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    const results = await searchWikipedia(searchQuery);
    setSearchResults(results);
    setIsLoading(false);
  };

  const loadArticle = async (title: string) => {
    setIsLoading(true);
    const article = await fetchWikipediaSummary(title);
    setCurrentArticle(article);
    
    if (selectedSubject && selectedGrade) {
      const summary = await generateExpertSummary(title, selectedSubject, selectedGrade);
      setExpertSummary(summary);
      addKnowledgePoints(25); // Expert summary is valuable
    } else {
      addKnowledgePoints(10); // Basic article is also good
    }
    
    setTranslatedContent(null);
    setIsLoading(false);
  };

  const handleTranslate = async () => {
    if (!currentArticle || !expertSummary || targetLanguage === 'English') return;
    
    setIsTranslating(true);
    try {
      const [translatedTitle, translatedBody] = await Promise.all([
        translateText(currentArticle.title, targetLanguage),
        translateText(expertSummary, targetLanguage)
      ]);
      setTranslatedContent({
        title: translatedTitle,
        content: translatedBody
      });
      addKnowledgePoints(5); // Language learning points
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const getKnowledgeRank = () => {
    if (knowledgePoints < 100) return "Novice Explorer";
    if (knowledgePoints < 300) return "Knowledge Seeker";
    if (knowledgePoints < 700) return "Academic Scholar";
    if (knowledgePoints < 1500) return "Master Learner";
    return "Grand Sage";
  };

  const addKnowledgePoints = (points: number) => {
    setKnowledgePoints(prev => prev + points);
    if (points >= 20) {
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399']
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1A1A1A] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Glowing Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Score Dashboard */}
      <div className="fixed bottom-8 right-8 z-[50] flex flex-col gap-4 items-end pointer-events-none">
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md border border-emerald-100 p-4 rounded-3xl shadow-2xl flex items-center gap-4 pointer-events-auto group hover:scale-105 transition-all"
        >
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Knowledge Points</p>
            <p className="text-2xl font-black text-emerald-950 tracking-tighter">{knowledgePoints}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-md border border-emerald-100 p-4 rounded-3xl shadow-2xl flex items-center gap-4 pointer-events-auto group hover:scale-105 transition-all"
        >
          <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Knowledge Rank</p>
            <p className="text-xl font-black text-emerald-950 tracking-tighter">{getKnowledgeRank()}</p>
          </div>
        </motion.div>
      </div>

      {/* Header */}
      <AnimatePresence>
        {flowerKey > 0 && (
          <motion.div 
            key={flowerKey}
            className="fixed inset-0 pointer-events-none z-[200]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 3 }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: '50vw',
                  y: '60vh',
                  scale: 0,
                  rotate: 0
                }}
                animate={{ 
                  x: `${50 + (Math.random() - 0.5) * 120}vw`,
                  y: `${40 + (Math.random() - 0.5) * 100}vh`,
                  scale: [0, 1.5, 1],
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 2 + Math.random(),
                  ease: "easeOut"
                }}
                className="absolute text-4xl select-none"
              >
                {['🌸', '🌺', '🌼', '🌻', '🌷'][Math.floor(Math.random() * 5)]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {
              setSelectedGrade(null);
              setSelectedSubject(null);
              setCurrentArticle(null);
              setActiveSection('home');
            }}
          >
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-emerald-950">EDU DINSI</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Expert Learning Hub</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <button 
              onClick={() => setActiveSection('home')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all hover:text-emerald-600",
                activeSection === 'home' ? "text-emerald-600" : "text-gray-400"
              )}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveSection('webdev')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all hover:text-emerald-600 flex items-center gap-2",
                activeSection === 'webdev' ? "text-emerald-600" : "text-gray-400"
              )}
            >
              <Code className="w-4 h-4" />
              Code with Dinsi
            </button>
            <button 
              onClick={() => setActiveSection('specialized')}
              className={cn(
                "text-sm font-bold uppercase tracking-widest transition-all hover:text-emerald-600 flex items-center gap-2",
                activeSection === 'specialized' ? "text-emerald-600" : "text-gray-400"
              )}
            >
              <Rocket className="w-4 h-4" />
              Specialized
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
              <Globe className="w-4 h-4 text-emerald-600" />
              <select 
                className="bg-transparent text-sm font-bold text-emerald-900 outline-none cursor-pointer"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.name}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {activeSection === 'webdev' ? (
            <motion.section
              key="webdev"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  <Code className="w-3 h-3" /> Professional Tutorials
                </div>
                <h2 className="text-5xl font-black text-emerald-950 tracking-tight">Code with Dinsi</h2>
                <p className="text-gray-500 text-lg">Master the art of web development with professional tips and modern practices.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {WEB_DEV_LESSONS.map((lesson, idx) => (
                  <motion.div
                    key={lesson.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/80 backdrop-blur-lg border border-emerald-100 p-8 rounded-[2rem] shadow-xl shadow-emerald-500/5 group hover:border-emerald-400 transition-all"
                  >
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20 group-hover:rotate-6 transition-transform">
                      <Zap className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-950 mb-4">{lesson.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">{lesson.content}</p>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2">Pro Tip</p>
                      <p className="text-sm text-emerald-900 font-medium italic">"{lesson.tips}"</p>
                    </div>
                    <button 
                      onClick={() => addKnowledgePoints(20)}
                      className="w-full py-3 rounded-xl bg-emerald-950 text-white font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                    >
                      Mark as Learned (+20)
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ) : activeSection === 'specialized' ? (
            <motion.section
              key="specialized"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" /> Advanced Learning
                </div>
                <h2 className="text-5xl font-black text-emerald-950 tracking-tight">Specialized Subjects</h2>
                <p className="text-gray-500 text-lg">Explore complex topics with simplified expert summaries and interactive tools.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedGrade(13); // Default to highest grade for advanced topics
                    setSelectedSubject('Science');
                    loadArticle('Rocket science');
                    setActiveSection('home');
                  }}
                  className="bg-white/80 backdrop-blur-lg border border-emerald-100 p-10 rounded-[3rem] shadow-xl shadow-emerald-500/5 group hover:border-emerald-400 transition-all text-left"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
                    <Rocket className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-950 mb-4">Rocket Science</h3>
                  <p className="text-gray-600 leading-relaxed text-lg mb-6">Master the principles of aerospace engineering, propulsion, and orbital mechanics.</p>
                  <div className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-sm">
                    Explore Now <ExternalLink className="w-4 h-4" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedGrade(13);
                    setSelectedSubject('Music');
                    loadArticle('Music');
                    setActiveSection('home');
                  }}
                  className="bg-white/80 backdrop-blur-lg border border-emerald-100 p-10 rounded-[3rem] shadow-xl shadow-emerald-500/5 group hover:border-emerald-400 transition-all text-left"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
                    <Music className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-950 mb-4">Music Theory</h3>
                  <p className="text-gray-600 leading-relaxed text-lg mb-6">Understand the mathematical and artistic foundations of sound, rhythm, and harmony.</p>
                  <div className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-sm">
                    Explore Now <ExternalLink className="w-4 h-4" />
                  </div>
                </motion.button>
              </div>
            </motion.section>
          ) : !selectedGrade ? (
            <motion.section
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              <div className="text-center space-y-6 max-w-4xl mx-auto">
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-3 bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/40"
                >
                  <Sparkles className="w-4 h-4" /> Future of Learning
                </motion.div>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-emerald-950 leading-[0.9]">
                  Empowering <span className="text-emerald-500">Every</span> Student.
                </h2>
                <p className="text-gray-400 text-xl md:text-2xl font-medium max-w-2xl mx-auto">
                  Expert summaries, AI-powered quizzes, and multi-language support for all grades.
                </p>

                {/* Quick Discovery Section */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/50">Quick Discovery:</span>
                  <button 
                    onClick={() => {
                      setSelectedGrade(13);
                      setSelectedSubject('Science');
                      loadArticle('Rocket science');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Rocket className="w-3 h-3" /> Rocket Science
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(13);
                      setSelectedSubject('Music');
                      loadArticle('Music');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Music className="w-3 h-3" /> Music Theory
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(1);
                      setSelectedSubject('Buddhism');
                      loadArticle('Gautama Buddha');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Flower2 className="w-3 h-3" /> Buddhism
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(1);
                      setSelectedSubject('Tamil');
                      loadArticle('Tamil language');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Languages className="w-3 h-3" /> Tamil
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(1);
                      setSelectedSubject('Health');
                      loadArticle('Healthy lifestyle');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <HeartPulse className="w-3 h-3" /> Health
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(1);
                      setSelectedSubject('Korean');
                      loadArticle('Korean language');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Languages className="w-3 h-3" /> Korean
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGrade(1);
                      setSelectedSubject('Japanese');
                      loadArticle('Japanese language');
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-100"
                  >
                    <Languages className="w-3 h-3" /> Japanese
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6">
                {Array.from({ length: 13 }, (_, i) => i + 1).map((grade) => (
                  <motion.button
                    key={grade}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedGrade(grade)}
                    className="aspect-square bg-white/40 backdrop-blur-md border border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-500/5 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all group"
                  >
                    <span className="text-5xl font-black tracking-tighter group-hover:scale-110 transition-transform">
                      {grade}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Grade</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ) : !selectedSubject ? (
            <motion.section
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedGrade(null)}
                  className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 font-black uppercase tracking-widest text-xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Grades
                </button>
                <h2 className="text-4xl font-black text-emerald-950">Grade {selectedGrade} Subjects</h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {GRADE_SUBJECTS[selectedGrade].map((subject, idx) => {
                  const config = SUBJECT_CONFIG[subject] || { icon: BookOpen, color: "bg-emerald-500" };
                  const Icon = config.icon;
                  
                  return (
                    <motion.button
                      key={subject}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setSelectedSubject(subject)}
                      className="bg-white/60 backdrop-blur-lg border border-emerald-100 p-10 rounded-[3rem] text-left shadow-2xl shadow-emerald-500/5 hover:border-emerald-400 hover:bg-emerald-50 transition-all group relative overflow-hidden"
                    >
                      <div className={cn(
                        "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-10 transition-opacity group-hover:opacity-20",
                        config.color
                      )} />
                      
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 transition-all shadow-lg group-hover:scale-110 group-hover:rotate-3",
                        config.color
                      )}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3 className="text-3xl font-black text-emerald-950 mb-2">{subject}</h3>
                      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Explore Lessons</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          ) : !currentArticle ? (
            <motion.section
              key="lessons"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <button 
                    onClick={() => setSelectedSubject(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 font-black uppercase tracking-widest text-xs transition-all mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Subjects
                  </button>
                  <h2 className="text-5xl font-black text-emerald-950 tracking-tight">{selectedSubject} Lessons</h2>
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedSubject} topics...`}
                    className="w-full bg-white/50 backdrop-blur-md border border-emerald-100 rounded-2xl py-4 pl-12 pr-6 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse" />
                  </div>
                  <p className="text-emerald-900 font-black uppercase tracking-[0.3em] text-xs">Accessing Knowledge Base</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {searchResults.length > 0 ? searchResults.map((topic, idx) => (
                    <motion.div
                      key={topic}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => loadArticle(topic)}
                      className="group bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/10 hover:border-emerald-400 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-xl text-emerald-950 group-hover:text-emerald-600 transition-colors">
                            {topic}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Expert Module</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-emerald-100 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  )) : (
                    <div className="col-span-full text-center py-20 bg-emerald-50/50 rounded-[3rem] border border-dashed border-emerald-200">
                      <Search className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                      <p className="text-emerald-900 font-bold">Search for a topic to begin learning!</p>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.article
              key="article"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-12"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    setCurrentArticle(null);
                  }}
                  className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 font-black uppercase tracking-widest text-xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Lessons
                </button>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleTranslate}
                    disabled={isTranslating || targetLanguage === 'English'}
                    className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 transition-all"
                  >
                    {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-emerald-100">
                {currentArticle.thumbnail && (
                  <div className="w-full h-[400px] relative">
                    <img 
                      src={currentArticle.thumbnail.source} 
                      alt={currentArticle.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-12 md:p-20 space-y-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px]">
                      <BrainCircuit className="w-4 h-4" /> Expert Summary
                    </div>
                    <h2 className="text-6xl font-black text-emerald-950 tracking-tighter leading-[0.9]">
                      {translatedContent?.title || currentArticle.title}
                    </h2>
                  </div>

                  <div 
                    id="summary-content" 
                    ref={summaryRef}
                    className="prose prose-xl max-w-none text-gray-700 leading-relaxed"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-4 text-emerald-600">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="font-bold">Generating expert content...</span>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <ReactMarkdown>
                          {translatedContent?.content || expertSummary || currentArticle.extract}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Knowledge Acquisition Section */}
                  <div className="pt-12 border-t border-emerald-100">
                    <div className="bg-emerald-50 p-12 rounded-[2.5rem] text-center space-y-6 border border-emerald-100">
                      <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/20">
                        <Sparkles className="w-10 h-10" />
                      </div>
                      <h3 className="text-3xl font-black text-emerald-950">Knowledge Acquired!</h3>
                      <p className="text-emerald-800/70 font-medium">You've successfully explored this lesson. Your knowledge points have increased!</p>
                      <div className="flex justify-center gap-4">
                        <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lesson Value</p>
                          <p className="text-xl font-black text-emerald-950">+25 Points</p>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Current Rank</p>
                          <p className="text-xl font-black text-emerald-950">{getKnowledgeRank()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </main>

      {/* Ratings Section */}
      <section className="max-w-7xl mx-auto px-4 py-24 border-t border-emerald-100">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                </div>
                <h2 className="text-4xl font-black text-emerald-950 tracking-tighter">User Ratings</h2>
              </div>
              <p className="text-emerald-900/60 text-lg">
                See what other students think about EDU DINSI and share your own experience.
              </p>
            </div>

            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex items-center gap-8">
              <div className="text-center">
                <p className="text-6xl font-black text-emerald-950 tracking-tighter">{averageRating}</p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Average Rating</p>
              </div>
              <div className="h-16 w-px bg-emerald-200" />
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={cn(
                        "w-5 h-5",
                        star <= Math.round(Number(averageRating)) ? "text-amber-500 fill-amber-500" : "text-emerald-200"
                      )} 
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-emerald-900/40">{ratings.length} total reviews</p>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {ratings.map((rating) => (
                  <motion.div 
                    key={rating.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-emerald-50 p-6 rounded-3xl shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs">
                          {rating.userName.charAt(0)}
                        </div>
                        <span className="font-black text-sm text-emerald-950">{rating.userName}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={cn(
                              "w-3 h-3",
                              star <= rating.rating ? "text-amber-500 fill-amber-500" : "text-emerald-100"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-emerald-900/70 leading-relaxed italic">"{rating.comment}"</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-100 p-10 rounded-[3rem] shadow-2xl shadow-emerald-900/5 space-y-8 sticky top-8">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-emerald-950 tracking-tight">Rate your experience</h3>
              <p className="text-sm text-emerald-900/50">Your feedback helps us improve the platform for everyone.</p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="group relative transition-transform active:scale-90"
                  >
                    <Star 
                      className={cn(
                        "w-12 h-12 transition-all",
                        star <= userRating 
                          ? "text-amber-500 fill-amber-500 scale-110" 
                          : "text-emerald-100 group-hover:text-amber-200"
                      )} 
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Optional Comment</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Tell us what you like or how we can improve..."
                  className="w-full bg-emerald-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-3xl p-6 text-sm text-emerald-950 outline-none transition-all min-h-[120px] resize-none"
                />
              </div>

              <button
                onClick={handleRatingSubmit}
                disabled={userRating === 0 || isSubmittingRating}
                className={cn(
                  "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3",
                  userRating === 0 || isSubmittingRating
                    ? "bg-emerald-100 text-emerald-300 cursor-not-allowed"
                    : "bg-emerald-950 text-white hover:bg-black shadow-xl shadow-emerald-950/20"
                )}
              >
                {isSubmittingRating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {user ? "Submit Rating" : "Sign in to Rate"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {showRatingSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Rating submitted! Thank you!</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-emerald-950 text-white py-20 mt-32">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-black tracking-tighter">EDU DINSI</span>
            </div>
            <p className="text-emerald-200/60 text-lg leading-relaxed max-w-md">
              The world's most advanced educational platform for students. Expert content, AI-powered tools, and professional tutorials.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Connect</h4>
            <a 
              href="https://youtube.com/@mr.dinsibro-1?si=wW3HSmzVVbNoDANP" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-4 rounded-2xl transition-all group border border-white/5"
            >
              <Youtube className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="font-black text-sm">YouTube</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Subscribe for Tips</span>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto opacity-30" />
            </a>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">About the Creator</h4>
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm">Disas Dinsitha</p>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">12 Year Old Coder</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-emerald-100/60 font-medium leading-relaxed">
                <p>📍 No.05C, Pahalahena Road Kamburugoda Bndaragama.</p>
                <p>📜 If you would like to see my certificates/qualifications, they are listed below:</p>
                <ul className="pl-4 space-y-1 list-disc text-emerald-400/80">
                  <li>Full Stack Web Development Certification</li>
                  <li>Advanced JavaScript Mastery</li>
                  <li>AI & Machine Learning Fundamentals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-20 border-t border-emerald-900/50 mt-20 flex flex-col md:flex-row items-center justify-between gap-8 text-emerald-500/40 text-[10px] font-black uppercase tracking-widest">
          <span>&copy; 2026 EDU DINSI. All Rights Reserved.</span>
          <div className="flex gap-8">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-emerald-500 transition-colors">Privacy Policy</button>
            <button onClick={() => setShowTerms(true)} className="hover:text-emerald-500 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-emerald-100 p-8 md:p-12 relative"
            >
              <button 
                onClick={() => setShowPrivacy(false)}
                className="absolute top-6 right-6 p-2 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-emerald-900" />
              </button>
              
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-emerald-950">Privacy Policy</h2>
                </div>

                <div className="space-y-6 text-gray-600 leading-relaxed">
                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">1. Data Collection</h3>
                    <p>EDU DINSI collects minimal personal data necessary to provide our educational services. This may include basic profile information and learning progress.</p>
                  </section>
                  
                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">2. Content Creation</h3>
                    <p>All educational summaries and interactive quizzes are personally created and curated by Disas to ensure the highest quality for students.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">3. Data Security</h3>
                    <p>We prioritize the security of student data. All information is encrypted and stored securely, following industry-standard protection protocols.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">4. Cookies</h3>
                    <p>We use essential cookies to maintain your session and remember your preferences, such as your selected grade and language.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-emerald-100 p-8 md:p-12 relative"
            >
              <button 
                onClick={() => setShowTerms(false)}
                className="absolute top-6 right-6 p-2 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-emerald-900" />
              </button>
              
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-emerald-950">Terms of Service</h2>
                </div>

                <div className="space-y-6 text-gray-600 leading-relaxed">
                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">1. Use of Service</h3>
                    <p>EDU DINSI is provided for educational purposes. Users are granted a non-exclusive license to access content and tools for personal learning.</p>
                  </section>
                  
                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">2. Content Accuracy</h3>
                    <p>While Disas strives for excellence, educational summaries and quizzes may occasionally contain minor errors. Always verify critical information with official textbooks or teachers.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">3. User Conduct</h3>
                    <p>Users must use the platform responsibly and respectfully. Any attempt to exploit or misuse the platform tools is strictly prohibited.</p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">4. Intellectual Property</h3>
                    <p>All platform design, code, and original educational content are the property of EDU DINSI and Disas Dinsitha.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-[380px] h-[500px] bg-white rounded-[2rem] shadow-2xl border border-emerald-100 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-emerald-950 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-xl">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm tracking-tight">EDU DINSI AI</h3>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Online Assistant</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="text-emerald-400 hover:text-white transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-emerald-500 text-white rounded-tr-none" 
                        : "bg-emerald-50 text-emerald-950 rounded-tl-none"
                    )}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-start max-w-[85%]">
                    <div className="bg-emerald-50 p-4 rounded-2xl rounded-tl-none">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-emerald-50">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-emerald-50 border-none rounded-xl px-4 py-3 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="bg-emerald-950 text-white p-3 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95",
            isChatOpen ? "bg-white text-emerald-950" : "bg-emerald-950 text-white"
          )}
        >
          {isChatOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
        </button>
      </div>
    </div>
  );
}
