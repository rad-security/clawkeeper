use std::path::PathBuf;

use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::types::{CheckMeta, CheckOutputLine, PhaseInfo, ScanEvent};

/// Compute letter grade from score percentage.
fn compute_grade(score: f64) -> String {
    if score >= 90.0 {
        "A"
    } else if score >= 80.0 {
        "B"
    } else if score >= 70.0 {
        "C"
    } else if score >= 60.0 {
        "D"
    } else {
        "F"
    }
    .to_string()
}

/// Run the full scan: iterate phases and checks, stream events via Channel.
pub async fn run_scan(
    resource_base: PathBuf,
    checks: Vec<CheckMeta>,
    phases: Vec<PhaseInfo>,
    on_event: &Channel<ScanEvent>,
) -> Result<(), String> {
    let helpers_path = resource_base.join("lib").join("helpers.sh");
    let checks_base = resource_base.join("checks");

    let mut passed: u32 = 0;
    let mut failed: u32 = 0;
    let mut skipped: u32 = 0;

    // Iterate phases in order
    for phase in &phases {
        on_event
            .send(ScanEvent::PhaseStarted {
                phase_id: phase.id.clone(),
                phase_label: phase.label.clone(),
            })
            .map_err(|e| format!("Channel send error: {}", e))?;

        // Get checks for this phase
        let phase_checks: Vec<&CheckMeta> =
            checks.iter().filter(|c| c.phase == phase.id).collect();

        for check in phase_checks {
            on_event
                .send(ScanEvent::CheckStarted {
                    check_id: check.id.clone(),
                })
                .map_err(|e| format!("Channel send error: {}", e))?;

            let script_path = checks_base.join(&check.id).join("check.sh");

            if !script_path.exists() {
                on_event
                    .send(ScanEvent::Error {
                        check_id: check.id.clone(),
                        message: format!("check.sh not found at {}", script_path.display()),
                    })
                    .map_err(|e| format!("Channel send error: {}", e))?;
                failed += 1;
                on_event
                    .send(ScanEvent::CheckCompleted {
                        check_id: check.id.clone(),
                        check_name: check.name.clone(),
                        status: "FAIL".to_string(),
                        detail: "check.sh not found".to_string(),
                    })
                    .map_err(|e| format!("Channel send error: {}", e))?;
                continue;
            }

            match execute_check_script(&script_path, &helpers_path, check, on_event).await {
                Ok(status) => match status.as_str() {
                    "PASS" => passed += 1,
                    "FAIL" => failed += 1,
                    "SKIPPED" => skipped += 1,
                    _ => failed += 1,
                },
                Err(e) => {
                    failed += 1;
                    let _ = on_event.send(ScanEvent::Error {
                        check_id: check.id.clone(),
                        message: e.clone(),
                    });
                    let _ = on_event.send(ScanEvent::CheckCompleted {
                        check_id: check.id.clone(),
                        check_name: check.name.clone(),
                        status: "FAIL".to_string(),
                        detail: e,
                    });
                }
            }
        }
    }

    let total = passed + failed + skipped;
    let scoreable = passed + failed;
    let score = if scoreable > 0 {
        (passed as f64 / scoreable as f64) * 100.0
    } else {
        100.0
    };
    let grade = compute_grade(score);

    on_event
        .send(ScanEvent::ScanCompleted {
            passed,
            failed,
            skipped,
            total,
            score,
            grade,
        })
        .map_err(|e| format!("Channel send error: {}", e))?;

    Ok(())
}

/// Execute a single check script and parse its JSON line output.
/// Returns the final status string (PASS/FAIL/SKIPPED).
async fn execute_check_script(
    script_path: &PathBuf,
    _helpers_path: &PathBuf,
    check: &CheckMeta,
    on_event: &Channel<ScanEvent>,
) -> Result<String, String> {
    let mut child = Command::new("/bin/bash")
        .arg(script_path)
        .arg("--mode")
        .arg("scan")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn check {}: {}", check.id, e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| format!("No stdout for check {}", check.id))?;

    let mut reader = BufReader::new(stdout).lines();
    let mut final_status = String::from("FAIL");

    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|e| format!("IO error reading check {}: {}", check.id, e))?
    {
        let trimmed = line.trim();
        if trimmed.is_empty() || !trimmed.starts_with('{') {
            continue;
        }

        let parsed: CheckOutputLine = match serde_json::from_str(trimmed) {
            Ok(v) => v,
            Err(_) => continue, // Skip unparseable lines
        };

        // Determine line type and send appropriate event
        if let Some(ref action) = parsed.action {
            if action == "prompt" {
                // In Phase C, prompts are treated as FAIL (no interactive remediation)
                let _ = on_event.send(ScanEvent::Prompt {
                    check_id: check.id.clone(),
                    message: parsed.message.clone().unwrap_or_default(),
                    remediation_id: parsed.remediation_id.clone().unwrap_or_default(),
                    fail_detail: parsed.fail_detail.clone().unwrap_or_default(),
                    skip_detail: parsed.skip_detail.clone().unwrap_or_default(),
                });
                // Treat prompt as FAIL
                final_status = "FAIL".to_string();
                let detail = parsed.fail_detail.unwrap_or_default();
                let _ = on_event.send(ScanEvent::CheckCompleted {
                    check_id: check.id.clone(),
                    check_name: check.name.clone(),
                    status: "FAIL".to_string(),
                    detail,
                });
                // After prompt, the check script typically exits
            }
        } else if let Some(ref line_type) = parsed.line_type {
            match line_type.as_str() {
                "info" => {
                    let _ = on_event.send(ScanEvent::Info {
                        check_id: check.id.clone(),
                        message: parsed.message.unwrap_or_default(),
                    });
                }
                "warn" => {
                    let _ = on_event.send(ScanEvent::Warn {
                        check_id: check.id.clone(),
                        message: parsed.message.unwrap_or_default(),
                    });
                }
                _ => {}
            }
        } else if let Some(ref status) = parsed.status {
            final_status = status.clone();
            let _ = on_event.send(ScanEvent::CheckCompleted {
                check_id: check.id.clone(),
                check_name: parsed.check_name.unwrap_or_else(|| check.name.clone()),
                status: status.clone(),
                detail: parsed.detail.unwrap_or_default(),
            });
        }
    }

    // Wait for process to finish
    let exit_status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for check {}: {}", check.id, e))?;

    // If the script exited non-zero and we haven't gotten a status line, treat as error
    if !exit_status.success() && final_status == "FAIL" {
        // Already defaulted to FAIL, which is correct
    }

    Ok(final_status)
}
