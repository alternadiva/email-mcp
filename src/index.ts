#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedClient } from "./auth.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleToolCall, toolDefinitions, ToolName } from "./tools.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// MCP server instance
const mcpServer = new McpServer(
  {
    name: "email-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // will provide the list dynamically
    },
  },
);

// auth with gmail on startup (token.json or browser auth)
const authClient = await getAuthenticatedClient();

// list tools the server provides
mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolDefinitions };
});

//execute a tool call
mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(
      name as ToolName,
      args ?? {},
      authClient,
    );
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true, //tells claude the tool call failed
    };
  }
});

// start the server
async function main() {
  const transport = new StdioServerTransport(); //communicate with Claude desktop via stdin/stdout
  await mcpServer.connect(transport);
  console.error("Email MCP server running on stdio");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
