const fs = require('fs').promises;

class RoomUtils {
    static async saveRoomHTML(filePath, html) {
        try {
            await fs.writeFile(filePath, html);
            console.log('💾 Room HTML saved to file');
        } catch (error) {
            console.error('❌ Failed to save room HTML:', error.message);
            throw error;
        }
    }

    static async loadRoomHTML(filePath) {
        try {
            const html = await fs.readFile(filePath, 'utf8');
            console.log('📁 Room HTML loaded from file');
            return html;
        } catch (error) {
            console.log('📁 No existing room file found');
            return null;
        }
    }

    static addLineNumbers(html) {
        return html.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
    }

    static applyDiffToHTML(html, diffObject) {
        try {
            if (!html) {
                throw new Error('HTML content is required');
            }
            
            if (!diffObject || !diffObject.changes) {
                console.log('⚠️ No changes to apply in diff object');
                return html;
            }
            
            const lines = html.split('\n');
            const changes = diffObject.changes || [];
            
            console.log(`🔧 Applying ${changes.length} diff operations...`);
            
            // Sort changes by line number in reverse order to avoid line number shifts
            const sortedChanges = changes.sort((a, b) => {
                const getLineNumber = (change) => {
                    if (change.type === 'insert') return change.after_line || 0;
                    if (change.type === 'replace') return change.line || 0;
                    if (change.type === 'delete') return change.start_line || 0;
                    return 0;
                };
                return getLineNumber(b) - getLineNumber(a);
            });
            
            for (const change of sortedChanges) {
                console.log(`   ${change.type} operation at line ${change.line || change.after_line || change.start_line}`);
                
                if (change.type === 'insert') {
                    // Insert new content after specified line
                    const insertIndex = change.after_line || 0;
                    
                    // Check if content exists and is a string
                    if (!change.content) {
                        console.warn(`⚠️ Insert operation missing content at line ${insertIndex}`);
                        continue;
                    }
                    
                    const newLines = typeof change.content === 'string' ? 
                        change.content.split('\n') : [String(change.content)];
                    lines.splice(insertIndex, 0, ...newLines);
                    
                } else if (change.type === 'replace') {
                    // Replace exact text on specified line
                    const lineIndex = (change.line || 1) - 1; // Convert to 0-based
                    
                    if (!change.old && !change.new) {
                        console.warn(`⚠️ Replace operation missing old/new values at line ${change.line}`);
                        continue;
                    }
                    
                    if (lineIndex >= 0 && lineIndex < lines.length) {
                        const currentLine = lines[lineIndex];
                        const oldValue = change.old || change.oldValue || '';
                        const newValue = change.new || change.newValue || '';
                        
                        if (currentLine.includes(oldValue)) {
                            lines[lineIndex] = currentLine.replace(oldValue, newValue);
                        } else {
                            console.warn(`⚠️ Could not find "${oldValue}" on line ${change.line}`);
                            console.warn(`   Line content: "${currentLine}"`);
                        }
                    } else {
                        console.warn(`⚠️ Line ${change.line} out of bounds (file has ${lines.length} lines)`);
                    }
                    
                } else if (change.type === 'delete') {
                    // Delete lines from start_line to end_line (inclusive)
                    const startIndex = (change.start_line || 1) - 1; // Convert to 0-based
                    const endIndex = (change.end_line || change.start_line || 1) - 1;
                    
                    if (startIndex >= 0 && startIndex < lines.length && endIndex >= startIndex) {
                        const deleteCount = endIndex - startIndex + 1;
                        lines.splice(startIndex, deleteCount);
                    } else {
                        console.warn(`⚠️ Invalid delete range: ${change.start_line}-${change.end_line}`);
                    }
                } else {
                    console.warn(`⚠️ Unknown change type: ${change.type}`);
                }
            }
            
            console.log('✅ All diff operations applied successfully');
            return lines.join('\n');
            
        } catch (error) {
            console.error('❌ Error applying diff:', error);
            console.error('❌ Diff object structure:', JSON.stringify(diffObject, null, 2));
            throw new Error(`Failed to apply diff: ${error.message}`);
        }
    }
}

module.exports = RoomUtils;