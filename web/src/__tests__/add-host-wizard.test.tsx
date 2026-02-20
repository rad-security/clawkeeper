import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddHostWizard } from "@/components/hosts/AddHostWizard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock CopyCommand since it uses navigator.clipboard
vi.mock("@/components/landing/CopyCommand", () => ({
  CopyCommand: ({ command }: { command: string }) => (
    <div data-testid="copy-command">{command}</div>
  ),
}));

// Mock radix-ui Dialog to simplify testing, preserving other exports (Label, etc.)
vi.mock("radix-ui", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  const Root = ({ children, open }: { children: React.ReactNode; open: boolean }) =>
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

describe("AddHostWizard", () => {
  const defaultProps = {
    orgId: "org-123",
    existingKeyCount: 0,
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 (API key) when no existing keys", () => {
    render(<AddHostWizard {...defaultProps} />);
    expect(screen.getByText("Generate an API Key")).toBeInTheDocument();
    expect(screen.getByText("Generate Key")).toBeInTheDocument();
  });

  it("renders step 2 (Install) when user has existing keys", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={2} />);
    expect(screen.getByText("Install the CLI")).toBeInTheDocument();
  });

  it("shows existing key notice when starting at step 2", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={2} />);
    expect(
      screen.getByText(/You already have an API key/)
    ).toBeInTheDocument();
  });

  it("renders key name input with default value", () => {
    render(<AddHostWizard {...defaultProps} />);
    const input = screen.getByPlaceholderText("e.g., Production Server");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("My Host");
  });

  it("does not render when closed", () => {
    render(<AddHostWizard {...defaultProps} open={false} />);
    expect(screen.queryByText("Add a Host")).not.toBeInTheDocument();
  });

  it("shows all 4 step indicators in progress bar", () => {
    render(<AddHostWizard {...defaultProps} />);
    // Should show step numbers 1-4 (step 1 is active, 2-4 are muted)
    // Step 1 is highlighted, 2, 3, 4 are shown as numbers
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("navigates to step 2 on install CLI after creating key", async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ key: "ck_live_testkey123", prefix: "ck_live_testkey1" }),
    });

    render(<AddHostWizard {...defaultProps} />);

    // Fill in key name and submit
    const input = screen.getByPlaceholderText("e.g., Production Server");
    fireEvent.change(input, { target: { value: "Test Key" } });

    const submitButton = screen.getByText("Generate Key");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Install the CLI")).toBeInTheDocument();
    });
  });

  it("shows error on failed API key creation", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "API key limit reached" }),
    });

    render(<AddHostWizard {...defaultProps} />);

    const submitButton = screen.getByText("Generate Key");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("API key limit reached")).toBeInTheDocument();
    });
  });

  it("step 2 shows install command", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("curl -fsSL https://clawkeeper.dev/install.sh | bash")
    )).toBe(true);
  });

  it("step 2 has next button to step 3", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);
    expect(screen.getByText("Next: Harden Your Host")).toBeInTheDocument();
  });

  it("step 2 Next button advances to step 3 (Harden)", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    const nextButton = screen.getByText("Next: Harden Your Host");
    fireEvent.click(nextButton);

    expect(screen.getByText("Harden Your Host")).toBeInTheDocument();
  });

  it("step 3 shows both setup and scan commands", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    // Navigate to step 3
    fireEvent.click(screen.getByText("Next: Harden Your Host"));

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh setup")
    )).toBe(true);
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh scan")
    )).toBe(true);
  });

  it("step 3 highlights setup as recommended", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);
    fireEvent.click(screen.getByText("Next: Harden Your Host"));

    expect(
      screen.getByText("Recommended: Interactive hardening")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Alternative: Read-only audit")
    ).toBeInTheDocument();
  });

  it("step 3 Next advances to step 4 (Connect)", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    fireEvent.click(screen.getByText("Next: Connect to Dashboard"));

    expect(screen.getByText("Connect to Dashboard")).toBeInTheDocument();
  });

  it("step 4 shows agent install command", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    fireEvent.click(screen.getByText("Next: Connect to Dashboard"));

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh agent --install")
    )).toBe(true);
  });

  it("step 4 shows polling state after clicking connect button", () => {
    render(<AddHostWizard {...defaultProps} existingKeyCount={1} />);

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    fireEvent.click(screen.getByText("Next: Connect to Dashboard"));
    fireEvent.click(screen.getByText("I've connected the agent"));

    expect(
      screen.getByText(/Waiting for your first scan result/)
    ).toBeInTheDocument();
    expect(
      screen.getByText("clawkeeper.sh agent run")
    ).toBeInTheDocument();
  });

  it("handles network error gracefully in createKey", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network failure"));

    render(<AddHostWizard {...defaultProps} />);

    const submitButton = screen.getByText("Generate Key");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
    });

    // Button should no longer be disabled (loading reset by finally)
    expect(screen.getByText("Generate Key")).not.toBeDisabled();
  });

  it("sends correct request when creating API key", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ key: "ck_live_test", prefix: "ck_live_test" }),
    });

    render(<AddHostWizard {...defaultProps} />);

    const input = screen.getByPlaceholderText("e.g., Production Server");
    fireEvent.change(input, { target: { value: "My Server" } });
    fireEvent.click(screen.getByText("Generate Key"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Server", org_id: "org-123" }),
      });
    });
  });
});
