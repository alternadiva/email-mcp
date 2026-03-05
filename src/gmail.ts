import { gmail_v1, google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/* get unread emails and full details of each from gmail */
export async function getUnreadEmails(
  auth: OAuth2Client,
  maxResults: number = 5,
) {
  const gmail = google.gmail({ version: "v1", auth });

  // list message ids matching is:unread query
  const listResponse = await gmail.users.messages.list({
    userId: "me", // me=authenticated user
    q: "is:unread",
    maxResults,
  });

  const unreadMessages = listResponse.data.messages || [];

  if (unreadMessages.length === 0) {
    return [];
  }

  // use ids to fetch full email details
  const emailDetails = await Promise.all(
    unreadMessages.map(async (message) => {
      const response = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full", // full=headers+body (metadata=headers only)
      });

      const messageDetail = response.data;

      const headers = messageDetail.payload?.headers || [];
      const getHeader = (headerName: string) =>
        headers.find(
          (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
        )?.value || "";

      return {
        id: messageDetail.id!,
        threadId: messageDetail.threadId!, // for creating replies in the same conversation
        from: getHeader("From"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        snippet: messageDetail.snippet || "",
        body: extractBody(messageDetail.payload),
      };
    }),
  );

  return emailDetails;
}

/* create a draft reply in a thread of a specific email. */
export async function createDraftReply(
  auth: OAuth2Client,
  messageId: string,
  threadId: string,
  to: string,
  subject: string,
  replyBody: string,
) {
  const gmail = google.gmail({ version: "v1", auth });

  const originalMessage = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["Message-ID"], //grouped replies with original
  });

  const originalMessageId =
    originalMessage.data.payload?.headers?.find(
      (header) => header.name?.toLowerCase() === "message-id",
    )?.value || "";

  //email format
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject.startsWith("Re:") ? subject : `Re: ${subject}`}`,
    `In-Reply-To: ${originalMessageId}`, // email client detects it as a reply
    `References: ${originalMessageId}`, // email client detects it as a reply
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    replyBody,
  ];

  const rawEmail = emailLines.join("\r\n"); //official email line ending

  // base64url encode to match gmail api reqs
  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const draft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodedEmail,
        threadId: threadId,
      },
    },
  });

  return {
    draftId: draft.data.id!,
    threadId: threadId,
    to: to,
    subject: subject,
  };
}

/* extract text/plain content from message payload 
   MIME = Multipurpose Internet Mail Extensions
*/
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined) {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // multipart message
  if (payload.parts) {
    for (const part of payload.parts) {
      const body = extractBody(part) as string;
      if (body) return body;
    }
  }

  //fallback when body data w/o text/plain mimeType
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  return "";
}
