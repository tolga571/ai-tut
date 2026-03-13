import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Rate limit: 30 messages per user per minute
    const userId = (session.user as { id?: string }).id ?? "";
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
    const user = session.user as { id?: string; targetLang?: string; nativeLang?: string };

    let currentConvId = conversationId;

    if (!currentConvId) {
      const conv = await prisma.conversation.create({
        data: { userId },
      });
      currentConvId = conv.id;
    } else {
      // Verify the conversation belongs to this user
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
      generationConfig: { responseMimeType: "application/json" },
    });

    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [
        {
          text:
            msg.role === "user"
              ? msg.content
              : JSON.stringify({ content: msg.content, translation: msg.translation }),
        },
      ],
    }));

    const chat = model.startChat({ history: chatHistory.slice(0, -1) });
    const aiResult = await chat.sendMessage(message);
    const aiResponseText = aiResult.response.text();

    let parsedResult: { content: string; translation: string };
    try {
      parsedResult = JSON.parse(aiResponseText);
    } catch {
      parsedResult = { content: aiResponseText, translation: "" };
    }

    const savedAiMsg = await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "ai",
        content: parsedResult.content,
        translation: parsedResult.translation || "",
      },
    });

    return NextResponse.json({ message: savedAiMsg, conversationId: currentConvId });
  } catch (error) {
    console.error("[CHAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
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
