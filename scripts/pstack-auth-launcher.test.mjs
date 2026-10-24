import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, symlinkSync, chmodSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = join(dirname(fileURLToPath(import.meta.url)), 'pstack-auth-launcher.sh');
const probe = `#!/usr/bin/env node
console.log(JSON.stringify({
  args: process.argv.slice(2),
  home: process.env.HOME,
  key: process.env.ANTHROPIC_API_KEY ?? null,
  token: process.env.ANTHROPIC_AUTH_TOKEN ?? null,
  url: process.env.ANTHROPIC_BASE_URL ?? null,
  foundryKey: process.env.ANTHROPIC_FOUNDRY_API_KEY ?? null,
  config: process.env.CLAUDE_CONFIG_DIR ?? null,
  providerConfig: process.env.PI_CLAUDE_CODE_CONFIG_DIR ?? null,
  openaiKey: process.env.OPENAI_API_KEY ?? null,
}));
`;

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'pstack-auth-'));
  try {
    const bin = join(root, 'bin');
    const home = join(root, 'home with spaces');
    mkdirSync(bin);
    mkdirSync(home);
    writeFileSync(join(bin, 'pstack-auth-launcher'), readFileSync(source));
    chmodSync(join(bin, 'pstack-auth-launcher'), 0o755);
    for (const name of ['pi', 'claude']) {
      symlinkSync('pstack-auth-launcher', join(bin, name));
      writeFileSync(join(bin, `${name}.pstack-upstream`), probe);
      chmodSync(join(bin, `${name}.pstack-upstream`), 0o755);
    }
    return run({ root, bin, home });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function launch({ bin, home }, command, options = {}) {
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    ANTHROPIC_API_KEY: 'proxy-managed',
    OPENAI_API_KEY: 'openai-proxy-managed',
    ...options,
  };
  return spawnSync(join(bin, command), ['a b', '--opt'], { env, encoding: 'utf8' });
}

function result(processResult) {
  assert.equal(processResult.status, 0, processResult.stderr);
  return JSON.parse(processResult.stdout.trim());
}

test('pi drops only Docker sentinel credentials and preserves other providers and arguments', () => fixture(f => {
  const output = result(launch(f, 'pi', {
    ANTHROPIC_AUTH_TOKEN: 'proxy-managed',
    ANTHROPIC_BASE_URL: 'proxy-managed',
    ANTHROPIC_FOUNDRY_API_KEY: 'proxy-managed',
    CLAUDE_CONFIG_DIR: join(f.home, '.claude'),
  }));
  assert.deepEqual(output.args, ['a b', '--opt']);
  assert.equal(output.key, null);
  assert.equal(output.token, null);
  assert.equal(output.url, null);
  assert.equal(output.foundryKey, null);
  assert.equal(output.openaiKey, 'openai-proxy-managed');
  assert.equal(output.config, join(f.home, '.config/pstack/claude'));
  assert.equal(output.config, output.providerConfig);
}));

test('claude uses isolated OAuth config, ignoring a legacy apiKeyHelper', () => fixture(f => {
  const legacy = join(f.home, '.claude');
  mkdirSync(legacy);
  writeFileSync(join(legacy, 'settings.json'), '{"apiKeyHelper":"echo proxy-managed"}\n');
  const output = result(launch(f, 'claude', { SBX_CRED_ANTHROPIC_MODE: 'none' }));
  assert.equal(output.key, null);
  assert.equal(output.config, join(f.home, '.config/pstack/claude'));
  assert.equal(readFileSync(join(legacy, 'settings.json'), 'utf8'), '{"apiKeyHelper":"echo proxy-managed"}\n');
}));

test('Claude and Pi honor the same explicit absolute configuration path', () => fixture(f => {
  const custom = join(f.home, 'claude subscription');
  for (const command of ['pi', 'claude']) {
    const output = result(launch(f, command, { PI_CLAUDE_CODE_CONFIG_DIR: custom, CLAUDE_CONFIG_DIR: '/ignored' }));
    assert.equal(output.config, custom);
    assert.equal(output.providerConfig, custom);
  }
}));

test('Claude Code does not run when the host proxy has API-key billing mode', () => fixture(f => {
  for (const mode of ['apikey', 'unknown']) {
    const output = launch(f, 'claude', { SBX_CRED_ANTHROPIC_MODE: mode });
    assert.equal(output.status, 78);
    assert.match(output.stderr, /credential mode/);
    assert.equal(output.stdout, '');
  }
  result(launch(f, 'claude', { SBX_CRED_ANTHROPIC_MODE: 'oauth' }));
}));

test('Pi preserves real credentials, while Claude subscription rejects them', () => fixture(f => {
  const env = { ANTHROPIC_API_KEY: 'real-api-key', ANTHROPIC_AUTH_TOKEN: 'real-token' };
  const output = result(launch(f, 'pi', env));
  assert.equal(output.key, 'real-api-key');
  assert.equal(output.token, 'real-token');
  const rejected = launch(f, 'claude', env);
  assert.equal(rejected.status, 78);
  assert.match(rejected.stderr, /requires no Anthropic/);
  for (const key of ['ANTHROPIC_BASE_URL', 'ANTHROPIC_FOUNDRY_API_KEY']) {
    const rejectedOther = launch(f, 'claude', { [key]: 'https://example.test' });
    assert.equal(rejectedOther.status, 78);
  }
}));

test('Claude refuses Bedrock/Vertex/Foundry overrides but permits explicit false', () => fixture(f => {
  for (const key of ['CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY']) {
    assert.equal(launch(f, 'claude', { [key]: 'true' }).status, 78);
    assert.equal(launch(f, 'claude', { [key]: 'YES' }).status, 78);
    result(launch(f, 'claude', { [key]: 'False' }));
  }
}));

test('relative Claude config is rejected before either tool is executed', () => fixture(f => {
  for (const command of ['pi', 'claude']) {
    const output = launch(f, command, { PI_CLAUDE_CODE_CONFIG_DIR: 'relative-path' });
    assert.equal(output.status, 78);
    assert.match(output.stderr, /must be absolute/);
  }
}));

test('wrapper propagates the upstream executable exit code and reports missing shims', () => fixture(f => {
  writeFileSync(join(f.bin, 'pi.pstack-upstream'), '#!/bin/sh\nexit 37\n');
  chmodSync(join(f.bin, 'pi.pstack-upstream'), 0o755);
  assert.equal(launch(f, 'pi').status, 37);
  rmSync(join(f.bin, 'claude.pstack-upstream'));
  const failed = launch(f, 'claude');
  assert.equal(failed.status, 70);
  assert.match(failed.stderr, /missing original claude executable/);
}));
