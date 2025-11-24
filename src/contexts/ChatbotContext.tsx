/**
 * Chatbot Context
 * 
 * Manages chatbot state, conversation history, and context tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ChatMessage, ChatbotContext as ChatbotContextType, generateChatbotResponse, getProactiveSuggestions, generateAutoSuggestion } from '../services/aiChatbotService';
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
const LAST_SUGGESTIONS_KEY = 'led_display_chatbot_last_suggestions';
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

  // Track last values to prevent duplicate messages (persist in localStorage)
  const loadLastSuggestions = (): {
    environment: 'Indoor' | 'Outdoor' | null;
    viewingDistance: string | null;
    size: { width: number; height: number } | null;
    pixelPitch: number | null;
    productId: string | null;
  } => {
    try {
      const stored = localStorage.getItem(LAST_SUGGESTIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading last suggestions:', error);
    }
    return {
      environment: null,
      viewingDistance: null,
      size: null,
      pixelPitch: null,
      productId: null,
    };
  };

  const saveLastSuggestions = (values: {
    environment: 'Indoor' | 'Outdoor' | null;
    viewingDistance: string | null;
    size: { width: number; height: number } | null;
    pixelPitch: number | null;
    productId: string | null;
  }) => {
    try {
      localStorage.setItem(LAST_SUGGESTIONS_KEY, JSON.stringify(values));
    } catch (error) {
      console.error('Error saving last suggestions:', error);
    }
  };

  const lastValuesRef = useRef(loadLastSuggestions());

  // Track if initial values have been set (to prevent auto-suggestions on mount)
  const isInitialMountRef = useRef(true);

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

  // Initialize last values on mount (to prevent initial triggers)
  useEffect(() => {
    if (isInitialMountRef.current) {
      // Load from localStorage or use current config
      const stored = loadLastSuggestions();
      lastValuesRef.current = {
        environment: stored.environment || config.environment,
        viewingDistance: stored.viewingDistance || config.viewingDistance,
        size: stored.size || (config.width > 0 && config.height > 0 ? { width: config.width, height: config.height } : null),
        pixelPitch: stored.pixelPitch || config.pixelPitch,
        productId: stored.productId || selectedProduct?.id || null,
      };
      isInitialMountRef.current = false;
    }
  }, []); // Only run once on mount

  // Auto-suggestions on config changes (works even when chat is closed, but only shows when opened)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) return;

    const lastValues = lastValuesRef.current;
    let changeType: 'dimensions' | 'environment' | 'viewingDistance' | 'pixelPitch' | 'product' | null = null;
    let hasChanged = false;

    // Check dimensions change
    const currentSize = { width: config.width, height: config.height };
    if (
      !lastValues.size ||
      Math.abs(lastValues.size.width - currentSize.width) > 0.1 ||
      Math.abs(lastValues.size.height - currentSize.height) > 0.1
    ) {
      if (currentSize.width > 0 && currentSize.height > 0) {
        changeType = 'dimensions';
        hasChanged = true;
        lastValues.size = currentSize;
      }
    }

    // Check environment change
    if (lastValues.environment !== config.environment && config.environment) {
      changeType = 'environment';
      hasChanged = true;
      lastValues.environment = config.environment;
    }

    // Check viewing distance change
    if (lastValues.viewingDistance !== config.viewingDistance && config.viewingDistance) {
      changeType = 'viewingDistance';
      hasChanged = true;
      lastValues.viewingDistance = config.viewingDistance;
    }

    // Check pixel pitch change
    if (lastValues.pixelPitch !== config.pixelPitch && config.pixelPitch !== null) {
      if (lastValues.pixelPitch === null || Math.abs(lastValues.pixelPitch - config.pixelPitch) > 0.01) {
        changeType = 'pixelPitch';
        hasChanged = true;
        lastValues.pixelPitch = config.pixelPitch;
      }
    }

    // Check product change
    const currentProductId = selectedProduct?.id || null;
    if (lastValues.productId !== currentProductId && currentProductId) {
      changeType = 'product';
      hasChanged = true;
      lastValues.productId = currentProductId;
    }

    // Save updated values to localStorage
    if (hasChanged) {
      saveLastSuggestions(lastValuesRef.current);
    }

    // Generate and send auto-suggestion if something changed AND chat is open
    if (hasChanged && changeType && isOpen && !isLoading) {
      const chatbotContext: ChatbotContextType = {
        config,
        selectedProduct,
        currentStep,
        workflowStage,
        userRole,
        conversationHistory: messages,
      };

      const suggestion = generateAutoSuggestion(changeType, chatbotContext);
      if (suggestion) {
        // Small delay to avoid overwhelming the user
        const timer = setTimeout(() => {
          const autoMessage: ChatMessage = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: suggestion,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, autoMessage]);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [config.width, config.height, config.environment, config.viewingDistance, config.pixelPitch, selectedProduct?.id, isOpen, isLoading, messages, currentStep, workflowStage, userRole, selectedProduct]);

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
    // Reset last suggestions when clearing conversation
    lastValuesRef.current = {
      environment: null,
      viewingDistance: null,
      size: null,
      pixelPitch: null,
      productId: null,
    };
    saveLastSuggestions(lastValuesRef.current);
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
