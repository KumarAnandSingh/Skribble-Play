import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      <QueryProvider>{ui}</QueryProvider>
    </ThemeProvider>
  );
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
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Squad up for fast, meme-worthy drawing battles." })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /playtest waitlist/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Game server online/i)).toBeInTheDocument();
    });
  });
});
