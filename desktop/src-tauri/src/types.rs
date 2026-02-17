use serde::{Deserialize, Serialize};

/// Metadata from check.toml
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckMeta {
    pub id: String,
    pub name: String,
    pub phase: String,
    pub platform: String,
    pub description: String,
    #[serde(default)]
    pub requires_sudo: bool,
    #[serde(default)]
    pub order: u32,
}

/// Phase info for the frontend
#[derive(Debug, Clone, Serialize)]
pub struct PhaseInfo {
    pub id: String,
    pub label: String,
    pub order: u32,
}

/// Events streamed to the frontend via Channel
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event")]
pub enum ScanEvent {
    ScanStarted {
        checks: Vec<CheckMeta>,
        phases: Vec<PhaseInfo>,
    },
    PhaseStarted {
        phase_id: String,
        phase_label: String,
    },
    CheckStarted {
        check_id: String,
    },
    Info {
        check_id: String,
        message: String,
    },
    Warn {
        check_id: String,
        message: String,
    },
    CheckCompleted {
        check_id: String,
        check_name: String,
        status: String,
        detail: String,
    },
    Prompt {
        check_id: String,
        message: String,
        remediation_id: String,
        fail_detail: String,
        skip_detail: String,
    },
    ScanCompleted {
        passed: u32,
        failed: u32,
        skipped: u32,
        total: u32,
        score: f64,
        grade: String,
    },
    Error {
        check_id: String,
        message: String,
    },
}

/// Flat struct for deserializing JSON lines from check scripts.
/// Each line could be a status, info/warn, or prompt — we use
/// Option fields and match on which are present.
#[derive(Debug, Deserialize)]
pub struct CheckOutputLine {
    // Status line fields
    pub status: Option<String>,
    pub check_name: Option<String>,
    pub detail: Option<String>,

    // Info/warn line fields
    #[serde(rename = "type")]
    pub line_type: Option<String>,
    pub message: Option<String>,

    // Prompt line fields
    pub action: Option<String>,
    pub remediation_id: Option<String>,
    pub fail_detail: Option<String>,
    pub skip_detail: Option<String>,
}
