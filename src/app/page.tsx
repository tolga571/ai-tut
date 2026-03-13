import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-hidden selection:bg-blue-500/30">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />


      {/* Hero Section */}
      <main className="relative z-0 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="max-w-4xl space-y-8 animate-fade-in-up mt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-blue-300 backdrop-blur-md mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Powered by gemini-1.5-flash
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
            Fluent conversations,<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              powered by AI.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 font-light leading-relaxed">
            Stop memorizing vocabulary and start speaking. Chat naturally with our bilingual AI tutor and get instant translations and real-time corrections.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium text-lg leading-none shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              Let's Get Started
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Demo Chat Snippet */}
        <div className="w-full max-w-3xl mt-24 mb-12 p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl backdrop-blur-xl">
          <div className="bg-gray-950/80 rounded-xl p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <div className="ml-4 text-xs font-medium text-gray-500 uppercase tracking-widest">AiTut Conversation</div>
            </div>
            
            <div className="space-y-6 text-left">
              <div className="flex flex-col gap-1 items-end">
                <div className="bg-blue-600/20 text-blue-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] border border-blue-500/20">
                  <p className="text-base">Hola! Necesito ayuda para ordenar un café.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 items-start">
                <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl rounded-tl-sm max-w-[80%]">
                  <p className="text-base text-gray-200">¡Por supuesto! Puedes decir: <strong>"Quisiera un café con leche, por favor."</strong></p>
                  <p className="text-sm text-gray-400 mt-2 pt-2 border-t border-white/10">Of course! You can say: "I would like a coffee with milk, please."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
