use std::path::PathBuf;

use tauri::Manager;

use crate::types::{CheckMeta, PhaseInfo};

/// Phase display labels
fn phase_label(phase_id: &str) -> &str {
    match phase_id {
        "host_hardening" => "Host Hardening",
        "network" => "Network",
        "prerequisites" => "Prerequisites",
        "security_audit" => "Security Audit",
        _ => phase_id,
    }
}

/// Phase sort order
fn phase_order(phase_id: &str) -> u32 {
    match phase_id {
        "host_hardening" => 1,
        "network" => 2,
        "prerequisites" => 3,
        "security_audit" => 4,
        _ => 99,
    }
}

/// Resolve the base resource directory containing checks/ and lib/.
/// In dev mode, falls back to the repo root via CARGO_MANIFEST_DIR.
pub fn resolve_resource_base(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try Tauri resource resolver first (production bundle)
    if let Ok(resource_path) = app
        .path()
        .resolve("checks", tauri::path::BaseDirectory::Resource)
    {
        let resource_path: PathBuf = resource_path;
        if resource_path.exists() {
            // Resource base is parent of checks/
            if let Some(base) = resource_path.parent() {
                return Ok(base.to_path_buf());
            }
        }
    }

    // Dev mode fallback: CARGO_MANIFEST_DIR/../../ → repo root
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .parent()
        .and_then(|p| p.parent())
        .ok_or("Could not resolve repo root from CARGO_MANIFEST_DIR")?;

    let checks_dir = repo_root.join("checks");
    if checks_dir.exists() {
        Ok(repo_root.to_path_buf())
    } else {
        Err(format!(
            "Could not find checks/ in resource dir or repo root ({})",
            repo_root.display()
        ))
    }
}

/// Load all check.toml files, filter to macOS-compatible checks, sort by order.
pub fn load_catalog(base: &PathBuf) -> Result<Vec<CheckMeta>, String> {
    let checks_dir = base.join("checks");
    if !checks_dir.exists() {
        return Err(format!("checks/ directory not found at {}", checks_dir.display()));
    }

    let mut checks = Vec::new();

    let entries = std::fs::read_dir(&checks_dir)
        .map_err(|e| format!("Failed to read checks/: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let toml_path = path.join("check.toml");
        if !toml_path.exists() {
            continue;
        }

        let content = std::fs::read_to_string(&toml_path)
            .map_err(|e| format!("Failed to read {}: {}", toml_path.display(), e))?;

        let meta: CheckMeta = toml::from_str(&content)
            .map_err(|e| format!("Failed to parse {}: {}", toml_path.display(), e))?;

        // Filter: only include checks for macOS or "all" platforms
        if meta.platform == "macos" || meta.platform == "all" {
            checks.push(meta);
        }
    }

    // Sort by order field
    checks.sort_by_key(|c| c.order);

    Ok(checks)
}

/// Build ordered list of phases from the catalog.
pub fn build_phase_list(checks: &[CheckMeta]) -> Vec<PhaseInfo> {
    let mut seen = std::collections::HashSet::new();
    let mut phases = Vec::new();

    for check in checks {
        if seen.insert(check.phase.clone()) {
            phases.push(PhaseInfo {
                id: check.phase.clone(),
                label: phase_label(&check.phase).to_string(),
                order: phase_order(&check.phase),
            });
        }
    }

    phases.sort_by_key(|p| p.order);
    phases
}
