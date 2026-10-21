#!/usr/bin/env node
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The names are checked, but versions live only in the Dockerfile.
// An unexpected package in the base image must not enter the final image.
export const PACKAGE_PREFIXES = Object.freeze([
  "npm:@narumitw/pi-accounts@",
  "git:github.com/michael-denyer/pstack-claude@",
  "npm:@dietrichgebert/ponytail@",
  "npm:pi-web-access@",
  "npm:pi-lens@",
  "npm:@ff-labs/pi-fff@",
  "npm:pi-context-view@",
  "npm:pi-powerline-footer@",
  "npm:pi-rewind-hook@",
  "npm:@narumitw/pi-btw@",
  "git:github.com/NVlabs/SoL-Pi@",
]);

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergePiSettings(preferences, installed) {
  if (!record(preferences) || !record(installed))
    throw new Error("Both Pi settings documents must be JSON objects.");
  if (Object.hasOwn(preferences, "packages"))
    throw new Error("Template settings must not declare packages; pi install owns the list.");
  const packages = installed.packages;
  if (!Array.isArray(packages) || packages.length !== PACKAGE_PREFIXES.length ||
      !packages.every(item => typeof item === "string")) {
    throw new Error("The installed Pi package list is missing, unexpected, or filtered.");
  }

  const outstanding = new Set(PACKAGE_PREFIXES);
  for (const source of packages) {
    const prefix = PACKAGE_PREFIXES.find(p => source.startsWith(p));
    const suffix = prefix && source.slice(prefix.length);
    const valid = prefix?.startsWith("git:")
      ? /^[0-9a-f]{40}$/.test(suffix)
      : /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(suffix ?? "");
    if (!prefix || !outstanding.delete(prefix) || !valid)
      throw new Error("Unexpected, duplicate, or unpinned Pi package: " + source);
  }
  if (outstanding.size) throw new Error("Missing Pi package(s): " + [...outstanding].join(", "));

  // Drop inherited preferences from the base image. Preserve only Pi's
  // registered packages, then apply explicitly audited template settings.
  return { ...preferences, packages };
}

export function applyPiSettings(templatePath, installedPath) {
  const template = JSON.parse(readFileSync(templatePath, "utf8"));
  const installed = JSON.parse(readFileSync(installedPath, "utf8"));
  const merged = mergePiSettings(template, installed);
  const tmp = installedPath + "." + process.pid + ".tmp";
  try {
    writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    renameSync(tmp, installedPath);
  } finally {
    rmSync(tmp, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) {
    console.error("Usage: node merge-pi-settings.mjs <template-settings> <installed-settings>");
    process.exitCode = 2;
  } else {
    try {
      applyPiSettings(process.argv[2], process.argv[3]);
    } catch (error) {
      console.error("Pi settings merge failed:", error.message);
      process.exitCode = 1;
    }
  }
}
