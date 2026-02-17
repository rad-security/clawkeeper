mod check_catalog;
mod check_runner;
mod deploy;
mod types;

use tauri::ipc::Channel;
use types::{CheckMeta, ScanEvent};

#[tauri::command]
async fn start_scan(
    app: tauri::AppHandle,
    on_event: Channel<ScanEvent>,
) -> Result<(), String> {
    let base = check_catalog::resolve_resource_base(&app)?;
    let checks = check_catalog::load_catalog(&base)?;
    let phases = check_catalog::build_phase_list(&checks);

    on_event
        .send(ScanEvent::ScanStarted {
            checks: checks.clone(),
            phases: phases.clone(),
        })
        .map_err(|e| format!("Channel send error: {}", e))?;

    check_runner::run_scan(base, checks, phases, &on_event).await
}

#[tauri::command]
async fn get_catalog(app: tauri::AppHandle) -> Result<Vec<CheckMeta>, String> {
    let base = check_catalog::resolve_resource_base(&app)?;
    check_catalog::load_catalog(&base)
}

#[tauri::command]
async fn detect_openclaw() -> Result<deploy::OpenClawStatus, String> {
    Ok(deploy::detect_openclaw().await)
}

#[tauri::command]
async fn start_deploy(
    mode: String,
    api_key: Option<String>,
    on_event: Channel<deploy::DeployEvent>,
) -> Result<(), String> {
    deploy::run_deploy(&mode, api_key, &on_event).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_scan,
            get_catalog,
            detect_openclaw,
            start_deploy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
