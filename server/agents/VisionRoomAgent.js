const { Anthropic } = require('@anthropic-ai/sdk');
const AgentLogger = require('../utils/AgentLogger');
const JsonFixerAgent = require('./JsonFixerAgent');

class VisionRoomAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022"; // Use Sonnet for vision
        this.jsonFixer = new JsonFixerAgent(anthropicClient);
    }

    async analyzeRoomAndGenerateChanges(userPrompt, roomScreenshot, currentRoomHTML) {
        console.log('👁️ Vision Room Agent: Analyzing room screenshot and generating changes...');
        
        try {
            // Step 1: Analyze the room visually and understand the user's request
            const visualAnalysis = await this.analyzeRoomVisually(userPrompt, roomScreenshot);
            
            // Step 2: Generate precise Three.js code changes based on visual understanding
            const codeChanges = await this.generateCodeFromVisualAnalysis(
                visualAnalysis, 
                userPrompt, 
                currentRoomHTML
            );

            console.log('✅ Vision Room Agent: Successfully generated changes from visual analysis');

            await AgentLogger.logAgent('VisionRoomAgent', userPrompt, codeChanges, {
                visualAnalysis: visualAnalysis.summary,
                approach: 'Vision-Based',
                roomElementsDetected: visualAnalysis.elementsDetected?.length || 0,
                changesGenerated: codeChanges.changes?.length || 0
            });

            return codeChanges;

        } catch (error) {
            console.error('❌ Vision Room Agent failed:', error.message);
            
            // Return empty changes on failure
            return {
                changes: [],
                metadata: {
                    error: error.message,
                    strategy: 'vision_failed',
                    generatedBy: 'VisionRoomAgent'
                }
            };
        }
    }

    async analyzeRoomVisually(userPrompt, roomScreenshot) {
        console.log('🔍 Vision Analysis: Understanding room layout and user request...');

        const systemPrompt = `You are an expert interior designer and 3D scene analyst. You can see a Three.js room scene and understand:

1. SPATIAL LAYOUT - Where objects are positioned in 3D space
2. EXISTING FURNITURE - What items are already in the room
3. AVAILABLE SPACE - Where new items can be placed
4. DESIGN COHERENCE - How new items should match the existing style

ANALYSIS TASKS:
- Identify all visible furniture and objects
- Determine room dimensions and layout
- Assess available space for new items
- Understand the current design style/theme
- Interpret the user's spatial instructions (left, right, center, corner, etc.)

OUTPUT FORMAT:
{
  "summary": "Brief description of what you see",
  "roomDimensions": "Estimated room size and layout",
  "elementsDetected": [
    {
      "type": "chair|bed|desk|lamp|etc",
      "position": "left|center|right|back|front",
      "color": "color description",
      "style": "modern|traditional|etc"
    }
  ],
  "availableSpaces": [
    {
      "location": "right wall|left corner|center|etc", 
      "suitableFor": ["bed", "chair", "desk"],
      "estimatedCoordinates": "approximate x,y,z position"
    }
  ],
  "designStyle": "modern minimalist|cozy traditional|etc",
  "userRequestAnalysis": {
    "requestedItem": "what user wants to add/change",
    "requestedLocation": "where they want it",
    "feasibility": "possible|challenging|not recommended",
    "recommendations": "suggestions for better placement"
  }
}`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 2000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this 3D room scene and the user's request:

USER REQUEST: "${userPrompt}"

Please analyze the room layout, identify existing furniture, assess available space, and understand what the user wants to do. Provide detailed spatial analysis for implementing their request.`
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: roomScreenshot.mediaType || "image/png",
                                data: roomScreenshot.base64Data
                            }
                        }
                    ]
                }]
            });

            const analysisText = response.content[0].text.trim();
            
            // Parse JSON response
            let cleanResponse = analysisText;
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }

            const analysis = JSON.parse(cleanResponse);
            
            console.log(`📊 Visual Analysis Complete:
   - Elements detected: ${analysis.elementsDetected?.length || 0}
   - Available spaces: ${analysis.availableSpaces?.length || 0}
   - Design style: ${analysis.designStyle}
   - Request feasibility: ${analysis.userRequestAnalysis?.feasibility}`);

            return analysis;

        } catch (error) {
            console.error('❌ Visual analysis failed:', error.message);
            throw new Error(`Visual analysis failed: ${error.message}`);
        }
    }

    async generateCodeFromVisualAnalysis(visualAnalysis, userPrompt, currentRoomHTML) {
        console.log('⚙️ Code Generation: Converting visual analysis to Three.js changes...');

        const systemPrompt = `You are an expert Three.js developer who converts visual room analysis into precise code changes.

VISUAL ANALYSIS PROVIDED:
${JSON.stringify(visualAnalysis, null, 2)}

YOUR TASK: Generate exact Three.js code changes to implement the user's request based on the visual analysis.

COORDINATE SYSTEM UNDERSTANDING:
- X-axis: left(-) to right(+)
- Y-axis: down(-) to up(+) 
- Z-axis: back(-) to front(+)
- Room typically spans: X(-10 to +10), Y(0 to +8), Z(-10 to +10)

CHANGE PATTERNS:
1. ADD FURNITURE: Create material → Create geometry → Create function → Add scene.add() call
2. MODIFY EXISTING: Find existing object and change properties
3. REMOVE ITEMS: Remove function definition and scene.add() call
4. REPOSITION: Modify position.set(x, y, z) coordinates

POSITIONING LOGIC:
- "right side": X coordinates +3 to +8
- "left side": X coordinates -8 to -3  
- "center": X coordinates -1 to +1
- "back wall": Z coordinates -8 to -5
- "front area": Z coordinates +3 to +8

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "changes": [
    {
      "type": "insert",
      "description": "What this change does",
      "after_line": 456,
      "content": "function code here"
    }
  ],
  "metadata": {
    "strategy": "vision_based_placement",
    "itemsAdded": ["item1"],
    "generatedBy": "VisionRoomAgent"
  }
}

