const fs = require('fs');

class RobustDiffApplicator {
    constructor() {
        this.debugMode = process.env.NODE_ENV === 'development';
    }

    async applyDiff(htmlContent, diffObject, options = {}) {
        console.log('🔧 Robust Diff Applicator: Starting safe application...');
        
        const {
            allowPartialSuccess = true,
            maxRetries = 3,
            backupOriginal = true,
            validateResult = true
        } = options;

        let workingContent = htmlContent;
        const results = {
            success: true,
            appliedChanges: [],
            failedChanges: [],
            warnings: [],
            lineShifts: 0
        };

        // Step 1: Backup original if requested
        if (backupOriginal) {
            this.createBackup(htmlContent);
        }

        // Step 2: Pre-process and validate changes
        const processedChanges = this.preprocessChanges(diffObject.changes, workingContent);
        
        // Step 3: Apply changes with content-based matching
        for (const change of processedChanges) {
            try {
                const result = await this.applyChangeRobustly(workingContent, change);
                
                if (result.success) {
                    workingContent = result.content;
                    results.appliedChanges.push({
                        ...change,
                        actualLine: result.actualLine,
                        lineShift: result.lineShift
                    });
                    results.lineShifts += result.lineShift;
                } else {
                    results.failedChanges.push({
                        ...change,
                        error: result.error,
                        suggestion: result.suggestion
                    });
                    
                    if (!allowPartialSuccess) {
                        results.success = false;
                        break;
                    }
                }
            } catch (error) {
                console.error(`❌ Failed to apply change:`, error.message);
                results.failedChanges.push({
                    ...change,
                    error: error.message
                });
                
                if (!allowPartialSuccess) {
                    results.success = false;
                    break;
                }
            }
        }

        // Step 4: Validate final result
        if (validateResult && results.success) {
            const validation = this.validateResult(workingContent);
            if (!validation.valid) {
                results.warnings.push(...validation.warnings);
                if (validation.critical) {
                    results.success = false;
                }
            }
        }

        // Step 5: Generate summary
        const summary = this.generateSummary(results);
        console.log(summary);

        return {
            content: workingContent,
            ...results,
            summary
        };
    }

    preprocessChanges(changes, content) {
        console.log('🔍 Pre-processing changes for stability...');
        const lines = content.split('\n');
        
        // Sort changes by line number (descending) to avoid line shift issues
        const sortedChanges = [...changes].sort((a, b) => {
            const lineA = a.line || a.after_line || 0;
            const lineB = b.line || b.after_line || 0;
            return lineB - lineA;
        });

        // Add content anchors for better matching
        return sortedChanges.map(change => {
            const processedChange = { ...change };
            
            if (change.line && change.line > 0 && change.line <= lines.length) {
                const targetLine = change.line - 1; // Convert to 0-based
                processedChange.anchor = {
                    content: lines[targetLine]?.trim() || '',
                    before: targetLine > 0 ? lines[targetLine - 1]?.trim() || '' : '',
                    after: targetLine < lines.length - 1 ? lines[targetLine + 1]?.trim() || '' : ''
                };
            }
            
            return processedChange;
        });
    }

    async applyChangeRobustly(content, change) {
        const lines = content.split('\n');
        
        switch (change.type) {
            case 'replace':
                return this.applyReplace(lines, change);
            case 'insert':
                return this.applyInsert(lines, change);
            case 'delete':
                return this.applyDelete(lines, change);
            default:
                return {
                    success: false,
                    error: `Unknown change type: ${change.type}`
                };
        }
    }

