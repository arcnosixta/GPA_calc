import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createContext, Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function handler() {
  let clients = 0;
  const exchanges = [];
  const context = createContext({
    URL, exports: {},
    require: (name) => name === "next/server" ? { NextResponse } : {
      createServerSupabaseClient: async () => {
        clients += 1;
        return { auth: { exchangeCodeForSession: async (code) => {
          exchanges.push(code);
          return { error: null };
        } } };
      },
    },
  });
  new Script(outputText).runInContext(context);
  return { GET: context.exports.GET, exchanges, clients: () => clients };
}

test("OAuth cancellation returns to login without creating a client or copying provider details", async () => {
  const auth = handler();
  const request = new NextRequest("https://scholarpath.test/auth/callback?error=access_denied&error_description=private-provider-details&code=ignored-code");
  const response = await auth.GET(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://scholarpath.test/login?error=oauth");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(auth.clients(), 0);
  assert.equal(auth.exchanges.length, 0);
});

test("successful PKCE callback still exchanges the code and opens the dashboard", async () => {
  const auth = handler();
  const response = await auth.GET(new NextRequest("https://scholarpath.test/auth/callback?code=test-pkce-code"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://scholarpath.test/dashboard");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(auth.clients(), 1);
  assert.deepEqual(auth.exchanges, ["test-pkce-code"]);
});
