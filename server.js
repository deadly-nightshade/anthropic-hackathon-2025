const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from root directory (for default_room.html, etc.)
app.use(express.static('.'));

// Serve built React app
app.use(express.static('dist'));

// Store current room state
let currentRoomHTML = '';
let roomHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 20; // Limit history to prevent memory issues

// Helper function to add state to history
function addToHistory(html, operation = 'edit') {
    // Remove any future history if we're not at the end
    if (historyIndex < roomHistory.length - 1) {
        roomHistory = roomHistory.slice(0, historyIndex + 1);
    }
    
    // Add new state
    roomHistory.push({
        html: html,
        operation: operation,
        timestamp: new Date().toISOString()
    });
    
    // Limit history size
    if (roomHistory.length > MAX_HISTORY) {
        roomHistory.shift();
    } else {
        historyIndex++;
    }
    
    console.log(`📚 Added to history: ${operation} (${historyIndex + 1}/${roomHistory.length})`);
}

// Helper function to add line numbers to HTML for AI reference
function addLineNumbers(html) {
    return html.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
}

// Diff processor to apply changes to HTML
function applyDiffToHTML(html, diffObject) {
    try {
        const lines = html.split('\n');
        const changes = diffObject.changes || [];
        
        console.log(`🔧 Applying ${changes.length} diff operations...`);
        
        // Sort changes by line number in reverse order to avoid line number shifts
        const sortedChanges = changes.sort((a, b) => {
            const getLineNumber = (change) => {
                if (change.type === 'insert') return change.after_line;
                if (change.type === 'replace') return change.line;
                if (change.type === 'delete') return change.start_line;
                return 0;
            };
            return getLineNumber(b) - getLineNumber(a);
        });
        
        for (const change of sortedChanges) {
            console.log(`   ${change.type} operation at line ${change.line || change.after_line || change.start_line}`);
            
            if (change.type === 'insert') {
                // Insert new content after specified line
                const insertIndex = change.after_line;
                const newLines = change.content.split('\n');
                lines.splice(insertIndex, 0, ...newLines);
                
            } else if (change.type === 'replace') {
                // Replace exact text on specified line
                const lineIndex = change.line - 1; // Convert to 0-based
                if (lineIndex >= 0 && lineIndex < lines.length) {
                    const currentLine = lines[lineIndex];
                    if (currentLine.includes(change.old)) {
                        lines[lineIndex] = currentLine.replace(change.old, change.new);
                    } else {
                        console.warn(`⚠️ Could not find "${change.old}" on line ${change.line}`);
                    }
                }
                
            } else if (change.type === 'delete') {
                // Delete lines from start_line to end_line (inclusive)
                const startIndex = change.start_line - 1; // Convert to 0-based
                const endIndex = change.end_line - 1;
                const deleteCount = endIndex - startIndex + 1;
                lines.splice(startIndex, deleteCount);
            }
        }
        
        console.log('✅ All diff operations applied successfully');
        return lines.join('\n');
        
    } catch (error) {
        console.error('❌ Error applying diff:', error);
        throw new Error(`Failed to apply diff: ${error.message}`);
    }
}

// Load default room on startup
async function loadDefaultRoom() {
    try {
        currentRoomHTML = await fs.readFile('./default_room.html', 'utf8');
        console.log('✅ Default room loaded successfully');
    } catch (error) {
        console.error('❌ Error loading default room:', error.message);
        process.exit(1);
    }
}

