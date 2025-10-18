const { Anthropic } = require('@anthropic-ai/sdk');
const CodeAnalyzer = require('./advanced/CodeAnalyzer');
const ChangePlanner = require('./advanced/ChangePlanner');
const CodeValidator = require('./advanced/CodeValidator');
const AgentLogger = require('../utils/AgentLogger');

class AdvancedRoomEditorAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
        
        // Initialize the AI-powered advanced agents (pass anthropic client)
        this.codeAnalyzer = new CodeAnalyzer(anthropicClient);
        this.changePlanner = new ChangePlanner(anthropicClient);
        this.codeValidator = new CodeValidator(anthropicClient);
    }

    async generateDiff(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt) {
        console.log('🧠 Advanced Room Editor Agent: Starting multi-AI coordination...');
        
        try {
            // Step 1: AI Code Analysis
            console.log('🔍 Step 1: AI Code Analyzer analyzing structure...');
            const codeStructure = await this.codeAnalyzer.validateCodeStructure(currentRoomHTML);
            
            if (!codeStructure.valid) {
                console.warn('⚠️ Code structure issues detected:', codeStructure.issues);
            }

            // Step 2: AI Change Planning
            console.log('📋 Step 2: AI Change Planner creating strategy...');
            const changePlan = await this.changePlanner.planChanges(
                styleAdaptedPrompt, 
                currentRoomHTML, 
                codeStructure.analysis
            );

            console.log(`✨ Plan Summary:
   - Strategy: ${changePlan.strategy}
   - Steps: ${changePlan.steps.length}
   - Complexity: ${changePlan.estimatedComplexity}
   - Risks: ${changePlan.risks.length}`);

            // Step 3: AI Validation
            console.log('🔍 Step 3: AI Code Validator checking plan...');
            const validation = await this.codeValidator.validatePlan(changePlan, currentRoomHTML);

            if (!validation.valid) {
                console.error('❌ Plan validation failed:', validation.errors);
                
                // Use single AI fallback for failed multi-agent coordination
                console.log('🤖 Falling back to single AI approach...');
                return await this.singleAIFallback(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt, {
                    planErrors: validation.errors,
                    originalPlan: changePlan,
                    codeAnalysis: codeStructure.analysis
                });
            }

            if (validation.warnings.length > 0) {
                console.warn('⚠️ Plan warnings:', validation.warnings);
            }

            // Step 4: AI Simulation
            console.log('🎮 Step 4: AI simulating changes...');
            const simulation = await this.codeValidator.simulateChanges(changePlan, currentRoomHTML);

            if (!simulation.success) {
                console.error('❌ Simulation failed:', simulation.errors);
                
                return await this.singleAIFallback(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt, {
                    simulationErrors: simulation.errors,
                    originalPlan: changePlan,
                    codeAnalysis: codeStructure.analysis
                });
            }

            // Step 5: Convert plan to diff format
            console.log('⚙️ Step 5: Converting plan to diff format...');
            const diffObject = this.convertPlanToDiff(changePlan);

            console.log('✅ Multi-Agent AI: Successfully generated validated diff');

            await AgentLogger.logAgent('AdvancedRoomEditorAgent', styleAdaptedPrompt, diffObject, {
                userPrompt: userPrompt,
                enhancedPrompt: enhancedPrompt,
                finalPrompt: styleAdaptedPrompt,
                approach: 'Multi-Agent-AI',
                codeAnalysis: codeStructure.analysis,
                changePlan: changePlan,
                validation: validation,
                simulation: simulation.success,
                htmlLinesCount: currentRoomHTML.split('\n').length,
                note: 'Multi-agent AI coordination completed successfully'
            });

            return diffObject;

        } catch (error) {
            console.error('❌ Multi-Agent AI coordination failed:', error.message);
            
            console.log('🚨 Using single AI emergency fallback...');
            return await this.singleAIFallback(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt, {
                error: error.message,
                fallbackReason: 'Multi-agent coordination failed'
            });
        }
    }

    convertPlanToDiff(changePlan) {
        const diffObject = {
            changes: [],
            metadata: {
                strategy: changePlan.strategy,
                complexity: changePlan.estimatedComplexity,
                risks: changePlan.risks,
                generatedBy: 'Multi-Agent-AI'
            }
        };

        // Convert each plan step to diff format
        for (const step of changePlan.steps) {
            switch (step.type) {
                case 'replace':
                    diffObject.changes.push({
                        type: 'replace',
                        line: step.target.line,
                        old: step.target.oldValue,
                        new: step.target.newValue,
                        description: step.description
                    });
                    break;

                case 'insert':
                    diffObject.changes.push({
                        type: 'insert',
                        after_line: step.target.after_line,
                        content: step.target.content,
                        description: step.description
                    });
                    break;

                case 'delete':
                    diffObject.changes.push({
                        type: 'delete',
                        start_line: step.target.start_line,
                        end_line: step.target.end_line,
                        description: step.description
                    });
                    break;

                default:
                    console.warn(`Unknown step type: ${step.type}`);
            }
        }

        return diffObject;
    }

    async singleAIFallback(styleAdaptedPrompt, currentRoomHTML, userPrompt, enhancedPrompt, fallbackContext) {
        console.log('🤖 Single AI Fallback: Using direct Claude analysis...');

        const systemPrompt = `You are an expert Three.js developer with deep understanding of interactive 3D room design. The multi-agent system failed, so you need to handle this request directly.

FALLBACK CONTEXT:
${JSON.stringify(fallbackContext, null, 2)}

YOUR TASK: Analyze the user request and generate precise changes to the Three.js code.

EXPERTISE AREAS:
- Object Addition: Add materials → create functions → scene.add() calls
- Color Changes: Find material color properties and modify hex values  
- Object Removal: Remove function definitions and scene calls
- Positioning: Modify position.set() coordinates
- Style Changes: Coordinate multiple modifications

CRITICAL RULES:
- Use lowercase hex colors (0xffffff) to match existing style
- Generate unique names (createNewChair, chairMaterial2, etc.)
- Position new objects to avoid conflicts
- Maintain proper Three.js syntax and indentation
- Make minimal, surgical changes

OUTPUT FORMAT:
{
  "changes": [
    {
      "type": "replace|insert|delete",
      "line": <number>,
      "old": "<exact_text>",
      "new": "<replacement>", 
      "description": "<what this does>",
      "after_line": <number_for_inserts>,
      "content": "<content_for_inserts>",
      "start_line": <number_for_deletes>,
      "end_line": <number_for_deletes>
    }
  ],
  "metadata": {
    "strategy": "single_ai_fallback",
    "complexity": "low|medium|high",
    "generatedBy": "Single-AI-Fallback"
  }
}`;

        const addLineNumbers = (html) => {
            return html.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
        };

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 4000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Current Three.js room code (with line numbers):
${addLineNumbers(currentRoomHTML)}

User Request: "${styleAdaptedPrompt}"
Original Prompt: "${userPrompt}"

Context: ${JSON.stringify(fallbackContext, null, 2)}

Generate precise changes to fulfill this request. Return ONLY the JSON diff object.`
                }]
            });

            const aiResponse = response.content[0].text.trim();
            
            let cleanResponse = aiResponse;
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }

            const diffObject = JSON.parse(cleanResponse);
            
            if (!diffObject.metadata) {
                diffObject.metadata = {};
            }
            diffObject.metadata.singleAIFallback = true;
            diffObject.metadata.fallbackContext = fallbackContext;
            diffObject.metadata.generatedBy = 'Single-AI-Fallback';

            console.log('✅ Single AI Fallback: Successfully generated diff');

            await AgentLogger.logAgent('AdvancedRoomEditorAgent', styleAdaptedPrompt, diffObject, {
                userPrompt: userPrompt,
                enhancedPrompt: enhancedPrompt,
                finalPrompt: styleAdaptedPrompt,
                approach: 'Single-AI-Fallback',
                fallbackContext: fallbackContext,
                note: 'Single AI fallback used due to multi-agent coordination failure'
            });

            return diffObject;

        } catch (fallbackError) {
            console.error('❌ Single AI Fallback also failed:', fallbackError.message);
            
            return {
                changes: [],
                metadata: {
                    error: 'Complete AI processing failure',
                    multiAgentError: fallbackContext,
                    singleAIError: fallbackError.message,
                    strategy: 'emergency_empty_diff',
                    generatedBy: 'Emergency-Fallback'
                }
            };
        }
    }

    getProcessingStats() {
        return {
            agent: 'AdvancedRoomEditorAgent',
            components: [
                'CodeAnalyzer AI - Claude-powered code structure analysis',
                'ChangePlanner AI - Claude-powered strategic planning', 
                'CodeValidator AI - Claude-powered validation and simulation',
                'Single AI Fallback - Direct Claude processing when coordination fails'
            ],
            capabilities: [
                'Multi-agent AI coordination',
                'Specialized code analysis',
                'Strategic change planning',
                'Pre-flight validation and simulation',
                'Graceful fallback handling'
            ]
        };
    }
}

module.exports = AdvancedRoomEditorAgent;