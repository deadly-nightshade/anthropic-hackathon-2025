const { Anthropic } = require('@anthropic-ai/sdk');

class CodeValidator {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
    }

    async validatePlan(plan, currentHTML) {
        console.log('🔍 Code Validator AI: Using Claude to validate planned changes...');
        
        const systemPrompt = `You are a Three.js code validation specialist. Your job is to analyze planned code changes and identify potential issues before they are applied.

VALIDATION TARGETS:
- Syntax correctness (Three.js patterns, JavaScript syntax)
- Line number accuracy (do target lines exist?)
- Reference validity (do materials/functions exist?)
- Logic soundness (will changes achieve intended effect?)
- Conflict detection (naming conflicts, positioning issues)
- Dependency chains (proper order of operations)

OUTPUT FORMAT:
Return ONLY a JSON object with this structure:
{
  "valid": true/false,
  "errors": ["blocking issues that prevent execution"],
  "warnings": ["non-blocking concerns"],
  "suggestions": ["improvements or alternatives"],
  "preflightChecks": [
    {
      "step": 1,
      "description": "step description", 
      "status": "PASS|FAIL|WARN",
      "details": "specific findings"
    }
  ]
}

VALIDATION CRITERIA:
- Line numbers must exist in current file
- Old values for replacements must match exactly
- New materials must have unique names
- New functions must have unique names
- Three.js syntax must be correct
- Insertion points must be safe
- Dependencies must be satisfied`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 4000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Validate this change plan against the current code:

CHANGE PLAN:
${JSON.stringify(plan, null, 2)}

CURRENT CODE:
${currentHTML}

Perform comprehensive validation and return ONLY the JSON validation object.`
                }]
            });

            const aiResponse = response.content[0].text.trim();
            
            let cleanResponse = aiResponse;
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }

            const validation = JSON.parse(cleanResponse);
            
            console.log(`✅ Validation AI Complete:
   - Status: ${validation.valid ? 'PASS' : 'FAIL'}
   - Errors: ${validation.errors?.length || 0}
   - Warnings: ${validation.warnings?.length || 0}`);

            return validation;

        } catch (error) {
            console.error('❌ Code Validator AI failed:', error.message);
            
            return {
                valid: false,
                errors: [`AI validation failed: ${error.message}`],
                warnings: [],
                suggestions: ['Manual code review recommended'],
                preflightChecks: [{
                    step: 0,
                    description: 'AI Validation',
                    status: 'FAIL',
                    details: `Validation AI error: ${error.message}`
                }]
            };
        }
    }

    async simulateChanges(plan, html) {
        console.log('🎮 Code Validator AI: Using Claude to simulate changes...');
        
        const systemPrompt = `You are a code simulation specialist. Your job is to mentally apply planned changes to code and validate the result would be syntactically correct and functionally sound.

SIMULATION PROCESS:
1. Apply each change step sequentially
2. Check if resulting code is valid Three.js
3. Verify all references resolve correctly
4. Confirm the changes achieve the intended goal

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "success": true/false,
  "steps": [
    {
      "step": 1,
      "description": "step description",
      "success": true/false,
      "issues": ["any problems found"]
    }
  ],
  "finalHTML": "resulting code if successful",
  "errors": ["critical issues that caused failure"]
}`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 6000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Simulate applying these changes to the code:

CHANGE PLAN:
${JSON.stringify(plan, null, 2)}

ORIGINAL CODE:
${html}

Apply each step mentally and return the simulation results. Return ONLY the JSON object.`
                }]
            });

            const aiResponse = response.content[0].text.trim();
            
            let cleanResponse = aiResponse;
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }

            const simulation = JSON.parse(cleanResponse);
            
            console.log(`✅ Simulation AI Complete: ${simulation.success ? 'SUCCESS' : 'FAILED'}`);

            return simulation;

        } catch (error) {
            console.error('❌ Simulation AI failed:', error.message);
            
            return {
                success: false,
                steps: [],
                finalHTML: null,
                errors: [`AI simulation failed: ${error.message}`]
            };
        }
    }
}

module.exports = CodeValidator;