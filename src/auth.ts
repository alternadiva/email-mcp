import { OAuth2Client } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import * as http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "..", "token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly", // for reading messages
  "https://www.googleapis.com/auth/gmail.compose", // for writing drafts
];

/* load the OAuth2 client */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const credentialsRaw = await fs.readFile(CREDENTIALS_PATH, "utf-8");
  const credentials = JSON.parse(credentialsRaw);
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  // create new client from Google API
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3000/oauth2callback", // after login it redirects back to localhost
  );

  // load previously saved token
  try {
    const tokenRaw = await fs.readFile(TOKEN_PATH, "utf-8"); // token created after previous login
    const token = JSON.parse(tokenRaw);
    oAuth2Client.setCredentials(token);

    // refresh token if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials: newCreds } = await oAuth2Client.refreshAccessToken();
      const updatedToken = {
        ...token,
        ...newCreds,
        refresh_token: newCreds.refresh_token ?? token.refresh_token,
      };
      oAuth2Client.setCredentials(updatedToken);
      await fs.writeFile(TOKEN_PATH, JSON.stringify(updatedToken, null, 2));
    }

    return oAuth2Client;
  } catch {
    // need to authorize for the first time if there's no saved token
    return await authorise(oAuth2Client);
  }
}

async function authorise(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
  // Google login url
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // refresh token to avoid reauthorising
    scope: SCOPES,
  });

  console.error(`Url to authorise: ${authUrl}`);

  // local http server to receive the OAuth callback
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:3000`);
        const code = url.searchParams.get("code");
        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("Auth successful");
          server.close();
          resolve(code);
        }
      } catch (err) {
        reject(err);
      }
    });

    server.listen(3000, () => {
      console.error("Waiting for auth on http://localhost:3000 ...");
    });
  });

  // auth code for tokens from Google
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  return oAuth2Client;
}

// when run as main script
const isMain = process.argv[1]?.includes("auth");
if (isMain) {
  getAuthenticatedClient()
    .then(() => {
      console.error("Auth complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Auth failed", err);
      process.exit(1);
    });
}
