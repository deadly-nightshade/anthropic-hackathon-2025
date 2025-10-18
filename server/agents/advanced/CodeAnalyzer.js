const { Anthropic } = require('@anthropic-ai/sdk');

class CodeAnalyzer {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
    }

    async analyzeThreeJSScene(html) {
        console.log('🔍 Code Analyzer AI: Using Claude to analyze Three.js scene structure...');
        
        const systemPrompt = `You are a specialized Three.js code analyst. Your job is to deeply analyze Three.js scene code and extract comprehensive information about its structure.

ANALYSIS TARGETS:
- Materials (names, types, colors, properties, line numbers)
- Functions (creation functions, parameters, purpose)  
- Scene objects (what's added to scene, positioning)
- Code style (indentation, naming conventions)
- Dependencies (which functions use which materials)
- Insertion points (where new code can be safely added)

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "valid": true/false,
  "issues": ["list of any problems found"],
  "analysis": {
    "materials": [
      {
        "name": "material_name",
        "type": "MeshStandardMaterial", 
        "line": 123,
        "content": "full line content",
        "color": "0xffffff",
        "colorLine": 124
      }
    ],
    "functions": [
      {
        "name": "createDesk",
        "startLine": 200,
        "endLine": 250,
        "content": "full function code"
      }
    ],
    "sceneObjects": [
      {
        "call": "createDesk()",
        "line": 300,
        "content": "scene.add(createDesk());"
      }
    ],
    "insertionPoints": {
      "materialsEnd": 150,
      "afterLastFunction": 500,
      "afterLastSceneAdd": 600
    },
    "codeStyle": {
      "indentation": 4,
      "usesTabsOverSpaces": false,
      "functionNaming": "camelCase"
    },
    "dependencies": {
      "createDesk": {
        "materials": ["wood", "metal"],
        "geometries": ["BoxGeometry"]
      }
    }
  }
}

Be thorough and accurate. Extract ALL materials, functions, and scene objects.`;

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 4000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: `Analyze this Three.js scene code and provide comprehensive structural analysis:

${html}

Return ONLY the JSON analysis object.`
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

            const analysisResult = JSON.parse(cleanResponse);
            
            console.log(`✅ Code Analysis AI Complete:
   - Materials: ${analysisResult.analysis?.materials?.length || 0}
   - Functions: ${analysisResult.analysis?.functions?.length || 0} 
   - Scene Objects: ${analysisResult.analysis?.sceneObjects?.length || 0}
   - Valid: ${analysisResult.valid}`);

            return analysisResult;

        } catch (error) {
            console.error('❌ Code Analyzer AI failed:', error.message);
            
            // Return fallback structure
            return {
                valid: false,
                issues: [`AI analysis failed: ${error.message}`],
                analysis: {
                    materials: [],
                    functions: [],
                    sceneObjects: [],
                    insertionPoints: {},
                    codeStyle: { indentation: 4, usesTabsOverSpaces: false, functionNaming: 'camelCase' },
                    dependencies: {}
                }
            };
        }
    }

    // Keep the validateCodeStructure method but make it use the AI analysis
    async validateCodeStructure(html) {
        return await this.analyzeThreeJSScene(html);
    }
}

module.exports = CodeAnalyzer;