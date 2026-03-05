export const toolDefinitions = [
  {
    name: "get_unread_emails",
    description:
      "Fetch unread emails from the user's Gmail inbox. Returns sender, subject, body, and message/thread IDs for each unread email.",
    inputSchema: {
      type: "object" as const,
      properties: {
        maxResults: {
          type: "number",
          description:
            "Maximum number of unread emails to retrieve (default: 5, max: 10)",
        },
      },
      required: [],
    },
  },

  {
    name: "create_draft_reply",
    description:
      "Create a draft reply to a specific email. The draft will be properly threaded in Gmail so it appears as part of the same conversation. The user can review and send the draft from Gmail.",
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the email message to reply to",
        },
        threadId: {
          type: "string",
          description: "The thread ID of the email conversation",
        },
        to: {
          type: "string",
          description:
            "The email address to send the reply to (original sender)",
        },
        subject: {
          type: "string",
          description:
            'The subject line of the original email (will be prefixed with "Re:" if not already)',
        },
        replyBody: {
          type: "string",
          description: "The full text content of the reply",
        },
      },
      required: ["messageId", "threadId", "to", "subject", "replyBody"],
    },
  },
];
