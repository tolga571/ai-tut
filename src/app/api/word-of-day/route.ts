import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Simple in-memory cache: key = userId+date, value = word data
const cache = new Map<string, { data: unknown; ts: number }>();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as {
    id?: string;
    targetLang?: string;
    nativeLang?: string;
    cefrLevel?: string;
    planStatus?: string;
  };

  if (user.planStatus !== "active") {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const userId = user.id ?? "anon";
  const targetLang = user.targetLang ?? "en";
  const nativeLang = user.nativeLang ?? "tr";
  const cefrLevel = user.cefrLevel ?? "A1";
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `${userId}:${today}`;

  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached.data);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `Generate a "word of the day" for a ${cefrLevel} level ${targetLang} learner whose native language is ${nativeLang}.

Return ONLY this JSON (no extra text):
{
  "word": "<the word in ${targetLang}>",
  "translation": "<translation in ${nativeLang}>",
  "pronunciation": "<phonetic pronunciation>",
  "partOfSpeech": "<noun|verb|adjective|adverb|phrase>",
  "example": "<a short example sentence in ${targetLang}>",
  "exampleTranslation": "<translation of the example in ${nativeLang}>",
  "tip": "<a short memorable tip or mnemonic in ${nativeLang}>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const wordData = JSON.parse(text);

    cache.set(cacheKey, { data: wordData, ts: Date.now() });
    // Clean old cache entries
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      cache.delete(oldest[0]);
    }

    return NextResponse.json(wordData);
  } catch (error) {
    console.error("[WORD_OF_DAY]", error);
    return NextResponse.json({ error: "Failed to generate word" }, { status: 500 });
  }
}
