import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  Trash2, 
  MessageSquare, 
  MoreVertical,
  Bot,
  User,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

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

export function Chatbox() {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('calai_chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const saved = localStorage.getItem('calai_active_chat_id');
    return saved || null;
  });
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'nutrition' | 'assistant'>('nutrition');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find(c => c.id === activeChatId);

  useEffect(() => {
    localStorage.setItem('calai_chats', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('calai_active_chat_id', activeChatId);
    }
  }, [activeChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = () => {
    const newChat: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Conversation',
      lastMessage: 'No messages yet',
      timestamp: 'Just now',
      messages: []
    };
    setConversations(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChatId) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedConversations = conversations.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          messages: [...c.messages, userMessage],
          lastMessage: inputText,
          timestamp: 'Just now'
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    setInputText('');
    setIsTyping(true);

    try {
      if (!geminiApiKey) {
        throw new Error('Missing VITE_GEMINI_API_KEY');
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: inputText }] }],
        config: {
          systemInstruction: "You are CalAI Nutrition Assistant. You help users with their diet, calorie tracking, and meal planning. Be concise, helpful, and encouraging. Use markdown for formatting if needed.",
        }
      });

      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text: response.text || "I'm sorry, I couldn't process that.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          // Update title if it's the first message
          const newTitle = c.messages.length === 1 ? inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '') : c.title;
          return {
            ...c,
            title: newTitle,
            messages: [...c.messages, aiMessage],
            lastMessage: aiMessage.text,
            timestamp: 'Just now'
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error calling Gemini:', error);
      const fallbackMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text: "Chat AI is not configured yet. Add VITE_GEMINI_API_KEY to frontend/.env to enable this feature.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, fallbackMessage],
            lastMessage: fallbackMessage.text,
            timestamp: 'Just now'
          };
        }
        return c;
      }));
    } finally {
      setIsTyping(false);
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
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask CalAI anything..."
                className="w-full bg-surface-dark border border-white/10 rounded-2xl py-6 pl-16 pr-16 text-sm focus:outline-none focus:border-brand-orange/50 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || !activeChatId}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    inputText.trim() && activeChatId ? 'bg-brand-orange text-bg-dark' : 'bg-white/5 text-text-muted'
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
