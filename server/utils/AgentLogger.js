const fs = require('fs');
const path = require('path');

class AgentLogger {
    static LOGS_DIR = './logs';
    static AGENT_LOG_FILE = null;

    constructor() {
        this.logDir = './logs';
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    static getAgentLogFileName() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // 2025-10-18T16-42-49
        return path.join(this.LOGS_DIR, `agent_logs_${timestamp}.txt`);
    }

    static async logAgent(agentName, input, output, metadata = {}) {
        const timestamp = new Date().toISOString();
        const sessionId = Date.now().toString();
        
        const logEntry = {
            timestamp,
            sessionId,
            agentName,
            input: typeof input === 'string' ? input.substring(0, 1000) + (input.length > 1000 ? '...[truncated]' : '') : input,
            output: typeof output === 'string' ? output.substring(0, 1000) + (output.length > 1000 ? '...[truncated]' : '') : output,
            metadata,
            inputLength: typeof input === 'string' ? input.length : JSON.stringify(input).length,
            outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length
        };

        const logLine = `
===============================================
🤖 AGENT: ${agentName}
⏰ TIME: ${timestamp}
🆔 SESSION: ${sessionId}
📥 INPUT LENGTH: ${logEntry.inputLength} chars
📤 OUTPUT LENGTH: ${logEntry.outputLength} chars
${metadata.userPrompt ? `👤 USER PROMPT: "${metadata.userPrompt}"` : ''}

📥 INPUT:
${typeof input === 'string' ? input.substring(0, 2000) + (input.length > 2000 ? '\n...[truncated for brevity]' : '') : JSON.stringify(input, null, 2)}

📤 OUTPUT:
${typeof output === 'string' ? output.substring(0, 2000) + (output.length > 2000 ? '\n...[truncated for brevity]' : '') : JSON.stringify(output, null, 2)}

${metadata.error ? `❌ ERROR: ${metadata.error}` : '✅ SUCCESS'}
===============================================

`;

        try {
            if (!this.AGENT_LOG_FILE) {
                throw new Error('Agent log file not initialized');
            }
            await fs.promises.appendFile(this.AGENT_LOG_FILE, logLine);
            console.log(`📝 Logged ${agentName} agent activity to ${this.AGENT_LOG_FILE}`);
        } catch (error) {
            console.error('❌ Failed to write agent log:', error.message);
        }
    }

    static async logProcessingSession(userPrompt, agents, finalResult) {
        const timestamp = new Date().toISOString();
        const sessionSummary = `
🎯 MULTI-AGENT SESSION SUMMARY
⏰ TIME: ${timestamp}
👤 USER PROMPT: "${userPrompt}"
🤖 AGENTS USED: ${agents.join(' → ')}
✅ FINAL RESULT: ${finalResult.success ? 'SUCCESS' : 'FAILED'}
📊 CHANGES APPLIED: ${finalResult.changesApplied || 0}

`;

        try {
            if (!this.AGENT_LOG_FILE) {
                throw new Error('Agent log file not initialized');
            }
            await fs.promises.appendFile(this.AGENT_LOG_FILE, sessionSummary);
        } catch (error) {
            console.error('❌ Failed to write session summary:', error.message);
        }
    }

    static async initializeLogs() {
        // Create logs directory if it doesn't exist
        try {
            await fs.promises.mkdir(this.LOGS_DIR, { recursive: true });
        } catch (error) {
            // Directory already exists or other error
        }
        
        // Create new timestamped log file
        this.AGENT_LOG_FILE = this.getAgentLogFileName();
        
        try {
            await fs.promises.writeFile(this.AGENT_LOG_FILE, `🆕 AGENT LOGS STARTED - ${new Date().toISOString()}\n\n`);
            console.log(`🗂️ New agent log file created: ${this.AGENT_LOG_FILE}`);
        } catch (error) {
            console.error('❌ Failed to create new agent log file:', error.message);
        }
    }

