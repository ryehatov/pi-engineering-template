#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { applyPiSettings, mergePiSettings, PACKAGE_PREFIXES } from "./merge-pi-settings.mjs";

const packages = PACKAGE_PREFIXES.map(prefix =>
  prefix + (prefix.startsWith("git:") ? "a".repeat(40) : "1.2.3"));

test("Pi install package names match the Dockerfile, without a second version list", () => {
  const docker = readFileSync(path.resolve(import.meta.dirname, "..", "Dockerfile"), "utf8");
  const names = [...docker.matchAll(/pi install "((?:npm:|git:)[^"]+)"/g)]
    .map(match => match[1].replace(/[$][{][A-Z0-9_]+[}]/g, ""));
  assert.deepEqual(new Set(names), new Set(PACKAGE_PREFIXES));
  assert.equal(names.length, PACKAGE_PREFIXES.length);
});

test("merge retains exactly the installed packages and managed preferences", () => {
  const preferences = { defaultProvider: "openai", defaultProjectTrust: "never" };
  const installed = { theme: "inherited", packages };
  const merged = mergePiSettings(preferences, installed);
  assert.deepEqual(merged, { ...preferences, packages });
  assert.equal(merged.theme, undefined);
  assert.equal(merged.packages, packages);
});

test("merge does not overwrite a template package declaration", () => {
  assert.throws(() => mergePiSettings({ packages: [] }, { packages }), /must not declare packages/);
});

test("merge rejects a missing, duplicate, unpinned, or unapproved package", () => {
  assert.throws(() => mergePiSettings({}, {}), /missing, unexpected, or filtered/);
  assert.throws(() => mergePiSettings({}, { packages: packages.slice(1) }), /missing, unexpected, or filtered/);
  assert.throws(() => mergePiSettings({}, { packages: [...packages.slice(1), packages[0].replace("1.2.3", "latest")] }), /unpinned/);
  assert.throws(() => mergePiSettings({}, { packages: [...packages.slice(1), packages[1]] }), /duplicate/);
  assert.throws(() => mergePiSettings({}, { packages: [...packages.slice(1), "npm:untrusted@1.2.3"] }), /Unexpected/);
  assert.throws(() => mergePiSettings({}, { packages: packages.map(p => p.replace(/^git:(.+)a{40}$/, "git:$1main")) }), /unpinned/);
});

test("merge rejects incompatible package representations", () => {
  assert.throws(() => mergePiSettings([], { packages }), /JSON objects/);
  assert.throws(() => mergePiSettings({}, { packages: [{ source: packages[0] }, ...packages.slice(1)] }), /missing, unexpected, or filtered/);
});

test("atomic write preserves package registration and does not leak base settings", t => {
  const dir = mkdtempSync(path.join(tmpdir(), "pstack-settings-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const preferencesPath = path.join(dir, "preferences.json");
  const installedPath = path.join(dir, "settings.json");
  writeFileSync(preferencesPath, JSON.stringify({ defaultProvider: "openai" }));
  writeFileSync(installedPath, JSON.stringify({ packages, unwanted: "remove" }));
  applyPiSettings(preferencesPath, installedPath);
  assert.deepEqual(JSON.parse(readFileSync(installedPath, "utf8")),
    { defaultProvider: "openai", packages });
});

test("a failed merge does not modify the installed settings", t => {
  const dir = mkdtempSync(path.join(tmpdir(), "pstack-settings-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const preferencesPath = path.join(dir, "preferences.json");
  const installedPath = path.join(dir, "settings.json");
  writeFileSync(preferencesPath, JSON.stringify({ packages: [] }));
  const initial = JSON.stringify({ packages });
  writeFileSync(installedPath, initial);
  assert.throws(() => applyPiSettings(preferencesPath, installedPath), /must not declare packages/);
  assert.equal(readFileSync(installedPath, "utf8"), initial);
});
