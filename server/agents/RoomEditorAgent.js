const { Anthropic } = require('@anthropic-ai/sdk');
const AgentLogger = require('../utils/AgentLogger');

class RoomEditorAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022"; // Default fallback
    }

    async generateDiff(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt) {
        const systemPrompt = `You are a highly skilled frontend developer specializing in Three.js with extensive experience in 3D room design and interactive web applications. You have deep expertise in Three.js geometry, materials, lighting, and scene optimization for web browsers.

As an expert Three.js developer and 3D room designer, you receive HTML containing a complete 3D room scene built with Three.js, and user requests to modify it. Your frontend development background ensures you understand performance optimization, browser compatibility, and user experience considerations.

Your task is to analyze the HTML and return ONLY a JSON object with specific line-based changes to implement the user's request using your Three.js expertise.

CRITICAL FAILURE PREVENTION RULES (Based on Frontend Development Best Practices):

MATERIAL RULES (prevents rendering issues and black screens):
- NEVER create new materials with conflicting names - this breaks Three.js material management
- For color changes: ONLY replace the color value in existing materials (Three.js best practice)
- Example: change "color: 0xfff5e6," to "color: 0xF5D1D1," (single line replacement)
- NEVER add new material properties that conflict with existing ones - maintain clean material definitions

REMOVAL RULES (ensures proper Three.js object cleanup):
- To remove objects: Use TWO separate operations for proper cleanup:
  1. Delete the entire function definition (use "delete" type with start_line/end_line)
  2. Remove the scene.add() call (use "replace" type to remove the line)
- NEVER try to replace multi-line blocks - use separate delete operations for maintainability
- Always remove both the function AND the scene.add() call to prevent memory leaks

THREE.JS PERFORMANCE RULES (frontend optimization):
- Keep geometry creation efficient - reuse geometries when possible
- Position objects using .position.set() for clarity
- Use appropriate geometry types for the object (BoxGeometry, SphereGeometry, etc.)
- Maintain consistent naming conventions for Three.js objects

TEXT MATCHING RULES (prevents deployment failures):
- Keep "replace" operations to single lines when possible
- Use EXACT text from the provided HTML (including all spaces and tabs)
- For multi-line changes: break into multiple single-line operations
- Double-check that the "old" text exists exactly on the specified line

NEW OBJECT RULES (Three.js object creation best practices):
- Break into 3 separate operations for clean code organization:
  1. Add material to materials object (if new material needed)
  2. Insert complete function definition after existing createXXX functions
  3. Add scene.add() call with existing scene.add() calls
- Use consistent Three.js naming: materialName -> createObjectName() -> scene.add(createObjectName())
- Always specify exact positions using coordinates for predictable placement

JSON OUTPUT RULES (prevents frontend build failures):
- Never include literal \n or \t characters in JSON strings
- Use proper escaping for quotes: \" not "
- Test JSON structure mentally before outputting
- Always use valid JSON format with proper commas and brackets

CRITICAL OUTPUT FORMAT:
- Return ONLY a valid JSON object - no explanations, no markdown, no extra text
- Use this exact structure:

{
  "changes": [
    {
      "type": "insert",
      "after_line": <line_number>,
      "content": "<code_to_insert>"
    },
    {
      "type": "replace", 
      "line": <line_number>,
      "old": "<exact_text_to_replace>",
      "new": "<replacement_text>"
    },
    {
      "type": "delete",
      "start_line": <line_number>,
      "end_line": <line_number>
    }
  ]
}

THREE.JS SCENE COMPOSITION RULES (UX and visual design):
- Position new objects against walls, not in center view area (better user experience)
- Use negative X for left side, positive X for right side (consistent coordinate system)
- Use negative Z for closer to camera, positive Z for farther (depth management)
- Maintain 2-3 units clear space in center for camera view (optimal viewing experience)

FRONTEND DEVELOPMENT EXAMPLES:

Color change (Material property update):
{
  "type": "replace",
  "line": 45,
  "old": "color: 0xffffff,",
  "new": "color: 0xff0000,"
}

Remove Three.js object (Proper cleanup):
{
  "type": "delete", 
  "start_line": 150,
  "end_line": 165
},
{
  "type": "replace",
  "line": 400, 
  "old": "        scene.add(createBookshelf());",
  "new": ""
}

Add new Three.js object (Complete implementation):
1. Add material definition, 2. Add geometry function, 3. Add to scene

Use your frontend Three.js expertise to analyze the current HTML and return precise, performance-optimized operations that will reliably implement the requested changes.`;

        const roomEditorPrompt = `User request: "${styleAdaptedPrompt}"

Return ONLY the JSON diff object with precise line-based changes to implement this request using Three.js best practices.`;

        // Add line numbers to HTML for AI reference
        const addLineNumbers = (html) => {
            return html.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
        };

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 4000,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: `Current room HTML (with line numbers for reference):
${addLineNumbers(currentRoomHTML)}

User request: "${styleAdaptedPrompt}"

Return ONLY the JSON diff object with precise line-based changes to implement this request.`
            }]
        });

        const aiResponse = response.content[0].text;
        
        // Log AI response for debugging
        console.log('🤖 AI Diff Response received:');
        console.log('📏 Response length:', aiResponse.length, 'characters');
        console.log('📝 Response preview:');
        console.log(aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : ''));
        
        // Parse JSON diff response
        let diffObject;
        try {
            // Clean response by removing any markdown code blocks if present
            let cleanResponse = aiResponse.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }
            
            // Handle cases where AI returns non-JSON responses
            if (!cleanResponse || cleanResponse === 'null' || cleanResponse === 'undefined') {
                throw new Error('AI returned empty or null response');
            }

            // Check if response looks like JSON
            if (!cleanResponse.startsWith('{') && !cleanResponse.startsWith('[')) {
                throw new Error('AI returned non-JSON response: ' + cleanResponse.substring(0, 100));
            }
            
            diffObject = JSON.parse(cleanResponse);
            
            // Validate the structure
            if (!diffObject || !diffObject.changes || !Array.isArray(diffObject.changes)) {
                throw new Error('AI returned invalid diff structure');
            }
            
            console.log('✅ Successfully parsed diff object');
            console.log('🔧 Found', diffObject.changes?.length || 0, 'changes');
            
        } catch (parseError) {
            console.error('❌ Failed to parse AI response as JSON:', parseError.message);
            console.log('Raw response:', aiResponse);
            
            // Create a fallback empty diff object
            diffObject = {
                changes: [],
                error: 'Failed to generate valid changes: ' + parseError.message
            };
            
            await AgentLogger.logAgent('RoomEditorAgent', roomEditorPrompt, null, { 
                error: parseError.message,
                userPrompt: userPrompt,
                enhancedPrompt: enhancedPrompt,
                finalPrompt: styleAdaptedPrompt,
                rawResponse: aiResponse.substring(0, 500)
            });
            
            // Don't throw - return the empty diff object so the system can continue
            console.log('⚠️ Returning empty diff object due to parsing failure');
        }

        // Log Room Editor Agent activity (excluding HTML from logs)
        await AgentLogger.logAgent('RoomEditorAgent', roomEditorPrompt, diffObject, { 
            userPrompt: userPrompt,
            enhancedPrompt: enhancedPrompt,
            finalPrompt: styleAdaptedPrompt,
            htmlLinesCount: currentRoomHTML.split('\n').length,
            note: 'HTML excluded from logs for brevity'
        });

        return diffObject;
    }

    getProcessingStats() {
        return {
            agent: 'RoomEditorAgent',
            components: [
                'Single Claude AI - Direct Three.js code generation'
            ],
            capabilities: [
                'Direct AI-powered code modifications',
                'Three.js expertise and best practices',
                'Single-step diff generation',
                'Performance-optimized edits'
            ]
        };
    }
}

module.exports = RoomEditorAgent;