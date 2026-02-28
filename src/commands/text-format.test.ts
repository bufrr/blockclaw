import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("blockclaw", 16)).toBe("blockclaw");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("blockclaw-status-output", 10)).toBe("blockclaw-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
