import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddHostButton } from "@/components/hosts/AddHostButton";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock CopyCommand
vi.mock("@/components/landing/CopyCommand", () => ({
  CopyCommand: ({ command }: { command: string }) => (
    <div data-testid="copy-command">{command}</div>
  ),
}));

// Mock radix-ui Dialog, preserving other exports (Label, etc.)
vi.mock("radix-ui", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  const Root = ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null;
  Root.displayName = "DialogRoot";

  const Portal = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  Portal.displayName = "DialogPortal";

  const Overlay = ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
    <div {...props}>{children}</div>
  );
  Overlay.displayName = "DialogOverlay";

  const Content = ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog" {...props}>{children}</div>
  );
  Content.displayName = "DialogContent";

  const Title = ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <h2 {...props}>{children}</h2>
  );
  Title.displayName = "DialogTitle";

  const Description = ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <p {...props}>{children}</p>
  );
  Description.displayName = "DialogDescription";

  const Close = ({ children, ...props }: { children?: React.ReactNode; className?: string }) => (
    <button {...props}>{children}</button>
  );
  Close.displayName = "DialogClose";

  const Trigger = ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  );
  Trigger.displayName = "DialogTrigger";

  return {
    ...actual,
    Dialog: {
      Root,
      Portal,
      Overlay,
      Content,
      Title,
      Description,
      Close,
      Trigger,
    },
  };
});

describe("AddHostButton", () => {
  it("renders Add Host button when under limit (free plan, 0 hosts)", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={0}
        hostCount={0}
        plan="free"
      />
    );
    expect(screen.getByText("Add Host")).toBeInTheDocument();
  });

  it("renders upgrade link when at limit (free plan, 1 host)", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={0}
        hostCount={1}
        plan="free"
      />
    );
    expect(screen.getByText("Upgrade to add hosts")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/upgrade?reason=host_limit");
  });

  it("renders Add Host button for pro plan with room", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={5}
        hostCount={10}
        plan="pro"
      />
    );
    expect(screen.getByText("Add Host")).toBeInTheDocument();
  });

  it("renders upgrade link for pro plan at limit", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={5}
        hostCount={15}
        plan="pro"
      />
    );
    expect(screen.getByText("Upgrade to add hosts")).toBeInTheDocument();
  });

  it("always renders Add Host for enterprise", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={5}
        hostCount={100}
        plan="enterprise"
      />
    );
    expect(screen.getByText("Add Host")).toBeInTheDocument();
  });

  it("opens wizard dialog when Add Host clicked", () => {
    render(
      <AddHostButton
        orgId="org-123"
        existingKeyCount={0}
        hostCount={0}
        plan="free"
      />
    );

    fireEvent.click(screen.getByText("Add Host"));

    // Dialog should open with wizard content
    expect(screen.getByText("Add a Host")).toBeInTheDocument();
  });
});
