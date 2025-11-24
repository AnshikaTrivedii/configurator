/**
 * Chatbot Context
 * 
 * Manages chatbot state, conversation history, and context tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ChatMessage, ChatbotContext as ChatbotContextType, generateChatbotResponse, getProactiveSuggestions } from '../services/aiChatbotService';
import { DisplayConfigState, useDisplayConfig } from './DisplayConfigContext';
import { Product } from '../types';

interface ChatbotContextInterface {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  toggleChat: () => void;
  clearConversation: () => void;
  proactiveSuggestions: string[];
  selectedProduct?: Product | null;
  workflowStage?: 'landing' | 'wizard' | 'configurator' | 'quoting';
  currentStep?: string;
  setSelectedProduct: (product: Product | null) => void;
  setWorkflowStage: (stage: 'landing' | 'wizard' | 'configurator' | 'quoting') => void;
  setCurrentStep: (step: string) => void;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin';
  setUserRole: (role: 'normal' | 'sales' | 'super' | 'super_admin') => void;
}

const ChatbotContext = createContext<ChatbotContextInterface | undefined>(undefined);

const STORAGE_KEY = 'led_display_chatbot_history';
const MAX_STORED_MESSAGES = 50;

export const ChatbotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { config } = useDisplayConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [workflowStage, setWorkflowStage] = useState<'landing' | 'wizard' | 'configurator' | 'quoting'>('landing');
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [userRole, setUserRole] = useState<'normal' | 'sales' | 'super' | 'super_admin'>('normal');

  // Load conversation history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedMessages = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chatbot history:', error);
    }
  }, []);

  // Save conversation history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const toStore = {
          messages: messages.slice(-MAX_STORED_MESSAGES).map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving chatbot history:', error);
      }
    }
  }, [messages]);

  // Get proactive suggestions
  const proactiveSuggestions = getProactiveSuggestions({
    config,
    selectedProduct,
    currentStep,
    workflowStage,
    userRole,
    conversationHistory: messages,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build context for AI
      const chatbotContext: ChatbotContextType = {
        config,
        selectedProduct,
        currentStep,
        workflowStage,
        userRole,
        conversationHistory: [...messages, userMessage],
      };

      const response = await generateChatbotResponse(content, chatbotContext);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or check your connection.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [config, selectedProduct, currentStep, workflowStage, userRole, messages, isLoading]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    
    // Auto-send welcome message if opening for first time with no messages
    if (!isOpen && messages.length === 0) {
      setTimeout(() => {
        const welcomeMessage = proactiveSuggestions.length > 0
          ? 'Hello! How can I help you configure your LED display today?'
          : 'Hello! I\'m your LED Display Configuration Assistant. What would you like to know?';
        
        const welcomeMsg: ChatMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
          metadata: {
            suggestedActions: proactiveSuggestions.slice(0, 3),
          },
        };
        setMessages([welcomeMsg]);
      }, 100);
    }
  }, [isOpen, messages.length, proactiveSuggestions]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        sendMessage,
        toggleChat,
        clearConversation,
        proactiveSuggestions,
        selectedProduct,
        workflowStage,
        currentStep,
        setSelectedProduct,
        setWorkflowStage,
        setCurrentStep,
        userRole,
        setUserRole,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = (): ChatbotContextInterface => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};