CRITICAL RULES:
- ALWAYS return valid JSON
- Use lowercase hex colors (0xffffff)
- Generate unique function names
- Keep responses under 2000 characters
- Be extremely concise in code generation`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 2000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Generate THREE.JS code changes for: "${userPrompt}"

VISUAL ANALYSIS: ${JSON.stringify(visualAnalysis, null, 2)}

CURRENT CODE LINES: ${currentRoomHTML.split('\n').length}

Return ONLY valid JSON with changes array.`
                }]
            });

            const codeText = response.content[0].text.trim();
            
            // Use JsonFixerAgent to handle malformed JSON
            const fixResult = await this.jsonFixer.fixMalformedJson(
                codeText,
                {
                    changes: [],
                    metadata: {}
                },
                {
                    userPrompt: userPrompt,
                    agent: 'VisionRoomAgent',
                    context: 'code_generation'
                }
            );
            
            let codeChanges;
            if (fixResult.success) {
                codeChanges = fixResult.data;
                console.log(`✅ JSON fixed using method: ${fixResult.method}`);
            } else {
                console.log('⚠️ JSON fixing failed, using fallback');
                codeChanges = fixResult.fallback;
            }
            
            // Validate and ensure proper structure
            codeChanges = this.validateAndFixStructure(codeChanges, userPrompt);
            
            console.log(`🎯 Code Generation Complete:
   - Changes generated: ${codeChanges.changes?.length || 0}
   - Items being added: ${codeChanges.metadata?.itemsAdded?.join(', ') || 'none'}
   - Positioning strategy: ${codeChanges.metadata?.strategy}
   - JSON fix method: ${fixResult.method || 'fallback'}`);

            return codeChanges;

        } catch (error) {
            console.error('❌ Code generation failed:', error.message);
            
            // Generate a basic fallback change instead of empty
            return this.generateFallbackChange(userPrompt, error.message);
        }
    }

    validateAndFixStructure(codeChanges, userPrompt) {
        if (!codeChanges || typeof codeChanges !== 'object') {
            return this.generateFallbackChange(userPrompt, 'Invalid structure returned');
        }
        
        // Ensure changes array exists
        if (!Array.isArray(codeChanges.changes)) {
            codeChanges.changes = [];
        }
        
        // Ensure metadata exists
        if (!codeChanges.metadata || typeof codeChanges.metadata !== 'object') {
            codeChanges.metadata = {
                strategy: 'structure_fixed',
                generatedBy: 'VisionRoomAgent'
            };
        }
        
        // Validate each change object
        codeChanges.changes = codeChanges.changes.filter(change => {
            return change && 
                   typeof change === 'object' && 
                   change.type && 
                   (change.content || change.new || change.old);
        });
        
        return codeChanges;
    }

    generateFallbackChange(userPrompt, errorMessage) {
        console.log('🔄 Generating fallback change for:', userPrompt);
        
        // Analyze user prompt for basic intent
        const prompt = userPrompt.toLowerCase();
        
        if (prompt.includes('bed')) {
            return {
                changes: [{
                    type: "insert",
                    description: "Add a simple bed",
                    after_line: 2900,
                    content: `
        function createSimpleBed() {
            const bed = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.5, 6),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            bed.position.set(8, 0.25, -5);
            bed.castShadow = true;
            return bed;
        }`
                }],
                metadata: {
                    strategy: 'fallback_generation',
                    generatedBy: 'VisionRoomAgent',
                    error: errorMessage,
                    userPrompt: userPrompt
                }
            };
        }
        
        // Default fallback - add a simple object
        return {
            changes: [{
                type: "insert", 
                description: "Add a simple decorative object",
                after_line: 2900,
                content: `
        function createFallbackObject() {
            const obj = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0x888888 })
            );
            obj.position.set(0, 0.5, 0);
            return obj;
        }`
            }],
            metadata: {
                strategy: 'fallback_generation',
                generatedBy: 'VisionRoomAgent',
                error: errorMessage,
                userPrompt: userPrompt
            }
        };
    }

    addLineNumbers(html) {
        return html.split('\n')
            .map((line, index) => `${index + 1}: ${line}`)
            .join('\n');
    }

    getProcessingStats() {
        return {
            agent: 'VisionRoomAgent',
            capabilities: [
                'Visual room scene analysis',
                'Spatial layout understanding', 
                'Furniture and object detection',
                'Available space assessment',
                'Design style recognition',
                'Natural language spatial instruction parsing',
                'Precise Three.js code generation',
                'Coordinate system mapping'
            ],
            advantages: [
                'No diff synchronization issues',
                'Visual understanding of room layout',
                'Natural spatial instruction processing',
                'Context-aware object placement',
                'Avoids object overlaps through visual analysis'
            ]
        };
    }
}

module.exports = VisionRoomAgent;