    static async logDiffApplication(originalContent, diffObject, applicationResult, context = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type: 'diff_application',
            context,
            diff: {
                changesCount: diffObject.changes?.length || 0,
                strategy: diffObject.metadata?.strategy,
                generatedBy: diffObject.metadata?.generatedBy
            },
            application: {
                success: applicationResult.success,
                appliedChanges: applicationResult.appliedChanges?.length || 0,
                failedChanges: applicationResult.failedChanges?.length || 0,
                warnings: applicationResult.warnings?.length || 0,
                lineShifts: applicationResult.lineShifts || 0
            },
            issues: applicationResult.failedChanges?.map(change => ({
                type: change.type,
                targetLine: change.line || change.after_line,
                error: change.error,
                suggestion: change.suggestion
            })) || [],
            performance: {
                originalLines: originalContent.split('\n').length,
                finalLines: applicationResult.content?.split('\n').length || 0
            }
        };

        // Write to main log
        await this.writeLog('agent_logs.txt', JSON.stringify(logEntry, null, 2) + '\n---\n');

        // Write detailed diff debugging log
        if (applicationResult.failedChanges?.length > 0) {
            await this.writeDiffDebugLog(originalContent, diffObject, applicationResult, logEntry);
        }

        console.log(`📊 Diff Application Logged: ${applicationResult.appliedChanges?.length || 0} applied, ${applicationResult.failedChanges?.length || 0} failed`);
    }

    static async writeDiffDebugLog(originalContent, diffObject, applicationResult, logEntry) {
        const debugLogPath = path.join('./logs', `diff_debug_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
        
        const debugContent = `
=== DIFF APPLICATION DEBUG LOG ===
Timestamp: ${logEntry.timestamp}
Strategy: ${diffObject.metadata?.strategy}
Generated By: ${diffObject.metadata?.generatedBy}

=== ORIGINAL CONTENT (with line numbers) ===
${originalContent.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n')}

=== DIFF OBJECT ===
${JSON.stringify(diffObject, null, 2)}

=== APPLICATION RESULT ===
Success: ${applicationResult.success}
Applied Changes: ${applicationResult.appliedChanges?.length || 0}
Failed Changes: ${applicationResult.failedChanges?.length || 0}
Line Shifts: ${applicationResult.lineShifts || 0}

=== FAILED CHANGES ANALYSIS ===
${applicationResult.failedChanges?.map((change, i) => `
Change ${i + 1}:
- Type: ${change.type}
- Target Line: ${change.line || change.after_line || 'N/A'}
- Expected Text: "${change.old || 'N/A'}"
- Error: ${change.error}
- Suggestion: ${change.suggestion || 'None'}
- Context: ${JSON.stringify(change.anchor || {}, null, 2)}
`).join('\n') || 'No failed changes'}

=== APPLIED CHANGES ===
${applicationResult.appliedChanges?.map((change, i) => `
Change ${i + 1}:
- Type: ${change.type}
- Target Line: ${change.line || change.after_line || 'N/A'}
- Actual Line: ${change.actualLine}
- Line Shift: ${change.lineShift}
`).join('\n') || 'No applied changes'}

=== FINAL CONTENT (with line numbers) ===
${applicationResult.content?.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n') || 'No final content'}

=== WARNINGS ===
${applicationResult.warnings?.join('\n') || 'No warnings'}

=== RECOMMENDATIONS ===
${this.generateRecommendations(applicationResult)}
`;

        try {
            fs.writeFileSync(debugLogPath, debugContent);
            console.log(`🔍 Detailed diff debug log written: ${debugLogPath}`);
        } catch (error) {
            console.error('❌ Failed to write diff debug log:', error.message);
        }
    }

    static generateRecommendations(applicationResult) {
        const recommendations = [];

        if (applicationResult.failedChanges?.length > 0) {
            recommendations.push('• Consider using more specific text matching patterns');
            recommendations.push('• Check if line numbers have shifted due to previous changes');
            recommendations.push('• Use content-based anchors instead of just line numbers');
        }

        if (applicationResult.lineShifts > 5) {
            recommendations.push('• High line shift detected - consider applying changes in reverse order');
        }

        if (applicationResult.warnings?.length > 0) {
            recommendations.push('• Review warnings for potential syntax issues');
        }

        if (recommendations.length === 0) {
            recommendations.push('• Diff application was successful - no issues detected');
        }

        return recommendations.join('\n');
    }

    static async writeLog(fileName, content) {
        const filePath = path.join(this.LOGS_DIR, fileName);
        try {
            await fs.promises.appendFile(filePath, content);
        } catch (error) {
            console.error(`❌ Failed to write log to ${fileName}:`, error.message);
        }
    }
}

module.exports = AgentLogger;