import { OAuth2Client } from "google-auth-library";
import { createDraftReply, getUnreadEmails } from "./gmail.js";

export const toolDefinitions = [
  {
    name: "get_unread_emails",
    description:
      "Fetch unread emails from the user's Gmail inbox. Returns sender, subject, body, and message/thread IDs for each unread email.",
    inputSchema: {
      type: "object" as const,
      properties: {
        maxResults: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          default: 5,
          description:
            "Maximum number of unread emails to retrieve (default: 5, max: 10)",
        },
      },
      required: [],
      additionalProperties: false,
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

interface GetUnreadArgs {
  maxResults?: number;
}

interface CreateDraftArgs {
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  replyBody: string;
}

export async function handleToolCall(
  name: string,
  args: GetUnreadArgs | CreateDraftArgs,
  auth: OAuth2Client,
): Promise<string> {
  switch (name) {
    case "get_unread_emails": {
      const { maxResults } = args as GetUnreadArgs;
      const maxRes = Math.min(maxResults || 5, 10);
      const emails = await getUnreadEmails(auth, maxRes);

      if (emails.length === 0) {
        return "No unread emails found.";
      }

      // format emailsfor Claude
      const formatted = emails.map(
        (email, i) =>
          `- Email nr${i + 1}
            From: ${email.from}
            Subject: ${email.subject}
            Date: ${email.date}
            Message ID: ${email.id}
            Thread ID: ${email.threadId}
            Snippet: ${email.snippet}
            Body:
            ${email.body}
`,
      );

      return `${emails.length} unread email(s):
              ${formatted.join("\n")}`;
    }

    case "create_draft_reply": {
      const { messageId, threadId, to, subject, replyBody } =
        args as CreateDraftArgs;

      const draft = await createDraftReply(
        auth,
        messageId,
        threadId,
        to,
        subject,
        replyBody,
      );

      return `Draft reply created in Gmail Drafts folder:
        Draft ID: ${draft.draftId}
        To: ${draft.to}
        Subject: ${draft.subject}
        Thread ID: ${draft.threadId}`;
    }

    default:
      throw new Error(`unknown tool ${name}`);
  }
}
