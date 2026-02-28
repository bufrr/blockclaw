import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "blockclaw", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "blockclaw", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "blockclaw", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "blockclaw", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "blockclaw", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "blockclaw", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "blockclaw", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "blockclaw", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "blockclaw", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "blockclaw", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "blockclaw", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "blockclaw", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "blockclaw", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "blockclaw"],
      expected: null,
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "blockclaw", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "blockclaw", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "blockclaw", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "blockclaw", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "blockclaw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "blockclaw", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "blockclaw", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "blockclaw", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "blockclaw", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "blockclaw", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "blockclaw", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "blockclaw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "blockclaw", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "blockclaw", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "blockclaw", "status"],
        expected: ["node", "blockclaw", "status"],
      },
      {
        rawArgs: ["node-22", "blockclaw", "status"],
        expected: ["node-22", "blockclaw", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "blockclaw", "status"],
        expected: ["node-22.2.0.exe", "blockclaw", "status"],
      },
      {
        rawArgs: ["node-22.2", "blockclaw", "status"],
        expected: ["node-22.2", "blockclaw", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "blockclaw", "status"],
        expected: ["node-22.2.exe", "blockclaw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "blockclaw", "status"],
        expected: ["/usr/bin/node-22.2.0", "blockclaw", "status"],
      },
      {
        rawArgs: ["node24", "blockclaw", "status"],
        expected: ["node24", "blockclaw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node24", "blockclaw", "status"],
        expected: ["/usr/bin/node24", "blockclaw", "status"],
      },
      {
        rawArgs: ["node24.exe", "blockclaw", "status"],
        expected: ["node24.exe", "blockclaw", "status"],
      },
      {
        rawArgs: ["nodejs", "blockclaw", "status"],
        expected: ["nodejs", "blockclaw", "status"],
      },
      {
        rawArgs: ["node-dev", "blockclaw", "status"],
        expected: ["node", "blockclaw", "node-dev", "blockclaw", "status"],
      },
      {
        rawArgs: ["blockclaw", "status"],
        expected: ["node", "blockclaw", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "blockclaw",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "blockclaw",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "blockclaw", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "blockclaw", "status"],
      ["node", "blockclaw", "health"],
      ["node", "blockclaw", "sessions"],
      ["node", "blockclaw", "config", "get", "update"],
      ["node", "blockclaw", "config", "unset", "update"],
      ["node", "blockclaw", "models", "list"],
      ["node", "blockclaw", "models", "status"],
      ["node", "blockclaw", "memory", "status"],
      ["node", "blockclaw", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "blockclaw", "agents", "list"],
      ["node", "blockclaw", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