// AI room editing endpoint
app.post('/api/edit-room', async (req, res) => {
    try {
        const { prompt, currentHTML } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`🎨 Processing room edit request: "${prompt}"`);

        // Update current HTML if provided
        if (currentHTML) {
            currentRoomHTML = currentHTML;
        }

        // Create the AI prompt for room editing
        const systemPrompt = `You are an expert Three.js developer and 3D room designer. You receive HTML containing a complete 3D room scene built with Three.js, and user requests to modify it.

Your task is to analyze the HTML and return ONLY a JSON object with specific line-based changes to implement the user's request.

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

OPERATION TYPES:
- "insert": Add new code after specified line number
- "replace": Replace exact text on specified line  
- "delete": Remove lines from start_line to end_line (inclusive)

RULES:
- Line numbers are 1-based (first line = 1)
- For "replace": provide exact text that exists on that line
- For "insert": new content will be added as new line(s) after the specified line
- Keep existing functionality intact unless specifically requested to change
- Focus on minimal, precise changes to achieve the user's request
- When adding objects, insert Three.js code in appropriate locations (materials, functions, scene building)

EXAMPLES:
- To add a red sofa: Insert material definition, create function, add to scene
- To change wall color: Replace the color value in materials.wall
- To remove object: Delete the creation function and scene.add() call

Analyze the current HTML line by line and return precise diff operations to implement the requested changes.`;

        // Send request to Anthropic
        const response = await anthropic.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 4000,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: `Current room HTML (with line numbers for reference):
${addLineNumbers(currentRoomHTML)}

User request: "${prompt}"

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
            
            diffObject = JSON.parse(cleanResponse);
            console.log('✅ Successfully parsed diff object');
            console.log('🔧 Found', diffObject.changes?.length || 0, 'changes');
            
        } catch (parseError) {
            console.error('❌ Failed to parse AI response as JSON:', parseError.message);
            console.log('Raw response:', aiResponse);
            throw new Error(`AI returned invalid JSON: ${parseError.message}`);
        }
        
        // Apply diff to current HTML
        const updatedHTML = applyDiffToHTML(currentRoomHTML, diffObject);
        
        // Update current room state
        currentRoomHTML = updatedHTML;

        // Add to history
        addToHistory(updatedHTML, 'edit');

        console.log('✅ Room edit completed successfully with diff system');

        res.json({
            success: true,
            html: updatedHTML,
            originalPrompt: prompt,
            changesApplied: diffObject.changes?.length || 0
        });

    } catch (error) {
        console.error('❌ Error processing room edit:', error);
        res.status(500).json({
            error: 'Failed to process room edit',
            details: error.message
        });
    }
});

// Get current room state
app.get('/api/current-room', (req, res) => {
    res.json({
        html: currentRoomHTML
    });
});

// Reset to default room
app.post('/api/reset-room', async (req, res) => {
    try {
        await loadDefaultRoom();
        addToHistory(currentRoomHTML, 'reset');
        res.json({
            success: true,
            html: currentRoomHTML
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to reset room',
            details: error.message
        });
    }
});

// Undo endpoint
app.post('/api/undo', (req, res) => {
    try {
        if (historyIndex > 0) {
            historyIndex--;
            currentRoomHTML = roomHistory[historyIndex].html;
            console.log(`⬅️ Undo: moved to history ${historyIndex + 1}/${roomHistory.length}`);
            
            res.json({
                success: true,
                html: currentRoomHTML,
                canUndo: historyIndex > 0,
                canRedo: historyIndex < roomHistory.length - 1
            });
        } else {
            res.json({
                success: false,
                message: 'Nothing to undo',
                canUndo: false,
                canRedo: historyIndex < roomHistory.length - 1
            });
        }
    } catch (error) {
        console.error('❌ Error during undo:', error);
        res.status(500).json({
            error: 'Failed to undo',
            details: error.message
        });
    }
});

// Redo endpoint
app.post('/api/redo', (req, res) => {
    try {
        if (historyIndex < roomHistory.length - 1) {
            historyIndex++;
            currentRoomHTML = roomHistory[historyIndex].html;
            console.log(`➡️ Redo: moved to history ${historyIndex + 1}/${roomHistory.length}`);
            
            res.json({
                success: true,
                html: currentRoomHTML,
                canUndo: historyIndex > 0,
                canRedo: historyIndex < roomHistory.length - 1
            });
        } else {
            res.json({
                success: false,
                message: 'Nothing to redo',
                canUndo: historyIndex > 0,
                canRedo: false
            });
        }
    } catch (error) {
        console.error('❌ Error during redo:', error);
        res.status(500).json({
            error: 'Failed to redo',
            details: error.message
        });
    }
});

// Get history status
app.get('/api/history-status', (req, res) => {
    res.json({
        canUndo: historyIndex > 0,
        canRedo: historyIndex < roomHistory.length - 1,
        historyLength: roomHistory.length,
        currentIndex: historyIndex
    });
});

// AI Item Generator endpoint
app.post('/api/generate-item', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log(`✨ Generating 3D item: "${description}"`);

        // Send request to Anthropic
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `You are a 3D object designer. Generate detailed specifications for a 3D object based on this description: "${description}"

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "type": "lamp|plant|chair|table|generic",
  "name": "Short descriptive name",
  "color": "#HEXCOLOR",
  "details": {
    "size": "small|medium|large",
    "style": "modern|vintage|minimal|decorative",
    "specialFeatures": ["feature1", "feature2"]
  }
}

Choose the most appropriate type. Use creative colors that match the description.`
            }]
        });

        const aiResponse = response.content[0].text.trim();
        
        // Parse the JSON response
        let itemSpec;
        try {
            // Clean response by removing any markdown code blocks if present
            let cleanResponse = aiResponse;
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                itemSpec = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON object found in response');
            }
            
            console.log('✅ Generated item spec:', itemSpec);
            
        } catch (parseError) {
            console.warn('⚠️ Failed to parse Claude response, using fallback');
            // Fallback if parsing fails
            itemSpec = {
                type: 'generic',
                name: 'AI Object',
                color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                details: {
                    size: 'medium',
                    style: 'modern',
                    specialFeatures: []
                }
            };
        }

        res.json({
            success: true,
            itemSpec: itemSpec,
            originalDescription: description
        });

    } catch (error) {
        console.error('❌ Error generating item:', error);
        res.status(500).json({
            error: 'Failed to generate item',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve landing page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve React app for all other routes (must be after API routes)
app.get('*', (req, res) => {
    const requestedPath = path.join(__dirname, req.path);
    // If file exists, serve it (for default_room.html, editor.html, etc.)
    if (require('fs').existsSync(requestedPath) && require('fs').statSync(requestedPath).isFile()) {
        res.sendFile(requestedPath);
    } else {
        // Otherwise serve React app
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});

// Start server
async function startServer() {
    await loadDefaultRoom();
    addToHistory(currentRoomHTML, 'initial'); // Add initial state to history
    
    app.listen(PORT, () => {
        console.log(`🚀 AI Room Editor Server running on http://localhost:${PORT}`);
        console.log(`🎨 Open http://localhost:${PORT}/editor.html to start editing!`);
    });
}

startServer().catch(console.error);