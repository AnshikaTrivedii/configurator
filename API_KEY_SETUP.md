# Chatbot API Key Setup Guide

## Which API Key to Use?

The chatbot uses **Google Gemini API** (formerly known as Google Bard API).

## Step-by-Step Setup

### Option 1: Using Google Gemini API (Recommended - Free Tier Available)

1. **Get Your API Key**:
   - Visit: [Google AI Studio - API Keys](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key" button
   - Select or create a Google Cloud project
   - Copy the generated API key (it looks like: `AIza...`)

2. **Free Tier Limits**:
   - ✅ **60 requests per minute**
   - ✅ **1.5 million tokens per month** (free tier)
   - ✅ More than enough for development and moderate usage

3. **Configure in Your Project**:
   - Create a `.env` file in the project root (same level as `package.json`)
   - Add this line:
     ```
     VITE_GEMINI_API_KEY=AIza...your_api_key_here
     ```
   - **Important**: Replace `AIza...your_api_key_here` with your actual API key
   - Save the file

4. **Restart Your Development Server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then start again
   npm run dev
   ```

### Option 2: No API Key (Fallback Mode)

- **You don't need an API key to use the chatbot!**
- Without an API key, the chatbot works in **fallback mode**
- Fallback mode uses intelligent rule-based responses
- All features work, but responses are predefined instead of AI-generated
- This is perfect for testing and development

## How to Verify It's Working

1. **With API Key**:
   - Open the chatbot (floating button in bottom-right)
   - Ask a complex question like: "What's the best pixel pitch for a 10 meter viewing distance?"
   - You should get an intelligent, contextual AI response

2. **In Fallback Mode** (no API key):
   - The chatbot still responds to questions
   - Responses follow predefined patterns
   - Error detection and workflow guidance still work
   - All core features are available

## Security Notes

- ⚠️ **Never commit your `.env` file to Git** (it's already in `.gitignore`)
- ⚠️ **Never share your API key publicly**
- ✅ The `.env` file is automatically ignored by Git
- ✅ API key stays on your local machine only

## Troubleshooting

### API Key Not Working?

1. Check that `.env` file is in the project root
2. Verify the variable name is exactly: `VITE_GEMINI_API_KEY`
3. Make sure there are no spaces around the `=` sign
4. Restart the development server after adding/changing the key
5. Check browser console for any API errors

### Want to Use a Different AI Service?

The chatbot is designed to work with Google Gemini API. To use a different service (like OpenAI, Anthropic Claude, etc.), you would need to modify `src/services/aiChatbotService.ts` in the `callGeminiAPI` function.

## Example .env File

Create a file named `.env` in your project root with:

```
VITE_GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note**: This is just an example. Use your actual API key from Google AI Studio.

## Quick Links

- 📘 [Google AI Studio](https://makersuite.google.com/app/apikey) - Get your API key
- 📚 [Gemini API Documentation](https://ai.google.dev/docs) - API reference
- 💡 [CHATBOT_SETUP.md](./CHATBOT_SETUP.md) - Full chatbot documentation

## Summary

- **API Service**: Google Gemini API
- **Free Tier**: Yes (60 req/min, 1.5M tokens/month)
- **Required**: No (works in fallback mode without key)
- **Location**: `.env` file in project root
- **Variable Name**: `VITE_GEMINI_API_KEY`
