// FlawraMcpServer — Model Context Protocol server for FLAWRA-CODE.
// Exposes all built-in tools (memory, code review, git, scheduler, computer, voice)
// over stdio JSON-RPC so external clients (IDEs, web apps, mobile) can use them.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FlawraMemoryTool } from '../tools/FlawraMemoryTool/FlawraMemoryTool.js';
import { FlawraCodeReviewTool } from '../tools/FlawraCodeReviewTool/FlawraCodeReviewTool.js';
import { FlawraGitTool } from '../tools/FlawraGitTool/FlawraGitTool.js';
import { FlawraSchedulerTool } from '../tools/FlawraSchedulerTool/FlawraSchedulerTool.js';

const server = new Server(
  { name: 'flawra-mcp', version: '2.1.900' },
  { capabilities: { tools: {} } },
);

const tools = [
  FlawraMemoryTool,
  FlawraCodeReviewTool,
  FlawraGitTool,
  FlawraSchedulerTool,
];

server.registerRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.schema,
  })),
}));

server.registerRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find(t => t.name === req.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${req.params.name}`);
  }
  const result = await tool.run(req.params.arguments);
  return {
    content: [{ type: 'text', text: result.output || result.error || 'Done' }],
    isError: !result.success,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);