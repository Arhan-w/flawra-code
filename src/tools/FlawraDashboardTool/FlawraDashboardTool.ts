// FlawraDashboardTool – a simple web dashboard exposing system status, tool usage, and MCP server info.
// Access via http://localhost:3030/dashboard

import { buildTool, type ToolDef } from '../../Tool.js';
import express from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FlawraDashboardToolDef: ToolDef<{
  action: 'start' | 'stop';
  port?: number;
}> = {
  name: 'flawra_dashboard',
  description: 'Start a web dashboard to monitor FLAWRA-CODE status, tool usage, and MCP server.',
  schema: {
    action: { type: 'string', enum: ['start', 'stop'], description: 'Start or stop the dashboard server' },
    port: { type: 'number', description: 'Port to run the dashboard on (default: 3030)' },
  },
  async run(args) {
    // Use a global variable to keep track of the server instance
    // @ts-ignore
    if (!global.__flawraDashboardServer) {
      // @ts-ignore
      global.__flawraDashboardServer = null;
    }

    const port = args.port ?? 3030;

    if (args.action === 'start') {
      if (global.__flawraDashboardServer) {
        return { success: false, error: `Dashboard already running on port ${global.__flawraDashboardServer?.address()?.port ?? 'unknown'}` };
      }

      const app = express();
      app.use(express.json());

      // Simple in-memory stats (could be expanded)
      let startTime = Date.now();
      let toolUsage: Record<string, number> = {};

      // Middleware to count tool usage (hook into tool execution later)
      app.use((req, res, next) => {
        // For demo, we just log request
        next();
      });

      app.get('/', (req, res) => {
        res.send(`
          <html>
            <head><title>FLAWRA-CODE Dashboard</title></head>
            <body>
              <h1>FLAWRA-CODE Dashboard</h1>
              <p>Uptime: ${Math.floor((Date.now() - startTime) / 1000)} seconds</p>
              <h2>Tool Usage</h2>
              <pre>${JSON.stringify(toolUsage, null, 2)}</pre>
              <h2>MCP Server</h2>
              <p>Run <code>flawra mcp</code> to start the MCP server on stdio.</p>
              <h2>Endpoints</h2>
              <ul>
                <li><a href="/api/status">/api/status</a> - JSON status</li>
                <li><a href="/api/tools">/api/tools</a> - List available tools</li>
              </ul>
            </body>
          </html>
        `);
      });

      app.get('/api/status', (req, res) => {
        res.json({
          uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
          tool_usage: toolUsage,
          timestamp: new Date().toISOString(),
        });
      });

      app.get('/api/tools', (req, res) => {
        // In a real implementation, we would fetch the list of tools from the tool registry.
        // For now, we return a placeholder.
        res.json([
          { name: 'flawra_memory', description: 'Persistent key/value memory (SQLite)' },
          { name: 'flawra_code_review', description: 'Security/quality scan with severity scoring' },
          { name: 'flawra_git', description: 'One-call git wrapper' },
          { name: 'flawra_scheduler', description: 'Cron/one-shot task scheduling' },
          { name: 'flawra_voice_assistant', description: 'Whisper transcription + voice commands' },
          { name: 'flawra_computer', description: 'Windows desktop driver (click/type/screenshot)' },
          { name: 'flawra_dashboard', description: 'Web dashboard (this tool)' },
        ]);
      });

      const server = app.listen(port, () => {
        // @ts-ignore
        global.__flawraDashboardServer = server;
        console.log(`FLAWRA-CODE dashboard running at http://localhost:${port}`);
      });

      return { success: true, output: `Dashboard started on http://localhost:${port}` };
    }

    if (args.action === 'stop') {
      // @ts-ignore
      if (!global.__flawraDashboardServer) {
        return { success: false, error: 'Dashboard is not running' };
      }
      // @ts-ignore
      global.__flawraDashboardServer.close();
      // @ts-ignore
      global.__flawraDashboardServer = null;
      return { success: true, output: 'Dashboard stopped' };
    }

    return { success: false, error: 'Invalid action' };
  },
};

export default buildTool(FlawraDashboardToolDef);