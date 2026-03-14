import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="relative group p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-white/20 transition-all hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${gradient}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepBadge({ step }: { step: number }) {
  return (
    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {step}
    </div>
  );
}

function HomeContent() {
  const t = useTranslations("home");

  const features = [
    {
      icon: "🤖",
      title: "AI Language Tutor",
      description: "Chat with a Gemini-powered tutor that adapts to your CEFR level — from A1 beginner to C2 mastery.",
      gradient: "bg-blue-500/15",
    },
    {
      icon: "✏️",
      title: "Real-Time Corrections",
      description: "Every message you send gets grammar and vocabulary feedback, so you learn from your mistakes instantly.",
      gradient: "bg-amber-500/15",
    },
    {
      icon: "🌐",
      title: "Bilingual Responses",
      description: "AI replies in your target language with instant translation — you always know exactly what was said.",
      gradient: "bg-purple-500/15",
    },
    {
      icon: "📈",
      title: "Track Your Progress",
      description: "Daily streak, conversation count, and message stats keep you motivated to practice every day.",
      gradient: "bg-green-500/15",
    },
    {
      icon: "🎯",
      title: "35+ Languages",
      description: "Learn Spanish, French, German, Japanese, Arabic, Mandarin and many more — all in one place.",
      gradient: "bg-rose-500/15",
    },
    {
      icon: "📚",
      title: "Learning Resources",
      description: "Curated blog posts, guides, and documents in your target language to supplement your practice.",
      gradient: "bg-cyan-500/15",
    },
  ];

  const steps = [
    {
      title: "Choose your language",
      description: "Select your native language, the language you want to learn, and your current proficiency level.",
    },
    {
      title: "Start a conversation",
      description: "Chat naturally with the AI tutor. Ask questions, practice phrases, or discuss any topic you like.",
    },
    {
      title: "Learn from feedback",
      description: "Get instant corrections, see translations, and watch your confidence grow with every message.",
    },
  ];

  const supportedLanguages = [
    { flag: "🇪🇸", name: "Spanish" },
    { flag: "🇫🇷", name: "French" },
    { flag: "🇩🇪", name: "German" },
    { flag: "🇯🇵", name: "Japanese" },
    { flag: "🇨🇳", name: "Mandarin" },
    { flag: "🇸🇦", name: "Arabic" },
    { flag: "🇧🇷", name: "Portuguese" },
    { flag: "🇮🇹", name: "Italian" },
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden selection:bg-blue-500/30 transition-colors">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[140px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/15 blur-[140px] rounded-full mix-blend-screen pointer-events-none" />

      {/* ── HERO ── */}
      <main className="relative z-0 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="max-w-4xl space-y-8 mt-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-blue-600 dark:text-blue-300 backdrop-blur-md mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            {t("badge")}
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              {t("title")}
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              {t("titleAccent")}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 dark:text-gray-400 font-light leading-relaxed">
            {t("description")}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              {t("cta")}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 border border-gray-300 dark:border-white/15 rounded-full font-medium text-lg hover:border-gray-400 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300"
            >
              Sign In
            </Link>
          </div>

          {/* Language pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {supportedLanguages.map((lang) => (
              <span
                key={lang.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
              >
                {lang.flag} {lang.name}
              </span>
            ))}
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500">
              +27 more
            </span>
          </div>
        </div>

        {/* Demo Chat Snippet */}
        <div className="w-full max-w-2xl mt-20 mb-16 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-gray-900">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
            <span className="ml-3 text-xs font-medium text-gray-400 uppercase tracking-widest">AiTut — Spanish Practice</span>
          </div>
          {/* Messages */}
          <div className="p-5 space-y-5 text-left">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm leading-relaxed">
                Hola! Necesito ayuda para ordenar un café.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm leading-relaxed">
                <p className="text-gray-800 dark:text-gray-100">¡Por supuesto! Puedes decir: <strong>&quot;Quisiera un café con leche, por favor.&quot;</strong></p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
                  Of course! You can say: &quot;I would like a coffee with milk, please.&quot;
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm leading-relaxed">
                Gracias! Como se dice &quot;can I get the check&quot;?
              </div>
            </div>
            <div className="flex justify-start flex-col gap-2 max-w-[80%]">
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed">
                <p className="text-gray-800 dark:text-gray-100">Di: <strong>&quot;¿Me puede traer la cuenta, por favor?&quot;</strong> ¡Muy bien!</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
                  Say: &quot;Can you bring me the check, please?&quot; Very good!
                </p>
              </div>
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-300">
                <span className="flex-shrink-0 mt-0.5">✏️</span>
                <span>Small tip: &quot;Gracias&quot; is perfect! Remember to use &quot;¿Cómo se dice...?&quot; for &quot;How do you say...?&quot;</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FEATURES ── */}
      <section className="relative px-4 py-24 border-t border-gray-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to become fluent
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              No textbooks. No flashcards. Just real conversations with an AI that corrects you, guides you, and keeps you coming back.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative px-4 py-24 bg-gray-50 dark:bg-gray-900/40 border-t border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Up and running in 60 seconds
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No complicated setup. Just pick a language and start talking.
            </p>
          </div>
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-5 items-start">
                <StepBadge step={i + 1} />
                <div className="pt-1.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="relative px-4 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl mb-6">🚀</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to start speaking?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
            Join thousands of learners having real conversations in their target language every day.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95"
          >
            Get started for free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">No credit card required.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 dark:border-white/5 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-600">
          <p className="font-semibold text-gray-700 dark:text-gray-400">AiTut</p>
          <p>AI-powered language learning — speak with confidence.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-gray-700 dark:hover:text-gray-400 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-gray-700 dark:hover:text-gray-400 transition-colors">Get Started</Link>
            <Link href="/pricing" className="hover:text-gray-700 dark:hover:text-gray-400 transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
