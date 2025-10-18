const { Anthropic } = require('@anthropic-ai/sdk');

class ChangePlanner {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
    }

    async planChanges(userRequest, html, codeAnalysis) {
        console.log('📋 Change Planner AI: Using Claude to create strategic plan for modifications...');
        
        const systemPrompt = `You are a strategic Three.js modification planner. Your job is to analyze user requests and create detailed, step-by-step plans for making code changes.

YOUR EXPERTISE:
- Understanding user intent (add objects, change colors, remove items, modify styles)
- Creating surgical, minimal changes that achieve the goal
- Proper Three.js patterns (materials → functions → scene.add)
- Code positioning and conflict avoidance
- Dependency management and validation

CHANGE STRATEGIES:
1. MATERIAL_MODIFICATION: Changing colors, textures, properties
2. OBJECT_CREATION: Adding new furniture, decorations, etc.
3. OBJECT_DELETION: Removing existing items
4. OBJECT_POSITIONING: Moving things around
5. COMPLEX_MODIFICATION: Multi-step changes

OUTPUT FORMAT:
Return ONLY a JSON object with this structure:
{
  "request": "original user request",
  "strategy": "material_modification|object_creation|object_deletion|object_positioning|complex_modification",
  "steps": [
    {
      "type": "replace|insert|delete",
      "description": "what this step does",
      "target": {
        "line": 123,
        "oldValue": "exact text to replace",
        "newValue": "replacement text",
        "after_line": 456,
        "content": "content for inserts",
        "start_line": 100,
        "end_line": 120
      },
      "validation": "what to check",
      "priority": 1
    }
  ],
  "risks": ["potential issues"],
  "dependencies": [{"type": "material_exists", "name": "wood"}],
  "estimatedComplexity": "low|medium|high"
}

CRITICAL RULES:
- For object addition: 1) Add material, 2) Add function, 3) Add scene.add() call
- For color changes: Find exact color line and replace hex value
- Use lowercase hex colors (0xffffff) to match existing style
- Position new objects to avoid conflicts
- Generate meaningful names (createNewChair, chairMaterial, etc.)
- Be precise with line numbers and exact text matching`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 4000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Create a strategic plan for this modification:

USER REQUEST: "${userRequest}"

CURRENT CODE ANALYSIS:
${JSON.stringify(codeAnalysis, null, 2)}

CURRENT CODE:
${html}

Analyze the request and create a detailed, step-by-step plan. Return ONLY the JSON plan object.`
                }]
            });

            const aiResponse = response.content[0].text.trim();
            
            // Parse and validate the AI response
            let cleanResponse = aiResponse;
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }

            const plan = JSON.parse(cleanResponse);
            
            console.log(`✅ Change Plan AI Created:
   - Strategy: ${plan.strategy}
   - Steps: ${plan.steps?.length || 0}
   - Complexity: ${plan.estimatedComplexity}
   - Risks: ${plan.risks?.length || 0}`);

            // Add line number stability and conflict detection
            const stabilizedPlan = this.stabilizeLineNumbers(plan, html);
            const conflictCheckedPlan = this.detectConflicts(stabilizedPlan);
            
            return {
                ...plan,
                steps: conflictCheckedPlan.steps,
                lineStability: stabilizedPlan.adjustments,
                conflicts: conflictCheckedPlan.conflicts,
                safetyChecks: true
            };

        } catch (error) {
            console.error('❌ Change Planner AI failed:', error.message);
            
            // Return fallback plan
            return {
                request: userRequest,
                strategy: 'requires_analysis',
                steps: [{
                    type: 'analysis_needed',
                    description: `AI planning failed: ${error.message}`,
                    target: {},
                    validation: 'Manual intervention required',
                    priority: 1
                }],
                risks: [`AI planning failure: ${error.message}`],
                dependencies: [],
                estimatedComplexity: 'high'
            };
        }
    }

    stabilizeLineNumbers(plan, html) {
        const lines = html.split('\n');
        const adjustments = [];
        
        // Sort changes by line number (descending) to apply from bottom up
        plan.steps.sort((a, b) => {
            const lineA = a.target?.line || a.target?.after_line || 0;
            const lineB = b.target?.line || b.target?.after_line || 0;
            return lineB - lineA; // Descending order
        });
        
        // Use content-based anchors instead of just line numbers
        plan.steps.forEach(step => {
            if (step.target?.line) {
                const targetLine = step.target.line - 1; // Convert to 0-based
                if (targetLine >= 0 && targetLine < lines.length) {
                    step.target.anchorContent = lines[targetLine].trim();
                    step.target.contextBefore = targetLine > 0 ? lines[targetLine - 1].trim() : '';
                    step.target.contextAfter = targetLine < lines.length - 1 ? lines[targetLine + 1].trim() : '';
                }
            }
        });
        
        return { steps: plan.steps, adjustments };
    }

    detectConflicts(plan) {
        const conflicts = [];
        const affectedLines = new Set();
        
        plan.steps.forEach((step, index) => {
            const lineNum = step.target?.line || step.target?.after_line;
            
            if (lineNum && affectedLines.has(lineNum)) {
                conflicts.push({
                    type: 'line_conflict',
                    stepIndex: index,
                    line: lineNum,
                    description: `Multiple changes targeting line ${lineNum}`
                });
            }
            
            if (lineNum) affectedLines.add(lineNum);
        });
        
        return { steps: plan.steps, conflicts };
    }
}

module.exports = ChangePlanner;