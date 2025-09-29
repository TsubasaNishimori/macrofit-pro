import { NextRequest, NextResponse } from 'next/server';
import { MacroFitAzureOpenAIClient } from '@/lib/azure-openai-client';
import { ChatPersona, ChatMessage } from '@/lib/chat-types';
import { formatMessagesForAPI } from '@/lib/chat-prompts';
import { UserInfo } from '@/lib/types';

interface ChatRequest {
  message: string;
  persona: ChatPersona;
  chatHistory: ChatMessage[];
  userInfo?: UserInfo;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, persona, chatHistory, userInfo } = body;

    if (!message?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'メッセージが空です'
      }, { status: 400 });
    }

    if (!persona || !['trainer', 'grandma'].includes(persona)) {
      return NextResponse.json({
        success: false,
        error: '無効なペルソナです'
      }, { status: 400 });
    }

    // Azure OpenAI クライアント初期化
    const client = new MacroFitAzureOpenAIClient();

    // 新しいユーザーメッセージを履歴に追加
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
      persona
    };

    const updatedHistory = [...chatHistory, newUserMessage];

    // API用のメッセージ形式に変換
    const apiMessages = formatMessagesForAPI(updatedHistory, persona, userInfo);

    console.log(`🤖 ${persona === 'trainer' ? 'トレーナー' : 'おばあちゃん'}チャット開始...`);

    // Azure OpenAI APIに送信
    const response = await client.generateChatCompletion(apiMessages, {
      temperature: persona === 'trainer' ? 0.3 : 0.7, // トレーナーはより一貫性、おばあちゃんはより創造性
      maxTokens: 500
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('AI応答が空です');
    }

    // AIの応答メッセージを作成
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: aiResponse.trim(),
      role: 'assistant',
      timestamp: new Date(),
      persona
    };

    console.log(`✅ ${persona === 'trainer' ? 'トレーナー' : 'おばあちゃん'}応答完了`);

    return NextResponse.json({
      success: true,
      data: {
        message: aiMessage,
        updatedHistory: [...updatedHistory, aiMessage]
      }
    });

  } catch (error) {
    console.error('チャットAPI エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'チャット機能でエラーが発生しました。しばらく待ってから再度お試しください。'
    }, { status: 500 });
  }
}