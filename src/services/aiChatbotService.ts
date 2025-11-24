/**
 * AI Chatbot Service
 * 
 * Provides intelligent AI-powered chatbot capabilities using Google Gemini API
 * with fallback to rule-based responses.
 */

import { DisplayConfigState } from '../contexts/DisplayConfigContext';
import { Product } from '../types';
import { products } from '../data/products';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedActions?: string[];
    detectedErrors?: string[];
    workflowStep?: string;
  };
}

export interface ChatbotContext {
  config: DisplayConfigState;
  selectedProduct?: Product | null;
  currentStep?: string;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin';
  workflowStage?: 'landing' | 'wizard' | 'configurator' | 'quoting';
  conversationHistory: ChatMessage[];
}

// Check if Gemini API key is available (user can add their own)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Rate limiting and caching
const requestCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context

/**
 * Generate system prompt with current context
 */
function generateSystemPrompt(context: ChatbotContext): string {
  const { config, selectedProduct, workflowStage, currentStep } = context;
  
  let prompt = `You are an intelligent AI assistant for an LED Display Configurator application. Your role is to:

1. Guide users step-by-step through the entire LED display configuration workflow
2. Provide highly accurate recommendations based on user inputs and current system state
3. Proactively detect errors, misconfigurations, or incorrect user actions and suggest clear solutions
4. Maintain conversational memory and context awareness
5. Explain technical issues in simple, user-friendly language

Current System State:
- Workflow Stage: ${workflowStage || 'unknown'}
- Current Step: ${currentStep || 'not specified'}
- Display Dimensions: ${config.width}mm x ${config.height}mm (${config.unit})
- Environment: ${config.environment || 'not selected'}
- Viewing Distance: ${config.viewingDistance || 'not specified'} ${config.viewingDistanceUnit}
- Pixel Pitch: ${config.pixelPitch || 'not selected'}mm
- Selected Product: ${selectedProduct?.name || 'none'}
- Entry Mode: ${config.entryMode || 'not specified'}

Workflow Steps:
1. Landing Page - User chooses between guided wizard or direct product selection
2. Configuration Wizard (if guided):
   - Step 1: Enter display dimensions (width, height, unit)
   - Step 2: Set viewing distance
   - Step 3: Choose environment (Indoor/Outdoor)
   - Step 4: Select pixel pitch
   - Step 5: Choose product
3. Display Configurator:
   - Adjust dimensions and aspect ratios
   - Select products
   - Configure cabinet grid
   - View preview
   - Configure data and power wiring
   - Generate quote
4. Quote Generation - Fill user info and generate quotation

Available Products (key examples):
${products.filter(p => p.enabled !== false).slice(0, 10).map(p => 
  `- ${p.name}: ${p.pixelPitch}mm pitch, ${p.environment}, ${p.brightness} cd/m² brightness`
).join('\n')}

Common Issues to Detect:
- Missing dimensions or invalid aspect ratios
- Mismatch between viewing distance and pixel pitch
- Environment/product mismatch (e.g., indoor product for outdoor use)
- Unrealistic dimensions (too small or too large)
- Missing product selection when required
- Incomplete configuration when generating quotes

Guidelines:
- Be friendly, helpful, and proactive
- Detect issues before they cause problems
- Provide step-by-step guidance with SPECIFIC actions the user should take
- Use simple, clear language for technical explanations
- Give concrete examples and recommendations based on current state
- Always suggest the NEXT SPECIFIC ACTION the user should take
- Maintain context from previous messages
- Be concise but thorough - don't overwhelm with information
- If user is on a specific step, focus on that step first
- Provide actionable buttons/suggestions when possible

Response Style:
- Start with addressing the user's immediate question
- Then provide context-specific guidance
- End with a clear next step or question to help move forward
- If errors are detected, mention them immediately with solutions

Respond naturally and helpfully. Be specific about what the user should do next based on their current state.`;

  return prompt;
}

/**
 * Detect errors and misconfigurations in current state
 */
