import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/chat.validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      `chat:${session.user.id}`,
      RATE_LIMITS.CHAT
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Çok fazla mesaj. Lütfen biraz bekleyin." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz mesaj verisi",
          errors: parsed.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { message, conversationId } = parsed.data;
    const user = session.user;

    let currentConvId = conversationId;

    // Save User message
    if (!currentConvId) {
      const conv = await prisma.conversation.create({
        data: { userId: user.id },
      });
      currentConvId = conv.id;
    }

    await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "user",
        content: message,
      },
    });

    // Fetch conversation history
    const history = await prisma.message.findMany({
      where: { conversationId: currentConvId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("Gemini API key missing");
      return NextResponse.json(
        { success: false, message: "AI servisi yapılandırılmamış" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPrompt = `Sen bir dil öğretmenisin. Karşındaki kullanıcı ${user.targetLang || "İngilizce"} öğreniyor, anadili ise ${user.nativeLang || "Türkçe"}.
Her yanıtında:
1. Önce HEDEF DİL'de (${user.targetLang}) doğal ve kısa bir cümle kur.
2. Hemen altında ANA DİL'e (${user.nativeLang}) çevirisini ver.
3. Kullanıcı hata yaparsa nazikçe düzelt. Seviyesine uygun konuş.

Yanıtını KESİNLİKLE GEÇERLİ BİR JSON FORMATINDA ver. Sadece JSON objesi döndür:
{
  "content": "[hedef dildeki öğretici / doğal cümle veya karşılık (ör. İngilizce)]",
  "translation": "[bu cümlenin anadildeki çevirisi (ör. Türkçe)]"
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [
        {
          text:
            msg.role === "user"
              ? msg.content
              : JSON.stringify({
                  content: msg.content,
                  translation: msg.translation,
                }),
        },
      ],
    }));

    const chat = model.startChat({
      history: chatHistory.slice(0, -1),
    });

    const result = await chat.sendMessage(message);
    const aiResponseText = result.response.text();

    let parsedResult: { content: string; translation: string };
    try {
      parsedResult = JSON.parse(aiResponseText);
    } catch {
      parsedResult = { content: aiResponseText, translation: "" };
    }

    // Save AI response
    const savedAiMsg = await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "ai",
        content: parsedResult.content,
        translation: parsedResult.translation || "",
      },
    });

    return NextResponse.json({
      message: savedAiMsg,
      conversationId: currentConvId,
    });
  } catch (error) {
    logger.error("Chat POST error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
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
    logger.error("Chat GET error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
