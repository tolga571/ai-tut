import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  buildMemoryBlock,
  getTopicInstruction,
  normalizeLearnedWords,
} from "@/lib/chatHelpers";
import type { UserMemory } from "@/lib/chatHelpers";

const CEFR_GUIDE: Record<string, string> = {
  A1: "very simple words, 3-5 word sentences, ultra-basic vocabulary, present tense only",
  A2: "simple sentences, basic vocabulary, present and past tense, common expressions",
  B1: "everyday language, varied vocabulary, multiple tenses, can introduce idioms",
  B2: "clear complex language, wide vocabulary, natural expressions, phrasal verbs welcome",
  C1: "sophisticated language, advanced idioms, nuanced grammar, academic or professional style",
  C2: "near-native mastery, any register, subtle nuance, complex structures",
};


function buildSystemPrompt(
  targetLang: string,
  nativeLang: string,
  cefrLevel: string,
  topicInstruction?: string,
  memory?: UserMemory
): string {
  const cefrHint = CEFR_GUIDE[cefrLevel] ?? CEFR_GUIDE["A1"];
  const memoryBlock = memory ? buildMemoryBlock(memory) : "";
  const topicBlock = topicInstruction
    ? `

CONVERSATION CONTEXT:
- ${topicInstruction}
- Keep the conversation naturally within this scenario unless the student clearly changes the topic.`
    : "";

  return `You are an enthusiastic, encouraging language tutor helping a student learn ${targetLang}.
Their native language is ${nativeLang} and their current proficiency is CEFR level ${cefrLevel} (${cefrHint}).
${topicBlock}${memoryBlock}

PERSONALITY:
- Be warm, friendly, and motivating — like a patient native-speaker friend
- Show genuine curiosity: ask one engaging follow-up question at the end of EVERY response
- Celebrate effort and small wins ("Great try!", "Nice sentence!")
- Use examples and relatable contexts to make language stick
- If the student seems stuck, offer a hint or rephrase

CONVERSATIONAL VOICE (for the "content" field — what the student reads and may hear via text-to-speech):
- Sound like a thoughtful peer, not a machine reading a script: natural rhythm, not a flat list tone
- Vary pacing inside "content": mix short and medium sentences; avoid monotone, same-length lines every time
- Mirror emotional tone lightly when appropriate (supportive if they sound frustrated; a bit lighter if they are playful)
- You may rarely use a brief natural bridge in ${targetLang} when it fits ("Hmm…", "Well…", "I see—") — do not overuse; skip if it clashes with CEFR ${cefrLevel}
- Do NOT sound like a textbook or slide deck inside "content"; stay human and clear
- Still respect CEFR ${cefrLevel} level vocabulary and grammar; adapt response length to the complexity of the student's question — give thorough, detailed answers when the topic warrants it

RESPONSE FORMAT:
You MUST return ONLY a valid JSON object. No markdown, no extra text:
{
  "content": "<your reply entirely in ${targetLang}>",
  "translation": "<exact ${nativeLang} translation of content>",
  "correction": "<if the student made a grammar/spelling mistake: write ONLY the correction here in this format: ✏️ [original mistake] → [corrected form] — [short grammar rule explanation in ${nativeLang}]. Leave EMPTY STRING if no mistake.>",
  "words": [
    { "word": "<key ${targetLang} vocabulary word from your reply>", "definition": "<brief definition in ${nativeLang}>" }
  ]
}

CONTENT RULES:
- Write the full reply in ${targetLang} at CEFR ${cefrLevel} level
- Adapt reply length to the complexity of the question; provide thorough, comprehensive explanations whenever the topic benefits from more detail
- ALWAYS end with one curious follow-up question in ${targetLang}
- Never translate inside "content" — the "translation" field handles that

CORRECTION RULES:
- Only correct clear grammar or spelling mistakes, not stylistic choices
- Bold the error with ✏️ marker in the correction field
- Explain the rule briefly and encouragingly in ${nativeLang}
- If no mistake, set "correction" to "" (empty string)

WORDS RULES:
- Extract 2-4 useful vocabulary words directly from your "content" reply that are worth learning
- Choose words appropriate for CEFR ${cefrLevel} — not too simple, not too advanced
- Each word should be a single word or short phrase (not full sentences)
- Definition must be concise (3-8 words) in ${nativeLang}
- If the reply is very short or conversational, 1-2 words is fine
- Always return "words" as an array (can be empty [] if truly nothing notable)

CEFR PROGRESSION:
- If the student consistently writes grammatically correct sentences well above CEFR ${cefrLevel}, you may gently note at the end of your correction field (or as a warm aside inside "content") that they might be ready to advance. Only do this if it's genuinely evident — don't force it.
- Do NOT simplify language below what CEFR ${cefrLevel} allows. If the student asks advanced questions, engage with them at that level while still keeping your default output at CEFR ${cefrLevel}.`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id ?? "";
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const planStatus = (session.user as { planStatus?: string }).planStatus;
    if (planStatus !== "active") {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    if (!checkRateLimit(`chat:${userId}`, 30, 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many messages, please slow down" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = chatMessageSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { message, conversationId, topicId } = result.data;
    const user = session.user as {
      id?: string;
      targetLang?: string;
      nativeLang?: string;
      cefrLevel?: string;
    };

    const targetLang = user.targetLang ?? "en";
    const nativeLang = user.nativeLang ?? "en";
    const cefrLevel  = user.cefrLevel  ?? "A1";
    const currentConvId = conversationId;
    const topicInstruction = getTopicInstruction(topicId, targetLang);

    if (currentConvId) {
      const conv = await prisma.conversation.findFirst({
        where: { id: currentConvId, userId },
      });
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    // Fetch user memory context in parallel with conversation history
    const [history, profileRows, recentVocab, recentMistakeMessages] = await Promise.all([
      currentConvId
        ? prisma.message.findMany({
            where: { conversationId: currentConvId },
            orderBy: { createdAt: "asc" },
            take: 20,
          })
        : Promise.resolve([]),
      // $queryRaw bypasses stale Prisma client types for learningGoal/interestArea
      prisma.$queryRaw<Array<{ learningGoal: string | null; interestArea: string | null }>>`
        SELECT "learningGoal", "interestArea" FROM "User" WHERE id = ${userId} LIMIT 1
      `,
      prisma.vocabularyWord.findMany({
        where: { userId, language: targetLang },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { word: true },
      }),
      prisma.message.findMany({
        where: {
          conversation: { userId },
          role: "ai",
          NOT: [{ correction: "" }, { correction: null }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { correction: true },
      }),
    ]);

    const userProfile = profileRows[0] ?? null;
    const userMemory: UserMemory = {
      learningGoal: userProfile?.learningGoal,
      interestArea: userProfile?.interestArea,
      knownWords: recentVocab.map((v) => v.word),
      recentMistakes: recentMistakeMessages
        .map((m) => m.correction?.replace(/^✏️\s*/, "").trim())
        .filter((c): c is string => Boolean(c)),
    };

    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [
        {
          text:
            msg.role === "user"
              ? msg.content
              : JSON.stringify({
                  content: msg.content,
                  translation: msg.translation,
                  correction: msg.correction ?? "",
                }),
        },
      ],
    }));
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let aiResponseText = "";
    let modelError: unknown = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: buildSystemPrompt(
            targetLang,
            nativeLang,
            cefrLevel,
            topicInstruction,
            userMemory
          ),
          generationConfig: { responseMimeType: "application/json" },
        });
        const chat = model.startChat({ history: chatHistory.slice(0, -1) });
        const aiResult = await chat.sendMessage(message);
        aiResponseText = aiResult.response.text();
        if (aiResponseText) break;
      } catch (err) {
        modelError = err;
      }
    }

    if (!aiResponseText) {
      console.error("[CHAT_MODEL_ERROR]", modelError);
      return NextResponse.json({ error: "AI response unavailable, please try again" }, { status: 502 });
    }

    let parsedResult: { content?: unknown; translation?: unknown; correction?: unknown; words?: unknown };
    try {
      parsedResult = JSON.parse(aiResponseText);
    } catch {
      parsedResult = { content: aiResponseText, translation: "", correction: "", words: [] };
    }

    const normalizedResult = {
      content: typeof parsedResult.content === "string" ? parsedResult.content : aiResponseText,
      translation: typeof parsedResult.translation === "string" ? parsedResult.translation : "",
      correction: typeof parsedResult.correction === "string" ? parsedResult.correction : "",
      words: normalizeLearnedWords(parsedResult.words),
    };

    let persistedConvId = currentConvId;
    const persisted = await prisma.$transaction(async (tx) => {

      if (!persistedConvId) {
        const conv = await tx.conversation.create({
          data: {
            userId,
            ...(topicId
              ? {
                  topicId,
                  topicLabel:
                    (topicId === "cafe" && "Kafede sipariş") ||
                    (topicId === "travel-hotel" && "Otel resepsiyonu") ||
                    (topicId === "job-interview" && "İş görüşmesi") ||
                    (topicId === "friends" && "Günlük sohbet") ||
                    (topicId === "small-talk" && "Small talk") ||
                    topicId,
                }
              : {}),
          },
        });
        persistedConvId = conv.id;
      } else {
        await tx.conversation.update({
          where: { id: persistedConvId },
          data: { updatedAt: new Date() },
        });
      }

      await tx.message.create({
        data: { conversationId: persistedConvId, role: "user", content: message },
      });

      const savedAiMsg = await tx.message.create({
        data: {
          conversationId: persistedConvId,
          role: "ai",
          content: normalizedResult.content,
          translation: normalizedResult.translation,
          correction: normalizedResult.correction,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: 10 } },
        select: { xp: true },
      });

      return { savedAiMsg, updatedUser, conversationId: persistedConvId };
    });

    return NextResponse.json({
      message: { ...persisted.savedAiMsg, words: normalizedResult.words },
      conversationId: persisted.conversationId,
      xp: persisted.updatedUser.xp,
      xpAwarded: 10,
    });
  } catch (error) {
    console.error("[CHAT_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id ?? "";
    const planStatus = (session.user as { planStatus?: string }).planStatus;
    if (planStatus !== "active") {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("id");
    const limitParam = Number(searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 100;

    let conv;
    if (conversationId) {
      conv = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: "desc" }, take: limit } },
      });
    } else {
      conv = await prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: limit } },
      });
    }

    if (!conv) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({
      ...conv,
      messages: [...conv.messages].reverse(),
    });
  } catch (error) {
    console.error("[CHAT_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