export function detectErrors(context: ChatbotContext): string[] {
  const errors: string[] = [];
  const { config, selectedProduct } = context;

  // Check for missing dimensions
  if (config.width <= 0 || config.height <= 0) {
    errors.push('Display dimensions are not set. Please enter valid width and height values.');
  }

  // Check for unrealistic dimensions
  if (config.width > 0 && config.height > 0) {
    const areaM2 = (config.width * config.height) / 1_000_000;
    if (areaM2 < 0.01) {
      errors.push('Display size is very small. Please verify your dimensions.');
    }
    if (areaM2 > 1000) {
      errors.push('Display size seems very large. Please verify your dimensions.');
    }
  }

  // Check environment selection
  if (context.workflowStage === 'wizard' && !config.environment) {
    errors.push('Environment (Indoor/Outdoor) is not selected. This is required for product recommendations.');
  }

  // Check product-environment mismatch
  if (selectedProduct && config.environment) {
    const productEnv = selectedProduct.environment?.toLowerCase();
    const configEnv = config.environment.toLowerCase();
    if (productEnv && !productEnv.includes(configEnv) && !configEnv.includes(productEnv)) {
      errors.push(`The selected product "${selectedProduct.name}" is designed for ${selectedProduct.environment} environment, but you selected ${config.environment}. Please verify your selection.`);
    }
  }

  // Check viewing distance and pixel pitch match
  if (config.viewingDistance && config.pixelPitch && selectedProduct) {
    const viewingDistanceM = parseFloat(config.viewingDistance);
    if (!isNaN(viewingDistanceM)) {
      const minViewingDistance = config.pixelPitch / 1000 * 1000; // Rough estimate
      if (viewingDistanceM < minViewingDistance) {
        errors.push(`Viewing distance (${config.viewingDistance}m) may be too close for ${config.pixelPitch}mm pixel pitch. Consider increasing viewing distance or using a finer pixel pitch.`);
      }
    }
  }

  return errors;
}

/**
 * Call Gemini API to generate AI response
 */
async function callGeminiAPI(
  userMessage: string,
  context: ChatbotContext
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    return null; // No API key, fall back to rule-based
  }

  try {
    // Prepare conversation history (last few messages)
    const recentHistory = context.conversationHistory
      .slice(-MAX_CONVERSATION_HISTORY)
      .filter(msg => msg.role !== 'system');

    const systemPrompt = generateSystemPrompt(context);
    
    // Build conversation history for Gemini API
    // Format: array of { role: 'user' | 'model', parts: [{ text: string }] }
    const conversationParts: any[] = [];
    
    // Add system prompt context to the first user message
    let firstUserMessage = true;
    
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        // Include system prompt with the first user message
        const content = firstUserMessage 
          ? `${systemPrompt}\n\nUser: ${msg.content}`
          : msg.content;
        conversationParts.push({ role: 'user', parts: [{ text: content }] });
        firstUserMessage = false;
      } else if (msg.role === 'assistant') {
        conversationParts.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    // Add current user message
    const currentUserContent = firstUserMessage
      ? `${systemPrompt}\n\nUser: ${userMessage}`
      : userMessage;
    conversationParts.push({ role: 'user', parts: [{ text: currentUserContent }] });

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: conversationParts,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      return null;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      return generatedText.trim();
    }

    return null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

/**
 * Generate rule-based fallback response
 */
