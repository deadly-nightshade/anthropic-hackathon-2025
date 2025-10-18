const { Anthropic } = require('@anthropic-ai/sdk');
const AgentLogger = require('../utils/AgentLogger');

class InteriorDesignerAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.DESCRIPTION_MODEL || "claude-3-5-haiku-20241022"; // Default fallback
    }

    async enhancePrompt(userPrompt, roomDescription) {
        console.log('🎨 Interior Designer Agent: Analyzing prompt...');
        
        // Handle case where room description might be undefined
        const roomDescriptionText = roomDescription ? JSON.stringify(roomDescription, null, 2) : 'No room description available - provide general design guidance';
        
        const interiorDesignerPrompt = `You are an expert interior designer. Analyze the user's request and enhance it with specific design principles, color theory, furniture placement rules, and lighting concepts.

Current Room Description (JSON):
${roomDescriptionText}

User request: "${userPrompt}"

${roomDescription ? 
    'Using the room description above, enhance the user\'s request by adding:' : 
    'Since no room description is available, provide general design guidance by adding:'
}
- Specific color palette suggestions that complement existing colors (or suggest harmonious color combinations)
- Furniture placement principles considering layout and traffic flow
- Lighting scheme details that work with lighting setup
- Texture and material recommendations that match or establish a cohesive style
- Spatial relationship considerations based on objects or general room layout principles

Return a detailed, professional design brief that maintains the user's core intent but adds expert design knowledge. Be specific about colors (hex codes when possible), dimensions, materials, and placement rationale.

IMPORTANT: Return ONLY the enhanced design brief text - no markdown formatting, no headers, no bullet points. Just a clear, professional paragraph or two that can be passed to the next agent.

Example format: "Create a cozy atmosphere by warming the palette with #D2B48C beige accents, add soft textural elements like plush throws, implement layered lighting with warm 2700K ambient lighting, and arrange seating elements to create conversation zones."`;

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 800,
            temperature: 0.3,
            messages: [{
                role: "user",
                content: interiorDesignerPrompt
            }]
        });

        const enhancedPrompt = response.content[0].text.trim();
        console.log('✨ Interior Designer Agent enhanced prompt:', enhancedPrompt.substring(0, 200) + '...');
        
        await AgentLogger.logAgent('InteriorDesignerAgent', interiorDesignerPrompt, enhancedPrompt, { userPrompt });
        
        return enhancedPrompt;
    }
}

module.exports = InteriorDesignerAgent;