import PostalMime from "postal-mime";
import { isAllowed } from "./allowlist.js";

export default {
  async email(message, env, ctx) {
    const authResults = message.headers.get("Authentication-Results") || "";
    if (!/dmarc=pass/i.test(authResults)) {
      message.setReject("550 5.7.1 message failed authentication");
      return;
    }

    const from = String(message.from || "").trim().toLowerCase();
    if (!isAllowed(from)) {
      message.setReject("550 5.1.1 recipient address does not exist");
      return;
    }

    const parsed = await PostalMime.parse(message.raw);

    const body = {
      from,
      subject: parsed.subject ?? null,
      text: parsed.text ?? null,
      messageId: message.headers.get("Message-ID") ?? null,
      inReplyTo: message.headers.get("In-Reply-To") ?? null,
      references: message.headers.get("References") ?? null,
      dmarc: true,
    };

    const response = await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Token": env.WEBHOOK_TOKEN,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded ${response.status}`);
    }
  },
};
