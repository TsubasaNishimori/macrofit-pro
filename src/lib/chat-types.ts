// チャット機能用の型定義

export type ChatPersona = 'trainer' | 'grandma';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  persona?: ChatPersona;
}

export interface ChatSession {
  id: string;
  persona: ChatPersona;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatPersonaInfo {
  id: ChatPersona;
  name: string;
  emoji: string;
  description: string;
  color: string;
  avatarPath?: string; // 画像アバター（public/avatars 配下）
}

export const CHAT_PERSONAS: ChatPersonaInfo[] = [
  {
    id: 'trainer',
    name: 'トレーナー',
    emoji: '💪',
    description: '厳しく指導してくれるスパルタトレーナー',
    color: 'bg-red-500',
    avatarPath: '/avatars/trainer.png'
  },
  {
    id: 'grandma',
    name: 'おばあちゃん',
    emoji: '👵',
    description: '優しく見守ってくれる心温かいおばあちゃん',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    avatarPath: '/avatars/grandma.png'
  }
];