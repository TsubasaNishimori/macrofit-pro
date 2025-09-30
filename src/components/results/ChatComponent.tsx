'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatPersona, ChatMessage, ChatSession, CHAT_PERSONAS } from '@/lib/chat-types';
import Image from 'next/image';
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
              <div className="flex items-center space-x-4">
                {persona.avatarPath ? (
                  <Image
                    src={persona.avatarPath}
                    alt={persona.name}
                    width={48}
                    height={48}
                    className="rounded-full ring-2 ring-white/40 object-cover bg-white"
                  />
                ) : (
                  <span className="text-3xl">{persona.emoji}</span>
                )}
                <div className={persona.id === 'trainer' ? 'text-white' : 'text-pink-800'}>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {persona.name}
                  </h3>
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
    <div className="rounded-xl shadow-lg overflow-hidden border border-brand-navy-100 bg-brand-navy-50/60 backdrop-blur-sm">
      {/* ヘッダー */}
  <div className={`p-4 text-white ${currentPersona?.id === 'trainer' ? 'bg-red-600' : 'bg-pink-400'} relative`}>        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl ring-2 ring-white/30">
              {currentPersona?.emoji}
            </div>
            <div>
              <h3 className="font-bold tracking-wide drop-shadow-sm">{currentPersona?.name}</h3>
              <p className="text-xs opacity-80">オンライン</p>
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
      <div className="h-96 overflow-y-auto p-4 space-y-1 bg-gradient-to-br from-white/90 via-white/80 to-brand-navy-50/70">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant avatar */}
              {!isUser && (
                <div className="mr-3 flex-shrink-0">
                  {currentPersona?.avatarPath ? (
                    <Image
                      src={currentPersona.avatarPath}
                      alt={currentPersona.name}
                      width={40}
                      height={40}
                      className={`rounded-full object-cover ring-2 bg-white shadow-sm ${currentPersona.id === 'trainer' ? 'ring-red-100' : 'ring-pink-100'}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${currentPersona?.id === 'trainer' ? 'bg-red-600' : 'bg-pink-400'}`}>
                      {currentPersona?.emoji}
                    </div>
                  )}
                </div>
              )}
              <div className={`group max-w-xs lg:max-w-md px-3 py-2 shadow-md relative backdrop-blur-sm ring-1 ${
                isUser
                  ? 'bg-brand-navy-600/95 text-white rounded-l-2xl rounded-tr-2xl ring-brand-navy-700'
                  : `${currentPersona?.id === 'trainer' 
                      ? 'bg-white text-gray-900 ring-red-200 rounded-r-2xl rounded-tl-2xl' 
                      : 'bg-white text-gray-900 ring-pink-200 rounded-r-2xl rounded-tl-2xl'}`
              }`}> 
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <div className={`text-[10px] mt-1 tracking-wide flex items-center gap-1 ${
                  isUser ? 'text-white/60' : 'text-gray-400'
                }`}>
                  <span>{formatTime(message.timestamp)}</span>
                </div>
              </div>
              {/* User avatar placeholder (optional) */}
              {isUser && (
                <div className="ml-3 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-orange-500 text-white text-xs font-semibold ring-2 ring-brand-orange-200 shadow-sm">
                    YOU
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="mb-4 flex justify-start">
            <div className={`${currentPersona?.id === 'trainer' ? 'bg-red-500' : 'bg-pink-400'} text-white rounded-r-2xl rounded-tl-2xl px-4 py-2 shadow-md ring-1 ring-white/20`}>
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
      <div className="border-t border-brand-navy-100 p-4 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${currentPersona?.name}に相談してみましょう...`}
            className="flex-1 border border-brand-navy-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-brand-orange-400 focus:border-transparent shadow-sm bg-white/90"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            className="btn-accent disabled:opacity-50 disabled:cursor-not-allowed h-[46px] px-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-[11px] text-brand-navy-500 flex items-center gap-3">
          <span>Shift + Enter で改行 / Enter で送信</span>
          <span className="px-2 py-0.5 rounded bg-brand-navy-100 text-brand-navy-700">Beta</span>
        </div>
      </div>
    </div>
  );
}