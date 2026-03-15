import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rateLimit";

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
  cefrLevel: string
): string {
  const cefrHint = CEFR_GUIDE[cefrLevel] ?? CEFR_GUIDE["A1"];
  return `You are an enthusiastic, encouraging language tutor helping a student learn ${targetLang}.
Their native language is ${nativeLang} and their current proficiency is CEFR level ${cefrLevel} (${cefrHint}).

PERSONALITY:
- Be warm, friendly, and motivating — like a patient native-speaker friend
- Show genuine curiosity: ask one engaging follow-up question at the end of EVERY response
- Celebrate effort and small wins ("Great try!", "Nice sentence!")
- Use examples and relatable contexts to make language stick
- If the student seems stuck, offer a hint or rephrase

RESPONSE FORMAT:
You MUST return ONLY a valid JSON object. No markdown, no extra text:
{
  "content": "<your reply entirely in ${targetLang}>",
  "translation": "<exact ${nativeLang} translation of content>",
  "correction": "<if the student made a grammar/spelling mistake: write ONLY the correction here in this format: ✏️ [original mistake] → [corrected form] — [short grammar rule explanation in ${nativeLang}]. Leave EMPTY STRING if no mistake.>"
}

CONTENT RULES:
- Write the full reply in ${targetLang} at CEFR ${cefrLevel} level
- Keep replies concise (2-4 sentences) unless more depth is clearly needed
- ALWAYS end with one curious follow-up question in ${targetLang}
- Never translate inside "content" — the "translation" field handles that

CORRECTION RULES:
- Only correct clear grammar or spelling mistakes, not stylistic choices
- Bold the error with ✏️ marker in the correction field
- Explain the rule briefly and encouragingly in ${nativeLang}
- If no mistake, set "correction" to "" (empty string)`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as { id?: string }).id ?? "";
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
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

    const { message, conversationId } = result.data;
    const user = session.user as {
      id?: string;
      targetLang?: string;
      nativeLang?: string;
      cefrLevel?: string;
    };

    const targetLang = user.targetLang ?? "en";
    const nativeLang = user.nativeLang ?? "en";
    const cefrLevel  = user.cefrLevel  ?? "A1";

    let currentConvId = conversationId;

    if (!currentConvId) {
      const conv = await prisma.conversation.create({ data: { userId } });
      currentConvId = conv.id;
    } else {
      const conv = await prisma.conversation.findFirst({
        where: { id: currentConvId, userId },
      });
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    await prisma.message.create({
      data: { conversationId: currentConvId, role: "user", content: message },
    });

    const history = await prisma.message.findMany({
      where: { conversationId: currentConvId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new NextResponse("API Key missing", { status: 500 });
    }

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
          systemInstruction: buildSystemPrompt(targetLang, nativeLang, cefrLevel),
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

    let parsedResult: { content: string; translation: string; correction?: string };
    try {
      parsedResult = JSON.parse(aiResponseText);
    } catch {
      parsedResult = { content: aiResponseText, translation: "", correction: "" };
    }

    const [savedAiMsg, updatedUser] = await Promise.all([
      prisma.message.create({
        data: {
          conversationId: currentConvId,
          role: "ai",
          content:    parsedResult.content,
          translation: parsedResult.translation || "",
          correction:  parsedResult.correction  || "",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 10 } },
        select: { xp: true },
      }),
    ]);

    return NextResponse.json({
      message: savedAiMsg,
      conversationId: currentConvId,
      xp: updatedUser.xp,
      xpAwarded: 10,
    });
  } catch (error) {
    console.error("[CHAT_POST]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as { id?: string }).id ?? "";
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("id");

    let conv;
    if (conversationId) {
      conv = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else {
      conv = await prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    return NextResponse.json(conv || { messages: [] });
  } catch (error) {
    console.error("[CHAT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
