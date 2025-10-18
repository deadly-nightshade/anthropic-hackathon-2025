const { Anthropic } = require('@anthropic-ai/sdk');
const AgentLogger = require('../utils/AgentLogger');

class StyleDetectiveAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.DESCRIPTION_MODEL || "claude-3-5-haiku-20241022"; // Default fallback
    }

    async adaptPrompt(enhancedPrompt, roomDescription, userPrompt) {
        console.log('🔍 Style Detective Agent: Analyzing current room style from description...');
        
        // Handle case where room description might be undefined
        const roomDescriptionText = roomDescription ? JSON.stringify(roomDescription, null, 2) : 'No room description available - provide style-consistent guidance';
        const currentStyle = roomDescription?.room_style?.primary_style || 'general design principles';
        
        const styleDetectivePrompt = `You are a style detective agent. Using the detailed room description JSON, adapt the interior designer's suggestions to maintain perfect style consistency.

Current Room Description:
${roomDescriptionText}

Interior Designer's Enhanced Request:
"${enhancedPrompt}"

Your tasks:
1. Analyze the room's existing style from the JSON (${currentStyle})
2. Note the current color palette, materials, and object characteristics
3. Adapt the interior designer's suggestions to match existing style elements
4. Ensure consistency in: shape language, materials, color harmony, scale proportions
5. Reference specific existing objects when suggesting placement or relationships

${roomDescription ? 
    'Return the final adapted design brief that maintains the interior designer\'s expertise while ensuring perfect style consistency. Be specific about how you\'re adapting elements to match existing objects.' :
    'Since no room description is available, refine the interior designer\'s suggestions to be more specific and actionable while maintaining general design coherence.'
}

IMPORTANT: Return ONLY the adapted design brief text - no markdown formatting, no headers, no bullet points, no analysis sections. Just a clear, professional paragraph that can be passed directly to the Room Editor Agent.

Example format: "Transform the walls to soft blush pink #F8BBD9 to complement the existing warm wood furniture, ensuring the pink tone harmonizes with the current beige upholstery and maintains the room's cozy residential aesthetic."`;

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1000,
            temperature: 0.2,
            messages: [{
                role: "user",
                content: styleDetectivePrompt
            }]
        });

        const styleAdaptedPrompt = response.content[0].text.trim();
        console.log('🔍 Style Detective Agent adapted prompt:', styleAdaptedPrompt.substring(0, 200) + '...');
        
        await AgentLogger.logAgent('StyleDetectiveAgent', styleDetectivePrompt, styleAdaptedPrompt, { userPrompt });
        
        return styleAdaptedPrompt;
    }
}

module.exports = StyleDetectiveAgent;