function generateRuleBasedResponse(
  userMessage: string,
  context: ChatbotContext
): string {
  const lowerMessage = userMessage.toLowerCase();
  const errors = detectErrors(context);
  
  // Error detection responses
  if (errors.length > 0 && (lowerMessage.includes('help') || lowerMessage.includes('error') || lowerMessage.includes('issue'))) {
    return `I've detected some issues that need attention:\n\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nLet me know if you'd like help fixing any of these!`;
  }

  // Greeting responses with actionable guidance
  if (lowerMessage.match(/^(hi|hello|hey|greetings|howdy)/)) {
    const { workflowStage, currentStep, selectedProduct, config } = context;
    
    if (workflowStage === 'landing') {
      return `Hello! 👋 I'm your LED Display Configuration Assistant. I'll guide you step-by-step through configuring your LED display.

**Quick Start:**
1. Click **"Start Configuration"** - I'll guide you through each step (recommended for first-time users)
2. Click **"Choose Product Directly"** - Skip to product selection if you know what you need

Which option would you like to use? I can help you decide!`;
    } else if (workflowStage === 'wizard') {
      const stepNames: Record<string, string> = {
        dimensions: 'Setting Dimensions',
        viewingDistance: 'Setting Viewing Distance',
        environment: 'Choosing Environment',
        pixelPitch: 'Selecting Pixel Pitch',
        product: 'Choosing Product'
      };
      return `Hello! 👋 I'm here to help you configure your LED display.

**Current Status:**
- Step: ${stepNames[currentStep || ''] || currentStep || 'Unknown'}
- ${config.width > 0 && config.height > 0 ? `Dimensions: ${config.width}mm × ${config.height}mm` : 'Dimensions: Not set yet'}
- ${config.environment ? `Environment: ${config.environment}` : 'Environment: Not selected'}
- ${selectedProduct ? `Product: ${selectedProduct.name}` : 'Product: Not selected'}

**What I can help with:**
- Complete the current step
- Explain any technical terms
- Recommend products based on your needs
- Detect and fix configuration issues

What do you need help with on this step?`;
    } else if (workflowStage === 'configurator') {
      return `Hello! 👋 I'm here to help you finish configuring your LED display.

**Current Status:**
- ${selectedProduct ? `✅ Product Selected: ${selectedProduct.name}` : '⚠️ No product selected yet'}
- ${config.width > 0 && config.height > 0 ? `Dimensions: ${config.width}mm × ${config.height}mm` : 'Dimensions: Not set'}

**What you can do now:**
- Adjust dimensions and aspect ratios
- Select or change product
- Configure wiring (data & power)
- Generate quote

What would you like to do next?`;
    }
    
    return `Hello! 👋 I'm your LED Display Configuration Assistant. I'm here to help you configure your LED display step-by-step. 

What would you like to configure today?`;
  }

  // Step guidance
  if (lowerMessage.includes('step') || lowerMessage.includes('guide') || lowerMessage.includes('how to')) {
    if (context.workflowStage === 'landing') {
      return `Here's the workflow:

1. **Landing Page** - Choose your entry method:
   - "Start Configuration" - Guided wizard (recommended for new users)
   - "Choose Product Directly" - Skip to product selection

2. **Configuration Wizard** (if guided):
   - Enter display dimensions (width × height)
   - Set viewing distance
   - Choose environment (Indoor/Outdoor)
   - Select pixel pitch
   - Choose a product

3. **Display Configurator** - Fine-tune and configure:
   - Adjust dimensions
   - Select/modify products
   - View preview
   - Configure wiring
   - Generate quote

4. **Quote Generation** - Fill user details and generate quotation

Where would you like to start?`;
    }
    
    if (context.workflowStage === 'wizard') {
      return `In the Configuration Wizard, follow these steps:

1. **Dimensions**: Enter your display width and height in your preferred unit (mm, cm, m, or ft)
2. **Viewing Distance**: Set how far viewers will be from the display
3. **Environment**: Choose Indoor or Outdoor
4. **Pixel Pitch**: Select based on viewing distance (closer viewing = finer pitch)
5. **Product**: Choose from recommended products

Current step: ${context.currentStep || 'unknown'}`;
    }
  }

  // Dimension help
  if (lowerMessage.includes('dimension') || lowerMessage.includes('size') || lowerMessage.includes('width') || lowerMessage.includes('height')) {
    const { config } = context;
    return `To set dimensions:

1. Enter width and height values
2. Select your preferred unit (mm, cm, m, or ft)
3. The system will automatically calculate the display area

${config.width > 0 && config.height > 0 
  ? `Current dimensions: ${config.width}mm × ${config.height}mm\nThat's about ${((config.width * config.height) / 1_000_000).toFixed(2)} m²`
  : 'No dimensions set yet. Enter your desired display size!'}`;
  }

  // Technical Questions - Data Wiring
  if (lowerMessage.includes('data wiring') || lowerMessage.includes('data cable') || lowerMessage.includes('data connection')) {
    return `**Data Wiring** (also called data cabling) is the network connection that carries video signals and control data from the video controller to LED display cabinets.

**Key Points:**
- **Purpose**: Transmits video content and control signals to display cabinets
- **Components**: 
  - Video controller (like VX600, VX1000, 4K PRIME)
  - Data hubs (connect multiple cabinets)
  - Data cables (typically network cables like CAT5/CAT6)
- **Function**: Routes video signals through a network topology (serpentine pattern) connecting all cabinets in sequence
- **Importance**: Without proper data wiring, cabinets won't receive video content or respond to controller commands

**In Your Configuration:**
- The "Data Wiring" tab shows the visual diagram of how cabinets are connected
- Each cabinet receives data from the previous one in a daisy-chain fashion
- Data hubs group cabinets together for efficient signal distribution

Would you like help configuring the data wiring for your display?`;
  }

  // Technical Questions - Power Wiring
  if (lowerMessage.includes('power wiring') || lowerMessage.includes('power cable') || lowerMessage.includes('power connection') || lowerMessage.includes('electrical')) {
    return `**Power Wiring** is the electrical connection system that provides electricity to LED display cabinets.

**Key Points:**
- **Purpose**: Supplies electrical power (AC) to all LED display cabinets
- **Components**:
  - Main power supply/distribution
  - Power cables (typically AC cables)
  - Power connections on each cabinet
- **Function**: Distributes power in parallel to multiple cabinets, ensuring stable power supply
- **Requirements**: Must meet power consumption needs and follow electrical safety standards
- **Safety**: Critical for proper operation - inadequate power can cause display issues or damage

**In Your Configuration:**
- The "Power Wiring" tab shows the power distribution diagram
- Each cabinet has specific power requirements (watts)
- Total power consumption is calculated based on number of cabinets and their specs

**Important**: Always consult with a qualified electrician for actual power installation. The diagram shows the conceptual layout only.

Would you like help understanding power requirements for your display?`;
  }

  // Technical Questions - Pixel Pitch
  if (lowerMessage.includes('pixel pitch') || lowerMessage.includes('what is pixel pitch')) {
    return `**Pixel Pitch** is the distance between the centers of two adjacent LED pixels, measured in millimeters (mm).

**Key Points:**
- **Measurement**: Distance from center of one pixel to center of next pixel (e.g., 1.5mm, 2.5mm, 6.6mm)
- **Quality Impact**: 
  - **Smaller pitch** (1.25mm, 1.5mm) = Higher resolution, better image quality for close viewing
  - **Larger pitch** (6.6mm, 10mm) = Lower resolution, cost-effective for distant viewing
- **Viewing Distance**: 
  - Closer viewing (1-5 meters) → Use smaller pitch (1.25mm - 2.5mm)
  - Medium viewing (5-15 meters) → Use medium pitch (2.5mm - 6.6mm)
  - Far viewing (15+ meters) → Use larger pitch (6.6mm - 20mm)

**Example:**
- P1.5 = 1.5mm pixel pitch (very detailed, for indoor close viewing)
- P6.6 = 6.6mm pixel pitch (good for outdoor billboards)

**In Your Configuration:**
- You can select pixel pitch in the wizard or configurator
- The system recommends pitches based on your viewing distance

Need help choosing the right pixel pitch for your installation?`;
  }

  // Technical Questions - Viewing Distance
  if (lowerMessage.includes('viewing distance') || lowerMessage.includes('what is viewing distance')) {
    return `**Viewing Distance** is how far viewers will typically be positioned from the LED display, measured in meters or feet.

**Key Points:**
- **Definition**: The typical distance from which people will view your display
- **Impact on Configuration**: Determines the optimal pixel pitch needed
- **Examples**:
  - **Retail stores**: 3-5 meters (close viewing)
  - **Shopping malls**: 5-10 meters (medium viewing)
  - **Stadiums/Billboards**: 20+ meters (distant viewing)

**Relationship to Pixel Pitch:**
- Closer viewing distance → Requires finer pixel pitch (better quality)
- Farther viewing distance → Can use coarser pixel pitch (more cost-effective)

**How to Determine:**
- Measure the typical viewing position from your display location
- Consider the primary audience location
- Account for closest and farthest viewers

**In Your Configuration:**
- Enter viewing distance in the wizard (Step 2)
- The system uses this to recommend appropriate pixel pitches and products

What's the viewing distance for your installation?`;
  }

  // Technical Questions - Cabinet Grid
  if (lowerMessage.includes('cabinet') && (lowerMessage.includes('grid') || lowerMessage.includes('layout') || lowerMessage.includes('arrangement'))) {
    return `**Cabinet Grid** is the arrangement of LED display cabinets in rows and columns to create your complete display.

**Key Points:**
- **Structure**: Cabinets are arranged in a grid pattern (e.g., 4 columns × 3 rows = 12 cabinets total)
- **Calculation**: 
  - System automatically calculates grid based on your dimensions and selected product
  - Each cabinet has specific dimensions (width × height)
  - Grid fills your display area optimally
- **Visualization**: The preview shows how cabinets are arranged
- **Wiring Impact**: Grid layout determines how data and power wiring is routed

**In Your Configuration:**
- The system calculates the optimal grid for your dimensions
- You can see the grid layout in the Preview tab
- Grid size affects wiring complexity and cabinet count

Would you like to see how your cabinets are arranged?`;
  }

  // Technical Questions - Controller
  if (lowerMessage.includes('controller') || lowerMessage.includes('processor') || lowerMessage.includes('video controller')) {
    return `**Video Controller** (also called processor) is the device that generates and sends video signals to your LED display.

**Key Points:**
- **Function**: Takes video input and processes it for LED display output
- **Types Available**:
  - **VX400 Pro**: For smaller displays (up to 2.6 million pixels)
  - **VX600/VX600 Pro**: For medium displays (up to 3.9 million pixels)
  - **VX1000/VX1000 Pro**: For larger displays (up to 6.5 million pixels)
  - **4K PRIME**: For very large displays (up to 13 million pixels)
- **Selection**: System automatically recommends controller based on your display size (total pixels)
- **Ports**: Controllers have multiple output ports for connecting data hubs
- **Redundancy**: Can configure backup controllers for reliability

**In Your Configuration:**
- Controller is automatically selected based on your display dimensions
- You can see controller details in the Data Wiring tab
- System ensures you have the right capacity for your display size

Want to know which controller is recommended for your display?`;
  }

  // Product selection help
  if (lowerMessage.includes('product') || lowerMessage.includes('select')) {
    const { selectedProduct } = context;
    return `To select a product:

1. Consider your environment (Indoor/Outdoor)
2. Match pixel pitch to viewing distance
3. Review product specifications

${selectedProduct 
  ? `You've selected: **${selectedProduct.name}**\n- Pixel Pitch: ${selectedProduct.pixelPitch}mm\n- Environment: ${selectedProduct.environment}\n- Brightness: ${selectedProduct.brightness} cd/m²`
  : 'No product selected yet. Based on your configuration, I can help recommend products!'}`;
  }

  // Context-aware default response
  const { workflowStage, currentStep, config, selectedProduct } = context;
  
  let contextSpecificHelp = '';
  
  if (workflowStage === 'landing') {
    contextSpecificHelp = `You're on the landing page. I recommend:\n\n1. Click "Start Configuration" if you're new - I'll guide you through each step\n2. Click "Choose Product Directly" if you already know which product you need\n\nWhat would you like to do?`;
  } else if (workflowStage === 'wizard') {
    const stepHelp: Record<string, string> = {
      dimensions: `Current Step: Setting Dimensions\n\nWhat I need from you:\n1. Enter your display width (e.g., 5 for 5 meters)\n2. Enter your display height (e.g., 3 for 3 meters)\n3. Choose your unit (m, ft, cm, or mm)\n\nOnce you enter these, click "Next" to continue.`,
      viewingDistance: `Current Step: Viewing Distance\n\nEnter how far viewers will typically be from the display (in meters or feet). This helps recommend the right pixel pitch.\n\nExample: For a retail store, typical viewing distance is 3-5 meters.`,
      environment: `Current Step: Environment Selection\n\nChoose:\n- **Indoor**: For indoor installations (shopping malls, offices, restaurants)\n- **Outdoor**: For outdoor installations (building facades, billboards)\n\nThis affects product recommendations and brightness requirements.`,
      pixelPitch: `Current Step: Pixel Pitch Selection\n\nPixel pitch determines image quality:\n- **Lower pitch** (1.25mm, 1.5mm) = Better quality, closer viewing\n- **Higher pitch** (6.6mm, 10mm) = Lower cost, farther viewing\n\nBased on your viewing distance, I can help you choose.`,
      product: `Current Step: Product Selection\n\nChoose from products that match:\n- Your viewing distance\n- Your environment (Indoor/Outdoor)\n- Your pixel pitch preference\n\nI can help you compare products if needed!`
    };
    contextSpecificHelp = stepHelp[currentStep || ''] || `You're in the configuration wizard. Current step: ${currentStep || 'unknown'}\n\nTell me what you need help with on this step, or ask me about any specific question.`;
  } else if (workflowStage === 'configurator') {
    contextSpecificHelp = `You're in the Display Configurator. Here's what you can do:\n\n1. **Adjust dimensions** - Modify width, height, or aspect ratio\n2. **Select/change product** - Choose a different product if needed\n3. **View preview** - See how your display will look\n4. **Configure wiring** - Set up data and power connections\n5. **Generate quote** - Get pricing and quotation\n\n${!selectedProduct ? '⚠️ No product selected yet. I recommend selecting a product first.' : `✅ Product: ${selectedProduct.name}\nYou can now configure wiring and generate a quote.`}`;
  }
  
  // Default helpful response with context
  const defaultHelp = 'I\'m here to help you configure your LED display! I can assist with:\n\n- Step-by-step guidance through the configuration process\n- Product recommendations based on your needs\n- Error detection and troubleshooting\n- Technical explanations in simple terms';
  
  let response = contextSpecificHelp || defaultHelp;
  
  if (errors.length > 0) {
    response += `\n\n⚠️ **Issues Detected:**\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nWould you like help fixing these?`;
  }
  
  response += '\n\nWhat specific help do you need right now?';
  
  return response;
}

