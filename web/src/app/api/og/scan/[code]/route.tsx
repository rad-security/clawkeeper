import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#22c55e",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: shared } = await admin
    .from("shared_scans")
    .select("scan_id")
    .eq("share_code", code)
    .eq("is_public", true)
    .single();

  if (!shared) {
    return new Response("Not found", { status: 404 });
  }

  const { data: scan } = await admin
    .from("scans")
    .select("grade, score, passed, failed, skipped")
    .eq("id", shared.scan_id)
    .single();

  if (!scan) {
    return new Response("Not found", { status: 404 });
  }

  const gradeColor = GRADE_COLORS[scan.grade] || "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            CLAWKEEPER
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#71717a",
              padding: "4px 8px",
              border: "1px solid #27272a",
              borderRadius: "4px",
            }}
          >
            Security Report
          </div>
        </div>

        {/* Grade circle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "180px",
            height: "180px",
            borderRadius: "90px",
            border: `4px solid ${gradeColor}`,
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "96px",
              fontWeight: 800,
              color: gradeColor,
              lineHeight: 1,
            }}
          >
            {scan.grade}
          </div>
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: "24px",
            color: "#a1a1aa",
            marginBottom: "32px",
          }}
        >
          Score: {scan.score}/100
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#22c55e" }}>
              {scan.passed}
            </div>
            <div style={{ fontSize: "14px", color: "#71717a" }}>Passed</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#ef4444" }}>
              {scan.failed}
            </div>
            <div style={{ fontSize: "14px", color: "#71717a" }}>Failed</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#eab308" }}>
              {scan.skipped}
            </div>
            <div style={{ fontSize: "14px", color: "#71717a" }}>Skipped</div>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "#06b6d4",
          }}
        >
          Scan yours free at clawkeeper.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
