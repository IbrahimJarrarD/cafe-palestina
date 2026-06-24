import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAllowed } from "../src/allowlist.js";
import worker from "../src/index.js";

// Minimal valid MIME message that postal-mime can parse.
const RAW_MIME =
  "From: tech@ibrahimjarrar.com\r\n" +
  "To: dev@cafepalestinecolonia.de\r\n" +
  "Subject: Test subject\r\n" +
  "Message-ID: <test-123@mail.example>\r\n" +
  "MIME-Version: 1.0\r\n" +
  "Content-Type: text/plain; charset=utf-8\r\n" +
  "\r\n" +
  "Hello from the test.\r\n";

function makeRaw(mimeString) {
  const encoder = new TextEncoder();
  return encoder.encode(mimeString).buffer;
}

function makeMessage({ from, authResults = "", extraHeaders = {} } = {}) {
  const headersInit = {
    "Authentication-Results": authResults,
    "Message-ID": "<test-123@mail.example>",
    "In-Reply-To": "",
    References: "",
    ...extraHeaders,
  };
  const headers = new Headers(headersInit);

  return {
    from,
    headers,
    raw: makeRaw(RAW_MIME),
    setReject: vi.fn(),
  };
}

const ENV = {
  N8N_WEBHOOK_URL: "https://n8n.example.com/webhook/cafe",
  WEBHOOK_TOKEN: "super-secret-token",
};

describe("isAllowed", () => {
  it("accepts a known address (case-insensitive)", () => {
    expect(isAllowed("Tech@ibrahimjarrar.com")).toBe(true);
  });

  it("rejects an unknown address", () => {
    expect(isAllowed("stranger@example.com")).toBe(false);
  });
});

describe("email worker", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects when DMARC fails", async () => {
    const msg = makeMessage({
      from: "tech@ibrahimjarrar.com",
      authResults: "mx.example.com; dmarc=fail",
    });

    await worker.email(msg, ENV, {});

    expect(msg.setReject).toHaveBeenCalledOnce();
    expect(msg.setReject).toHaveBeenCalledWith(
      "550 5.7.1 message failed authentication"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls fetch with X-Webhook-Token for allowlisted sender + dmarc=pass", async () => {
    const msg = makeMessage({
      from: "tech@ibrahimjarrar.com",
      authResults: "mx.example.com; dmarc=pass",
    });

    await worker.email(msg, ENV, {});

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENV.N8N_WEBHOOK_URL);
    expect(init.headers["X-Webhook-Token"]).toBe(ENV.WEBHOOK_TOKEN);
    expect(msg.setReject).not.toHaveBeenCalled();
  });

  it("rejects a stranger even when DMARC passes", async () => {
    const msg = makeMessage({
      from: "stranger@example.com",
      authResults: "mx.example.com; dmarc=pass",
    });

    await worker.email(msg, ENV, {});

    expect(msg.setReject).toHaveBeenCalledOnce();
    expect(msg.setReject).toHaveBeenCalledWith(
      "550 5.1.1 recipient address does not exist"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
