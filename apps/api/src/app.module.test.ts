import { describe, expect, it } from "vitest";
import { AppModule } from "./app.module";

describe("api smoke", () => {
  it("exports AppModule class", () => {
    expect(AppModule).toBeDefined();
    expect(typeof AppModule).toBe("function");
  });
});