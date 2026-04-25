import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  Trash2, 
  MessageSquare, 
  Bot,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

const API_BASE_URL = 'http://localhost:3000/api/chat';
const AUTH_TOKEN_KEY = 'calai_token';
const TEMP_CONVERSATION_PREFIX = 'temp-';

const getAuthHeaders = (includeJson = false) => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatConversationTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffHours = Math.floor(diff / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const isTemporaryConversationId = (value: string | null) =>
  Boolean(value && value.startsWith(TEMP_CONVERSATION_PREFIX));

export function Chatbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [typingChatId, setTypingChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'nutrition' | 'assistant'>('nutrition');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find(c => c.id === activeChatId);
  const isTyping = Boolean(activeChatId && typingChatId && activeChatId === typingChatId);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const mapMessages = (rows: Array<{ messageId: number; message: string; sender: 'user' | 'ai'; createdAt: string }>): Message[] =>
    rows.map(row => ({
      id: String(row.messageId),
      text: row.message,
      sender: row.sender,
      timestamp: formatTime(row.createdAt),
    }));

  const loadSessions = async (preferredSessionId?: string) => {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to load chat sessions');
    }

    const sessions = (result.data ?? []) as Array<{
      sessionId: number;
      lastMessage: string;
      startedAt: string;
    }>;

    const mappedSessions: Conversation[] = sessions.map(session => ({
      id: String(session.sessionId),
      title: session.lastMessage === 'No messages yet' ? 'New Conversation' : session.lastMessage.slice(0, 30),
      lastMessage: session.lastMessage,
      timestamp: formatConversationTime(session.startedAt),
      messages: [],
    }));

    setConversations(mappedSessions);

    const nextActiveId = preferredSessionId ?? mappedSessions[0]?.id ?? null;
    setActiveChatId(nextActiveId);
  };

  const loadMessages = async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to load chat messages');
    }

    const mapped = mapMessages(result.data ?? []);
    setConversations(prev =>
      prev.map(conversation =>
        conversation.id === sessionId
          ? {
              ...conversation,
              messages: mapped,
              lastMessage: mapped[mapped.length - 1]?.text ?? conversation.lastMessage,
            }
          : conversation
      )
    );
  };

  useEffect(() => {
    loadSessions().catch(err => setError(err instanceof Error ? err.message : 'Failed to load chats'));
  }, []);

  useEffect(() => {
    if (!activeChatId || isTemporaryConversationId(activeChatId)) return;
    loadMessages(activeChatId).catch(err => setError(err instanceof Error ? err.message : 'Failed to load messages'));
  }, [activeChatId]);

  const createNewChat = () => {
    setActiveChatId(null);
    setInputText('');
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete chat');
      }
      const nextSessions = conversations.filter(c => c.id !== id);
      setConversations(nextSessions);
      if (activeChatId === id) {
        setActiveChatId(nextSessions[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const currentMessage = inputText.trim();
    const optimisticMessage: Message = {
      id: `temp-user-${Date.now()}`,
      text: currentMessage,
      sender: 'user',
      timestamp: formatTime(new Date().toISOString()),
    };
    const optimisticChatId =
      activeChatId && !isTemporaryConversationId(activeChatId)
        ? activeChatId
        : `${TEMP_CONVERSATION_PREFIX}${Date.now()}`;

    setInputText('');
    setTypingChatId(optimisticChatId);
    setError('');
    setActiveChatId(optimisticChatId);
    setConversations(prev => {
      const existingConversation = prev.find(conversation => conversation.id === optimisticChatId);

      if (existingConversation) {
        const updatedConversation: Conversation = {
          ...existingConversation,
          title: existingConversation.title === 'New Conversation'
            ? currentMessage.slice(0, 30)
            : existingConversation.title,
          lastMessage: currentMessage,
          timestamp: 'Just now',
          messages: [...existingConversation.messages, optimisticMessage],
        };

        return [
          updatedConversation,
          ...prev.filter(conversation => conversation.id !== optimisticChatId),
        ];
      }

      const newConversation: Conversation = {
        id: optimisticChatId,
        title: currentMessage.slice(0, 30),
        lastMessage: currentMessage,
        timestamp: 'Just now',
        messages: [optimisticMessage],
      };

      return [newConversation, ...prev];
    });

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          message: currentMessage,
          sessionId:
            activeChatId && !isTemporaryConversationId(activeChatId)
              ? Number(activeChatId)
              : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }

      const sessionId = String(result.data.sessionId);
      const mappedMessages = mapMessages(result.data.messages ?? []);

      setConversations(prev => {
        const fallbackConversation = prev.find(conversation => conversation.id === optimisticChatId);
        const nextConversation: Conversation = {
          id: sessionId,
          title: mappedMessages[0]?.text?.slice(0, 30) || fallbackConversation?.title || 'New Conversation',
          lastMessage: mappedMessages[mappedMessages.length - 1]?.text || fallbackConversation?.lastMessage || currentMessage,
          timestamp: 'Just now',
          messages: mappedMessages,
        };

        return [
          nextConversation,
          ...prev.filter(conversation => conversation.id !== optimisticChatId && conversation.id !== sessionId),
        ];
      });
      setActiveChatId(sessionId);
      setTypingChatId(null);
    } catch (error) {
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === optimisticChatId
            ? {
                ...conversation,
                messages: conversation.messages.filter(message => message.id !== optimisticMessage.id),
                lastMessage:
                  conversation.lastMessage === currentMessage
                    ? conversation.messages[conversation.messages.length - 2]?.text ?? 'No messages yet'
                    : conversation.lastMessage,
              }
            : conversation
        ).filter(conversation => conversation.messages.length > 0)
      );
      if (optimisticChatId === activeChatId || isTemporaryConversationId(optimisticChatId)) {
        setActiveChatId(prev => (prev === optimisticChatId ? null : prev));
      }
      setTypingChatId(null);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const quickActions = [
    "How many calories in an apple?",
    "Plan my lunch",
    "Recalculate macros"
  ];

  return (
    <div className="flex h-screen bg-bg-dark ml-64 overflow-hidden">
      {/* Recent Chats Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-surface-dark/30">
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight">Recent Chats</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={createNewChat}
            className="w-10 h-10 rounded-xl bg-surface-lighter border border-white/5 flex items-center justify-center text-brand-orange hover:bg-white/5 transition-colors"
          >
            <Plus size={20} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {conversations.map((chat) => (
            <motion.div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all relative group ${
                activeChatId === chat.id 
                  ? 'bg-surface-lighter border border-white/10' 
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                {activeChatId === chat.id && (
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Current</span>
                )}
                <span className="text-[10px] text-text-muted font-medium ml-auto">{chat.timestamp}</span>
              </div>
              <h3 className={`font-bold text-sm mb-1 truncate pr-6 ${activeChatId === chat.id ? 'text-white' : 'text-text-muted'}`}>
                {chat.title}
              </h3>
              <p className="text-xs text-text-muted truncate opacity-60">
                {chat.lastMessage}
              </p>
              
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                className="absolute top-4 right-4 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-10 text-text-muted">
              <MessageSquare size={32} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header Tabs */}
        <div className="p-6 border-b border-white/5 flex items-center gap-8">
          <button 
            onClick={() => setActiveTab('nutrition')}
            className={`text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === 'nutrition' ? 'text-brand-orange' : 'text-text-muted hover:text-white'
            }`}
          >
            Nutrition AI
          </button>
          <button 
            onClick={() => setActiveTab('assistant')}
            className={`text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === 'assistant' ? 'text-brand-orange' : 'text-text-muted hover:text-white'
            }`}
          >
            Assistant
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {!activeChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-6">
                <Bot size={40} />
              </div>
              <h2 className="text-2xl font-black mb-4">Welcome to CalAI Assistant</h2>
              <p className="text-text-muted mb-8">Start a new conversation to get personalized nutrition advice, meal plans, and calorie tracking help.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewChat}
                className="px-8 py-4 bg-brand-orange text-bg-dark font-black rounded-2xl shadow-lg shadow-brand-orange/20"
              >
                Start New Chat
              </motion.button>
            </div>
          ) : (
            <>
              {activeChat?.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'ai' ? 'bg-brand-orange/20 text-brand-orange' : 'bg-surface-lighter text-white'
                  }`}>
                    {msg.sender === 'ai' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className={`max-w-[70%] space-y-2 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        {msg.sender === 'ai' ? 'CalAI Nutrition Assistant' : 'You'}
                      </span>
                      <span className="text-[10px] text-text-muted opacity-50">{msg.timestamp}</span>
                    </div>
                    <div className={`p-6 rounded-[2rem] text-sm leading-relaxed ${
                      msg.sender === 'ai' 
                        ? 'bg-surface-dark border border-white/5 text-white rounded-tl-none' 
                        : 'bg-brand-orange text-bg-dark font-medium rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div className="bg-surface-dark border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 pt-0">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setInputText(action)}
                  className="px-4 py-2 bg-surface-dark border border-white/5 rounded-full text-xs font-bold text-text-muted hover:text-white hover:border-brand-orange/30 transition-all whitespace-nowrap"
                >
                  {action}
                </motion.button>
              ))}
            </div>

            {/* Input Box */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors">
                  <Plus size={20} />
                </button>
              </div>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask CalAI anything..."
                className="w-full bg-surface-dark border border-white/10 rounded-2xl py-6 pl-16 pr-16 text-sm focus:outline-none focus:border-brand-orange/50 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    inputText.trim() ? 'bg-brand-orange text-bg-dark' : 'bg-white/5 text-text-muted'
                  }`}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
