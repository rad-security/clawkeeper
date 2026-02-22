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

function mockSuccessfulKeyCreation() {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ key: "ck_live_testkey123", prefix: "ck_live_testkey1" }),
  });
}

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

  it("auto-creates an API key when dialog opens", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    // Should show loading state first
    expect(screen.getByText(/Generating API key/)).toBeInTheDocument();

    // Then show the key
    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });
  });

  it("starts at step 2 with step 1 already checked", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    expect(screen.getByText("Install the CLI")).toBeInTheDocument();
    // Step 1 should be completed (no "1" number visible — it's a check icon)
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AddHostWizard {...defaultProps} open={false} />);
    expect(screen.queryByText("Add a Host")).not.toBeInTheDocument();
  });

  it("shows all 4 step indicators in progress bar", () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows error on failed API key creation", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "API key limit reached" }),
    });

    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("API key limit reached")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("step 2 shows install command after key is created", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("curl -fsSL https://clawkeeper.dev/install.sh | bash")
    )).toBe(true);
  });

  it("step 2 Next button is disabled while loading", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<AddHostWizard {...defaultProps} />);

    const nextButton = screen.getByText("Next: Harden Your Host");
    expect(nextButton).toBeDisabled();
  });

  it("step 2 Next button advances to step 3", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    expect(screen.getByText("Harden Your Host")).toBeInTheDocument();
  });

  it("step 3 shows both setup and scan commands", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next: Harden Your Host"));

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh setup")
    )).toBe(true);
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh scan")
    )).toBe(true);
  });

  it("step 3 highlights setup as recommended", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next: Harden Your Host"));

    expect(
      screen.getByText("Recommended: Interactive hardening")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Alternative: Read-only audit")
    ).toBeInTheDocument();
  });

  it("step 3 Next advances to step 4 (Connect)", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    fireEvent.click(screen.getByText("Next: Connect to Dashboard"));

    expect(screen.getByText("Connect to Dashboard")).toBeInTheDocument();
  });

  it("step 4 shows agent install command", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next: Harden Your Host"));
    fireEvent.click(screen.getByText("Next: Connect to Dashboard"));

    const copyCommands = screen.getAllByTestId("copy-command");
    expect(copyCommands.some((el) =>
      el.textContent?.includes("clawkeeper.sh agent --install")
    )).toBe(true);
  });

  it("step 4 shows polling state after clicking connect button", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("ck_live_testkey123")).toBeInTheDocument();
    });

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

  it("handles network error gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network failure"));

    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
    // Next button should be disabled when there's an error
    expect(screen.getByText("Next: Harden Your Host")).toBeDisabled();
  });

  it("sends correct request when auto-creating API key", async () => {
    mockSuccessfulKeyCreation();
    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Host key", org_id: "org-123" }),
      });
    });
  });

  it("retry button re-attempts key creation after error", async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: "ck_live_retrykey", prefix: "ck_live_retrkey" }),
      });

    render(<AddHostWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("ck_live_retrykey")).toBeInTheDocument();
    });
  });
});
