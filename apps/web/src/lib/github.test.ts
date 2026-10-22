import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseContribution, verifyGithubSignature } from "./github";

const SECRET = "secreto-de-prueba";
const sign = (body: string) => `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;

describe("webhook de GitHub", () => {
  it("acepta solo avisos firmados con el secreto", () => {
    const body = '{"action":"opened"}';
    expect(verifyGithubSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyGithubSignature(body, sign("otro"), SECRET)).toBe(false);
    expect(verifyGithubSignature(body, null, SECRET)).toBe(false);
    expect(verifyGithubSignature(body, sign(body), "")).toBe(false);
  });

  const issue = { title: "El sudoku se cuelga", body: "Mi código: k7mxq", html_url: "https://github.com/x/y/issues/3", user: { login: "ana", type: "User" } };

  it("una issue nueva con un código de amigo cuenta", () => {
    expect(parseContribution("issues", { action: "opened", issue })).toEqual({
      kind: "issue",
      login: "ana",
      url: "https://github.com/x/y/issues/3",
      codes: ["K7MXQ"],
    });
  });

  it("un pull request cuenta solo si se acepta", () => {
    const pr = { ...issue, html_url: "https://github.com/x/y/pull/4" };
    expect(parseContribution("pull_request", { action: "closed", pull_request: { ...pr, merged: true } })?.kind).toBe("pull_request");
    expect(parseContribution("pull_request", { action: "closed", pull_request: { ...pr, merged: false } })).toBeNull();
    expect(parseContribution("pull_request", { action: "opened", pull_request: pr })).toBeNull();
  });

  it("no cuentan los bots, las ediciones ni los textos sin código", () => {
    expect(parseContribution("issues", { action: "opened", issue: { ...issue, user: { login: "bot", type: "Bot" } } })).toBeNull();
    expect(parseContribution("issues", { action: "edited", issue })).toBeNull();
    expect(parseContribution("issues", { action: "opened", issue: { ...issue, title: "Hola", body: "sin código aquí, solo palabras largas" } })).toBeNull();
  });
});
