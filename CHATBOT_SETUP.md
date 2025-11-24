# AI Chatbot Setup Guide

This project includes an intelligent AI-powered chatbot that guides users through the LED display configuration workflow.

## Features

- **Step-by-step guidance** through the entire configuration process
- **Accurate recommendations** based on user inputs and system state
- **Proactive error detection** with real-time suggestions
- **Context-aware conversations** with memory across steps
- **User-friendly explanations** of technical issues
- **Smart assistant capabilities** (not just rule-based)

## AI Service Integration

The chatbot uses **Google Gemini API** with automatic fallback to rule-based responses.

### Free Tier Limitations

- Google Gemini API offers a free tier (60 requests/minute, 1.5M tokens/month)
- If API key is not provided or service is unavailable, the chatbot automatically falls back to intelligent rule-based responses
- Fallback mode maintains all core features but with predefined responses

### Setup Instructions

1. **Get a Google Gemini API Key** (Optional but Recommended):
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure Environment Variable**:
   - Create a `.env` file in the project root (if not exists)
   - Add your API key:
     ```
     VITE_GEMINI_API_KEY=your_api_key_here
     ```
   - **Note**: Without this key, the chatbot will work in fallback mode (still fully functional)

3. **Restart Development Server**:
   - Stop your development server (Ctrl+C)
   - Start it again: `npm run dev`
   - The chatbot will now use the AI service if the key is configured

## Usage

### Accessing the Chatbot

- The chatbot appears as a floating button (message icon) in the bottom-right corner
- Click the button to open/close the chat interface
- The chatbot is available on all pages (Landing, Wizard, Configurator)

### Using the Chatbot

1. **Ask Questions**: Type any question about the configuration process
   - "How do I set dimensions?"
   - "What pixel pitch should I choose?"
   - "Help me select a product"

2. **Get Step Guidance**: The chatbot knows which step you're on and provides relevant help
   - "What's the next step?"
   - "How do I complete this step?"

3. **Error Detection**: The chatbot automatically detects issues:
   - Missing dimensions
   - Environment/product mismatches
   - Invalid configurations
   - It will proactively alert you to issues

4. **Proactive Suggestions**: The chatbot suggests actions based on your current state
   - Suggests next steps
   - Recommends products
   - Points out missing information

## Architecture

### Components

1. **`src/services/aiChatbotService.ts`**: 
   - Core AI service logic
   - Gemini API integration
   - Fallback rule-based responses
   - Error detection algorithms

2. **`src/contexts/ChatbotContext.tsx`**:
   - Chatbot state management
   - Conversation history
   - Context tracking
   - Proactive suggestions

3. **`src/components/Chatbot.tsx`**:
   - Chatbot UI component
   - Message display
   - Input handling
   - Visual feedback

### Context Tracking

The chatbot automatically tracks:
- Current workflow stage (landing, wizard, configurator, quoting)
- Current step in wizard
- Selected product
- Display configuration (dimensions, environment, pixel pitch, etc.)
- User role (normal, sales, super_admin)
- Conversation history

## Customization

### Modifying System Prompt

Edit `generateSystemPrompt()` in `src/services/aiChatbotService.ts` to customize:
- Assistant personality
- Response style
- Guidance preferences

### Adding Rule-Based Responses

Edit `generateRuleBasedResponse()` in `src/services/aiChatbotService.ts` to add:
- New response patterns
- Domain-specific knowledge
- Custom fallback behaviors

### Error Detection

Edit `detectErrors()` in `src/services/aiChatbotService.ts` to add:
- New validation rules
- Custom error detection logic
- Issue-specific messages

## Troubleshooting

### Chatbot Not Appearing

- Check that `ChatbotProvider` is wrapping your app in `main.tsx`
- Verify the `Chatbot` component is included in `App.tsx`
- Check browser console for errors

### API Not Working

- Verify your API key in `.env` file
- Check network connectivity
- Review browser console for API errors
- The chatbot will automatically use fallback mode if API fails

### Context Not Updating

- Ensure workflow stage is being set correctly
- Check that product selection syncs with chatbot context
- Verify wizard steps are tracked properly

## Performance

- Conversation history is limited to last 10 messages for API calls
- Full history (up to 50 messages) is stored in localStorage
- API responses are cached for 5 minutes (if implemented)
- Fallback responses are instant (no API delay)

## Security

- API keys should be stored in `.env` file (not committed to git)
- `.env` is already in `.gitignore`
- Never expose API keys in frontend code
- Fallback mode works without API key (no external calls)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API key configuration
3. Test in fallback mode (remove API key)
4. Review this documentation

The chatbot is designed to work gracefully even without an API key, ensuring users always have assistance available.
