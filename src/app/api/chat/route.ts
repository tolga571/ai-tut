import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Wait, @google/genai might export differently. Let's use the standard fetch or default SDK if unsure.
// But we'll try GoogleGenAI and fallback if there's type issues.
// For safety, let's use the REST API approach with fetch to avoid SDK version issues:

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { message, conversationId } = body;

    let currentConvId = conversationId;
    
    // Save User message
    if (!currentConvId) {
      // Create new conversation
      const conv = await prisma.conversation.create({
        data: { userId: user.id }
      });
      currentConvId = conv.id;
    }

    await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "user",
        content: message,
      }
    });

    // Fetch conversation history
    const history = await prisma.message.findMany({
      where: { conversationId: currentConvId },
      orderBy: { createdAt: "asc" },
      take: 20
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const chatHistory = history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.role === "user" ? msg.content : JSON.stringify({ content: msg.content, translation: msg.translation }) }]
    }));

    const chat = model.startChat({
      history: chatHistory.slice(0, -1),
    });

    const result = await chat.sendMessage(message);
    const aiResponseText = result.response.text();
    
    let parsedResult;
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
      }
    });

    return NextResponse.json({
      message: savedAiMsg,
      conversationId: currentConvId
    });
    
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

    // Get the most recent conversation and messages for MVP
    const conv = await prisma.conversation.findFirst({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return NextResponse.json(conv || { messages: [] });
  } catch (error) {
    console.error("[CHAT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