/**
 * Generate AI-powered response
 */
export async function generateChatbotResponse(
  userMessage: string,
  context: ChatbotContext
): Promise<ChatMessage> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Detect errors first
  const errors = detectErrors(context);
  
  // Try AI first, fall back to rule-based
  let content = await callGeminiAPI(userMessage, context);
  
  if (!content) {
    content = generateRuleBasedResponse(userMessage, context);
  }

  // Add proactive error detection if not already mentioned
  if (errors.length > 0 && !content.toLowerCase().includes('issue') && !content.toLowerCase().includes('error') && !content.toLowerCase().includes('detected')) {
    content += `\n\n⚠️ **Important**: I noticed ${errors.length > 1 ? 'some issues' : 'an issue'}:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}\n\nWould you like help fixing ${errors.length > 1 ? 'these' : 'this'}?`;
  }

  // Determine suggested actions based on context
  const suggestedActions: string[] = [];
  if (context.workflowStage === 'landing') {
    suggestedActions.push('Start Configuration Wizard', 'Choose Product Directly');
  } else if (context.workflowStage === 'wizard') {
    if (context.currentStep === 'dimensions') {
      suggestedActions.push('Enter dimensions', 'Choose unit');
    } else if (context.currentStep === 'product') {
      suggestedActions.push('View product details', 'Compare products');
    }
  }

  return {
    id: messageId,
    role: 'assistant',
    content,
    timestamp: new Date(),
    metadata: {
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      detectedErrors: errors.length > 0 ? errors : undefined,
      workflowStep: context.currentStep,
    },
  };
}

/**
 * Get proactive suggestions based on current state
 */
export function getProactiveSuggestions(context: ChatbotContext): string[] {
  const suggestions: string[] = [];
  const { config, workflowStage, selectedProduct } = context;

  if (workflowStage === 'landing') {
    suggestions.push('Start with the Configuration Wizard for step-by-step guidance');
    suggestions.push('Or choose a product directly if you already know what you need');
  }

  if (workflowStage === 'wizard') {
    if (!config.width || !config.height) {
      suggestions.push('Set your display dimensions to continue');
    } else if (!config.environment) {
      suggestions.push('Select Indoor or Outdoor environment');
    } else if (!selectedProduct) {
      suggestions.push('Choose a product that matches your requirements');
    }
  }

  if (workflowStage === 'configurator' && !selectedProduct) {
    suggestions.push('Select a product to see the preview and configuration options');
  }

  return suggestions;
}
