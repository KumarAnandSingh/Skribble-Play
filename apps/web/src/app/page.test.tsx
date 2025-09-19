import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ status: "ok" })
      } as Response)
    ) as unknown as typeof fetch;
  });

  it("renders hero copy", async () => {
    render(<HomePage />);

    expect(screen.getByText("Skribble Play")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /playtest waitlist/i })).toBeInTheDocument();
    expect(screen.getByText(/Create a Room/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Game server online/i)).toBeInTheDocument();
    });
  });
});
