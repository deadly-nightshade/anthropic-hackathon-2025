const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const AgentLogger = require('../utils/AgentLogger');

class RoomAnalyzerAgent {
    constructor(anthropicClient) {
        this.anthropic = anthropicClient;
        this.model = process.env.DESCRIPTION_MODEL || "claude-3-5-haiku-20241022"; // Default fallback
    }

    async analyzeRoom(html) {
        console.log('🔍 Room Analyzer Agent: Analyzing room from HTML...');
        
        const analysisPrompt = `You are a Room Analyzer Agent. Analyze the provided Three.js HTML code and create a comprehensive JSON description of the room.

HTML Code to analyze:
${html}

Create a detailed JSON structure that includes:
1. Overall room style (modern, traditional, minimalist, etc.)
2. Color palette and materials
3. Every object in the room with:
   - Type (furniture, decoration, lighting, etc.)
   - Position (x, y, z coordinates or relative description)
   - Dimensions/scale
   - Color/material
   - Style characteristics
   - Relationships to other objects
4. Lighting setup
5. Spatial layout and flow

Return ONLY a valid JSON object with this structure:
{
  "room_style": {
    "primary_style": "string",
    "characteristics": ["array", "of", "style", "traits"],
    "color_palette": {
      "primary_colors": ["#hex1", "#hex2"],
      "accent_colors": ["#hex3", "#hex4"],
      "materials": ["material1", "material2"]
    }
  },
  "objects": [
    {
      "id": "unique_identifier",
      "type": "furniture/decoration/lighting/structural",
      "category": "sofa/table/lamp/wall/etc",
      "position": {"x": 0, "y": 0, "z": 0, "relative": "description"},
      "dimensions": {"width": 0, "height": 0, "depth": 0},
      "style": {
        "shape": "geometric/organic/curved/angular",
        "color": "#hexcode",
        "material": "wood/metal/fabric/etc",
        "texture": "smooth/rough/soft/etc"
      },
      "interactions": ["objects it relates to"],
      "description": "detailed visual description"
    }
  ],
  "lighting": {
    "ambient": "description",
    "task": "description", 
    "accent": "description",
    "color_temperature": "warm/cool/neutral"
  },
  "spatial_layout": {
    "room_dimensions": "description",
    "traffic_flow": "description",
    "focal_points": ["array of focal areas"],
    "zones": ["seating", "work", "storage", "etc"]
  }
}

Be extremely detailed and accurate. This JSON will be used by other agents to understand the room without seeing the HTML.`;

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 4000,
            temperature: 0.1,
            messages: [{
                role: "user",
                content: analysisPrompt
            }]
        });

        try {
            const analysisText = response.content[0].text.trim();
            let cleanResponse = analysisText;
            
            // Clean any markdown formatting
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }
            
            const roomJson = JSON.parse(cleanResponse);
            console.log('✅ Room Analyzer: Successfully created room description');
            console.log(`   - Found ${roomJson.objects?.length || 0} objects`);
            console.log(`   - Style: ${roomJson.room_style?.primary_style || 'unknown'}`);
            
            await AgentLogger.logAgent('RoomAnalyzerAgent', analysisPrompt, roomJson);
            return roomJson;
        } catch (error) {
            console.error('❌ Room Analyzer: Failed to parse room description:', error.message);
            await AgentLogger.logAgent('RoomAnalyzerAgent', analysisPrompt, null, { error: error.message });
            throw new Error(`Room analysis failed: ${error.message}`);
        }
    }

    async updateRoomDescription(currentDescription, changes) {
        console.log('🔄 Room Analyzer Agent: Updating room description with changes...');
        
        const updatePrompt = `You are a Room Analyzer Agent. Update the existing room description JSON based on the changes that were applied.

Current Room Description:
${JSON.stringify(currentDescription, null, 2)}

Changes Applied:
${JSON.stringify(changes, null, 2)}

Update the room description JSON to reflect the changes. Maintain the same structure but update:
1. Modified objects (position, color, style, etc.)
2. New objects that were added
3. Removed objects (delete from array)
4. Updated color palette if colors changed
5. Updated style characteristics if style evolved
6. Updated spatial layout if positioning changed

Analyze the changes array to understand what modifications were made:
- "insert" operations typically add new objects or features
- "replace" operations modify existing properties like colors, materials, or positions
- "delete" operations remove objects or features

Return ONLY the updated JSON object with the same structure as the original.`;

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 4000,
            temperature: 0.1,
            messages: [{
                role: "user",
                content: updatePrompt
            }]
        });

        try {
            const updateText = response.content[0].text.trim();
            let cleanResponse = updateText;
            
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\n([\s\S]*?)\n```/, '$1');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n([\s\S]*?)\n```/, '$1');
            }
            
            const updatedDescription = JSON.parse(cleanResponse);
            console.log('✅ Room Analyzer: Successfully updated room description');
            
            await AgentLogger.logAgent('RoomAnalyzerAgent', updatePrompt, updatedDescription);
            return updatedDescription;
        } catch (error) {
            console.error('❌ Room Analyzer: Failed to update room description:', error.message);
            await AgentLogger.logAgent('RoomAnalyzerAgent', updatePrompt, null, { error: error.message });
            throw error;
        }
    }

    async saveDescription(description, filePath) {
        try {
            await fs.writeFile(filePath, JSON.stringify(description, null, 2));
            console.log('💾 Room description saved to file');
        } catch (error) {
            console.error('❌ Failed to save room description:', error.message);
        }
    }

    async loadDescription(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const description = JSON.parse(data);
            console.log('📁 Room description loaded from file');
            return description;
        } catch (error) {
            console.log('📁 No existing room description file found');
            return null;
        }
    }
}

module.exports = RoomAnalyzerAgent;