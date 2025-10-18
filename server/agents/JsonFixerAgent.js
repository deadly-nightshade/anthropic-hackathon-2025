const { Anthropic } = require('@anthropic-ai/sdk');

class JsonFixerAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
    }

    async fixMalformedJson(rawResponse, expectedSchema = null, context = {}) {
        console.log('🔧 JSON Fixer Agent: Attempting to fix malformed JSON...');
        
        try {
            // First attempt: Try basic cleaning
            const basicClean = this.performBasicCleaning(rawResponse);
            
            try {
                const parsed = JSON.parse(basicClean);
                console.log('✅ JSON fixed with basic cleaning');
                return { success: true, data: parsed, method: 'basic_cleaning' };
            } catch (e) {
                // Basic cleaning failed, try AI-powered fixing
                return await this.aiFixJson(rawResponse, expectedSchema, context);
            }
        } catch (error) {
            console.error('❌ JSON Fixer Agent failed:', error.message);
            return { 
                success: false, 
                error: error.message,
                fallback: this.generateFallbackJson(context)
            };
        }
    }

    performBasicCleaning(text) {
        let cleaned = text.trim();
        
        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*\n?([\s\S]*?)\n?\s*```/g, '$1');
        cleaned = cleaned.replace(/```\s*\n?([\s\S]*?)\n?\s*```/g, '$1');
        
        // Find JSON boundaries
        const openBrace = cleaned.indexOf('{');
        const closeBrace = cleaned.lastIndexOf('}');
        
        if (openBrace !== -1 && closeBrace !== -1 && closeBrace > openBrace) {
            cleaned = cleaned.substring(openBrace, closeBrace + 1);
        }
        
        // Fix common JSON issues
        cleaned = cleaned
            .replace(/,(\s*[}\]])/g, '$1')           // Remove trailing commas
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
            .replace(/:\s*'([^']*)'/g, ':"$1"')      // Convert single to double quotes
            .replace(/\n/g, ' ')                     // Remove line breaks
            .replace(/\t/g, ' ')                     // Remove tabs  
            .replace(/\s+/g, ' ')                    // Collapse multiple spaces
            .replace(/\\n/g, '\\\\n')                // Escape newlines in strings
            .trim();
        
        return cleaned;
    }

    async aiFixJson(rawResponse, expectedSchema, context) {
        console.log('🤖 Using AI to fix complex JSON issues...');
        
        const systemPrompt = `You are a JSON repair specialist. Your job is to fix malformed JSON and ensure it matches the expected schema.

TASK: Fix the malformed JSON response and return valid JSON.

EXPECTED SCHEMA:
${expectedSchema ? JSON.stringify(expectedSchema, null, 2) : `
{
  "changes": [
    {
      "type": "insert|replace|delete",
      "description": "string", 
      "after_line": number,
      "content": "string",
      "line": number,
      "old": "string",
      "new": "string"
    }
  ],
  "metadata": {
    "strategy": "string",
    "generatedBy": "string"
  }
}
`}

RULES:
1. Return ONLY valid JSON
2. Preserve original intent and content
3. Fix syntax errors (missing quotes, trailing commas, etc.)
4. Ensure all required fields are present
5. If content is truncated, complete it logically
6. Keep string content intact but fix JSON structure

CONTEXT: ${JSON.stringify(context)}`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 1500,
                temperature: 0,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Fix this malformed JSON:

\`\`\`
${rawResponse}
\`\`\`

Return the corrected JSON that matches the expected schema.`
                }]
            });

            const fixedJson = response.content[0].text.trim();
            
            // Clean the AI response
            let cleaned = fixedJson;
            if (cleaned.includes('```json')) {
                cleaned = cleaned.replace(/```json\s*\n?([\s\S]*?)\n?\s*```/g, '$1');
            } else if (cleaned.includes('```')) {
                cleaned = cleaned.replace(/```\s*\n?([\s\S]*?)\n?\s*```/g, '$1');
            }
            
            // Validate the fixed JSON
            const parsed = JSON.parse(cleaned);
            
            console.log('✅ JSON successfully fixed by AI');
            return { success: true, data: parsed, method: 'ai_fixing' };
            
        } catch (error) {
            console.error('❌ AI JSON fixing failed:', error.message);
            
            // Try manual extraction as last resort
            return this.manualJsonExtraction(rawResponse, context);
        }
    }

    manualJsonExtraction(rawResponse, context) {
        console.log('🔨 Attempting manual JSON extraction...');
        
        try {
            // Try to extract key components manually
            const result = {
                changes: [],
                metadata: {
                    strategy: 'manual_extraction',
                    generatedBy: 'JsonFixerAgent',
                    originalError: 'JSON parsing failed, used manual extraction'
                }
            };
            
            // Extract changes array content
            const changesMatch = rawResponse.match(/"changes"\s*:\s*\[([\s\S]*?)\]/);
            if (changesMatch) {
                const changesContent = changesMatch[1];
                
                // Try to extract individual change objects
                const changeObjects = this.extractChangeObjects(changesContent);
                result.changes = changeObjects;
            }
            
            // Extract metadata if present
            const metadataMatch = rawResponse.match(/"metadata"\s*:\s*\{([^}]*)\}/);
            if (metadataMatch) {
                try {
                    const metadataObj = JSON.parse('{' + metadataMatch[1] + '}');
                    result.metadata = { ...result.metadata, ...metadataObj };
                } catch (e) {
                    // Keep default metadata
                }
            }
            
            console.log('✅ Manual extraction completed');
            return { success: true, data: result, method: 'manual_extraction' };
            
        } catch (error) {
            console.error('❌ Manual extraction failed:', error.message);
            
            // Return fallback JSON
            return { 
                success: false, 
                error: 'All JSON fixing methods failed',
                fallback: this.generateFallbackJson(context)
            };
        }
    }

    extractChangeObjects(changesText) {
        const changes = [];
        
        // Try to match complete change objects
        const changePattern = /\{\s*"?type"?\s*:\s*"([^"]*)"[\s\S]*?\}/g;
        let match;
        
        while ((match = changePattern.exec(changesText)) !== null) {
            try {
                const changeObj = JSON.parse(match[0]);
                changes.push(changeObj);
            } catch (e) {
                // Try to construct object manually
                const type = match[1];
                const manualObj = this.constructChangeObject(match[0], type);
                if (manualObj) {
                    changes.push(manualObj);
                }
            }
        }
        
        return changes;
    }

    constructChangeObject(objectText, type) {
        try {
            // Extract common fields manually
            const descMatch = objectText.match(/"description"\s*:\s*"([^"]*)"/);
            const contentMatch = objectText.match(/"content"\s*:\s*"([\s\S]*?)"/);
            const lineMatch = objectText.match(/"(?:after_line|line)"\s*:\s*(\d+)/);
            
            const changeObj = { type: type };
            
            if (descMatch) changeObj.description = descMatch[1];
            if (contentMatch) changeObj.content = contentMatch[1];
            if (lineMatch) {
                const lineNum = parseInt(lineMatch[1]);
                if (objectText.includes('after_line')) {
                    changeObj.after_line = lineNum;
                } else {
                    changeObj.line = lineNum;
                }
            }
            
            // Ensure required fields
            if (!changeObj.description) {
                changeObj.description = `${type} operation`;
            }
            
            return changeObj;
            
        } catch (error) {
            return null;
        }
    }

    generateFallbackJson(context = {}) {
        console.log('🔄 Generating fallback JSON structure...');
        
        const userPrompt = context.userPrompt || context.prompt || '';
        const prompt = userPrompt.toLowerCase();
        
        // Generate appropriate fallback based on context
        if (prompt.includes('bed')) {
            return {
                changes: [{
                    type: "insert",
                    description: "Add a bed (fallback)",
                    after_line: 2900,
                    content: "// Fallback bed creation function"
                }],
                metadata: {
                    strategy: 'fallback_json_generation',
                    generatedBy: 'JsonFixerAgent',
                    note: 'Generated due to JSON parsing failure'
                }
            };
        }
        
        // Default fallback
        return {
            changes: [],
            metadata: {
                strategy: 'empty_fallback',
                generatedBy: 'JsonFixerAgent',
                error: 'Unable to parse or fix JSON response',
                context: context
            }
        };
    }

    // Utility method to validate JSON against schema
    validateJsonSchema(data, expectedSchema) {
        if (!expectedSchema) return true;
        
        try {
            // Basic validation for common schema patterns
            if (expectedSchema.changes && !Array.isArray(data.changes)) {
                return false;
            }
            
            if (expectedSchema.metadata && typeof data.metadata !== 'object') {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    getStats() {
        return {
            agent: 'JsonFixerAgent',
            capabilities: [
                'JSON syntax error detection and repair',
                'Malformed response recovery', 
                'Schema validation and correction',
                'Manual content extraction',
                'Fallback JSON generation',
                'AI-powered complex JSON fixing'
            ],
            fixingMethods: [
                'Basic text cleaning and regex fixes',
                'AI-powered intelligent JSON repair',
                'Manual extraction of key components',
                'Context-aware fallback generation'
            ]
        };
    }
}

module.exports = JsonFixerAgent;