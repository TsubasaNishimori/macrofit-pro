'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatPersona, ChatMessage, ChatSession, CHAT_PERSONAS } from '@/lib/chat-types';
import { getChatPromptConfig } from '@/lib/chat-prompts';
import { UserInfo } from '@/lib/types';

interface ChatComponentProps {
  userInfo?: UserInfo;
}

export default function ChatComponent({ userInfo }: ChatComponentProps) {
  const [selectedPersona, setSelectedPersona] = useState<ChatPersona | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // SessionStorageからチャット履歴を読み込み
  useEffect(() => {
    const savedSession = sessionStorage.getItem('chatSession');
    if (savedSession) {
      try {
        const session: ChatSession = JSON.parse(savedSession);
        setSelectedPersona(session.persona);
        setCurrentSession(session);
        setMessages(session.messages);
      } catch (error) {
        console.error('Failed to load chat session:', error);
      }
    }
  }, []);

  // メッセージが更新されたら最下部にスクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // SessionStorageにチャット履歴を保存
  const saveSession = (session: ChatSession) => {
    sessionStorage.setItem('chatSession', JSON.stringify(session));
  };

  const startNewChat = (persona: ChatPersona) => {
    const config = getChatPromptConfig(persona, userInfo);
    const initialMessage: ChatMessage = {
      id: Date.now().toString(),
      content: config.initialMessage,
      role: 'assistant',
      timestamp: new Date(),
      persona
    };

    const newSession: ChatSession = {
      id: Date.now().toString(),
      persona,
      messages: [initialMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSelectedPersona(persona);
    setCurrentSession(newSession);
    setMessages([initialMessage]);
    saveSession(newSession);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPersona || isLoading) return;

    setIsLoading(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageContent,
          persona: selectedPersona,
          chatHistory: messages,
          userInfo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const updatedMessages = result.data.updatedHistory;
        setMessages(updatedMessages);

        // セッションを更新
        if (currentSession) {
          const updatedSession: ChatSession = {
            ...currentSession,
            messages: updatedMessages,
            updatedAt: new Date()
          };
          setCurrentSession(updatedSession);
          saveSession(updatedSession);
        }
      } else {
        console.error('Chat API error:', result.error);
        alert('メッセージの送信に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('メッセージの送信中にエラーが発生しました');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setSelectedPersona(null);
    setCurrentSession(null);
    setMessages([]);
    setNewMessage('');
    sessionStorage.removeItem('chatSession');
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ペルソナ選択画面
  if (!selectedPersona) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">💬 相談相手を選んでください</h2>
        <div className="space-y-4">
          {CHAT_PERSONAS.map((persona) => (
            <button
              key={persona.id}
              onClick={() => startNewChat(persona.id)}
              className={`w-full p-4 border-2 rounded-lg text-left hover:shadow-md transition-all ${persona.color} hover:opacity-90`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{persona.emoji}</span>
                <div className={persona.id === 'trainer' ? 'text-white' : 'text-pink-800'}>
                  <h3 className="font-bold text-lg">{persona.name}</h3>
                  <p className="text-sm opacity-90">{persona.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentPersona = CHAT_PERSONAS.find(p => p.id === selectedPersona);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* ヘッダー */}
      <div className={`${currentPersona?.id === 'trainer' ? 'bg-red-500' : 'bg-pink-400'} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currentPersona?.emoji}</span>
            <div>
              <h3 className="font-bold">{currentPersona?.name}</h3>
              <p className="text-sm opacity-80">オンライン</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
            title="新しい会話を開始"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-50" style={{ backgroundColor: '#f5f5f5' }}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg' 
                : `${currentPersona?.id === 'trainer' ? 'bg-red-500' : 'bg-pink-400'} text-white rounded-r-lg rounded-tl-lg`
            } p-3 shadow-md`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-white opacity-70'
              }`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-4 flex justify-start">
            <div className={`${currentPersona?.id === 'trainer' ? 'bg-red-500' : 'bg-pink-400'} text-white rounded-r-lg rounded-tl-lg p-3 shadow-md`}>
              <div className="flex items-center space-x-1">
                <span>考え中</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t p-4 bg-white">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${currentPersona?.name}に相談してみましょう...`}
            className="flex-1 border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Shift + Enter で改行、Enter で送信
        </div>
      </div>
    </div>
  );
}