    applyReplace(lines, change) {
        const { line, old: oldText, new: newText, anchor } = change;
        
        // Method 1: Try exact line match
        if (line && line > 0 && line <= lines.length) {
            const targetLineIndex = line - 1;
            const currentLine = lines[targetLineIndex];
            
            if (currentLine.includes(oldText)) {
                lines[targetLineIndex] = currentLine.replace(oldText, newText);
                return {
                    success: true,
                    content: lines.join('\n'),
                    actualLine: line,
                    lineShift: 0
                };
            }
        }

        // Method 2: Try content-based matching with anchor
        if (anchor && anchor.content) {
            for (let i = 0; i < lines.length; i++) {
                const currentLine = lines[i].trim();
                
                if (currentLine === anchor.content && lines[i].includes(oldText)) {
                    lines[i] = lines[i].replace(oldText, newText);
                    return {
                        success: true,
                        content: lines.join('\n'),
                        actualLine: i + 1,
                        lineShift: 0
                    };
                }
            }
        }

        // Method 3: Fuzzy search for old text
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(oldText)) {
                lines[i] = lines[i].replace(oldText, newText);
                console.log(`⚠️ Applied replace using fuzzy match at line ${i + 1} instead of ${line}`);
                return {
                    success: true,
                    content: lines.join('\n'),
                    actualLine: i + 1,
                    lineShift: 0
                };
            }
        }

        return {
            success: false,
            error: `Could not find text "${oldText}" to replace`,
            suggestion: `Text may have been modified or line numbers shifted`
        };
    }

    applyInsert(lines, change) {
        const { after_line, content } = change;
        
        if (after_line >= 0 && after_line <= lines.length) {
            lines.splice(after_line, 0, content);
            return {
                success: true,
                content: lines.join('\n'),
                actualLine: after_line + 1,
                lineShift: 1
            };
        }

        return {
            success: false,
            error: `Invalid insert position: ${after_line}`,
            suggestion: `Line number out of range (max: ${lines.length})`
        };
    }

    applyDelete(lines, change) {
        const { start_line, end_line } = change;
        
        if (start_line > 0 && end_line >= start_line && start_line <= lines.length) {
            const startIndex = start_line - 1;
            const endIndex = Math.min(end_line - 1, lines.length - 1);
            const deletedCount = endIndex - startIndex + 1;
            
            lines.splice(startIndex, deletedCount);
            
            return {
                success: true,
                content: lines.join('\n'),
                actualLine: start_line,
                lineShift: -deletedCount
            };
        }

        return {
            success: false,
            error: `Invalid delete range: ${start_line}-${end_line}`,
            suggestion: `Check line numbers are within range (1-${lines.length})`
        };
    }

    validateResult(content) {
        const warnings = [];
        let critical = false;

        // Check for syntax errors
        try {
            // Basic HTML structure check
            if (!content.includes('<script>') || !content.includes('</script>')) {
                warnings.push('Missing script tags');
            }
            
            if (!content.includes('scene.add(')) {
                warnings.push('No scene.add() calls found - objects may not be visible');
            }
            
            // Check for unmatched brackets
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                warnings.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
                critical = true;
            }

        } catch (error) {
            warnings.push(`Validation error: ${error.message}`);
            critical = true;
        }

        return {
            valid: !critical,
            warnings,
            critical
        };
    }

    createBackup(content) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `backup_${timestamp}.html`;
        
        try {
            fs.writeFileSync(backupPath, content);
            console.log(`💾 Backup created: ${backupPath}`);
        } catch (error) {
            console.warn(`⚠️ Failed to create backup: ${error.message}`);
        }
    }

    generateSummary(results) {
        const { appliedChanges, failedChanges, warnings, lineShifts } = results;
        
        return `
🔧 Diff Application Summary:
   ✅ Applied: ${appliedChanges.length} changes
   ❌ Failed: ${failedChanges.length} changes
   ⚠️ Warnings: ${warnings.length}
   📊 Line shifts: ${lineShifts}
   
${failedChanges.length > 0 ? 
`Failed Changes:
${failedChanges.map(f => `   - ${f.description || f.type}: ${f.error}`).join('\n')}` : ''}

${warnings.length > 0 ? 
`Warnings:
${warnings.map(w => `   - ${w}`).join('\n')}` : ''}`;
    }
}

module.exports = RobustDiffApplicator;