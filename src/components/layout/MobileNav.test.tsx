import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "./MobileNav";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

function OpenMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button">Open navigation menu</button>
      </SheetTrigger>
      <MobileNav />
    </Sheet>
  );
}

afterEach(cleanup);

function openMobileNav() {
  fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
}

describe("MobileNav", () => {
  it("closes from the close button", () => {
    render(<OpenMobileNav />);
    openMobileNav();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the menu trigger when closed", async () => {
    render(<OpenMobileNav />);
    const trigger = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes when Escape is pressed", () => {
    render(<OpenMobileNav />);
    openMobileNav();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when a navigation link is selected", () => {
    render(<OpenMobileNav />);
    openMobileNav();

    fireEvent.click(screen.getByRole("link", { name: "Books" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the backdrop is selected", async () => {
    render(<OpenMobileNav />);
    openMobileNav();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const backdrop = document.querySelector<HTMLElement>(
      '[data-state="open"].fixed.inset-0',
    );
    expect(backdrop).not.toBeNull();

    fireEvent.pointerDown(backdrop!, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
