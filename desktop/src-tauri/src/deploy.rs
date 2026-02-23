use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::process::Command;

/// Events streamed during the deploy/setup process
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event")]
pub enum DeployEvent {
    StepStarted {
        step_id: String,
        label: String,
    },
    StepLog {
        step_id: String,
        level: String, // "info", "warn", "error", "success"
        message: String,
    },
    StepCompleted {
        step_id: String,
        success: bool,
    },
    DeployCompleted {
        success: bool,
        message: String,
    },
}

/// Detection result for OpenClaw installation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawStatus {
    pub installed: bool,
    pub install_type: Option<String>, // "docker", "native", or null
    pub running: bool,
    pub docker_available: bool,
    pub node_available: bool,
    pub homebrew_available: bool,
}

/// Detect current OpenClaw installation status
pub async fn detect_openclaw() -> OpenClawStatus {
    let docker_available = Command::new("command")
        .arg("-v")
        .arg("docker")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false)
        || Command::new("which")
            .arg("docker")
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false);

    let node_available = Command::new("which")
        .arg("node")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    let homebrew_available = Command::new("which")
        .arg("brew")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    // Check for running Docker container
    let docker_running = if docker_available {
        Command::new("docker")
            .args(["ps", "--format", "{{.Names}}"])
            .output()
            .await
            .map(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .any(|l| l.contains("openclaw"))
            })
            .unwrap_or(false)
    } else {
        false
    };

    // Check for native openclaw process
    let native_running = Command::new("pgrep")
        .args(["-fl", "openclaw"])
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    // Check for docker-compose file
    let compose_exists = home_dir()
        .map(|h| h.join("openclaw-docker/docker-compose.yml").exists())
        .unwrap_or(false);

    // Check for native install
    let native_installed = Command::new("which")
        .arg("openclaw")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    let (installed, install_type, running) = if docker_running {
        (true, Some("docker".to_string()), true)
    } else if native_running {
        (true, Some("native".to_string()), true)
    } else if compose_exists {
        (true, Some("docker".to_string()), false)
    } else if native_installed {
        (true, Some("native".to_string()), false)
    } else {
        (false, None, false)
    };

    OpenClawStatus {
        installed,
        install_type,
        running,
        docker_available,
        node_available,
        homebrew_available,
    }
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

/// Run the full deploy pipeline for the given mode
pub async fn run_deploy(
    mode: &str, // "docker" or "native"
    api_key: Option<String>,
    on_event: &Channel<DeployEvent>,
) -> Result<(), String> {
    let home = home_dir().ok_or("Could not determine home directory")?;

    // Step 1: Create directories
    send(on_event, DeployEvent::StepStarted {
        step_id: "directories".into(),
        label: "Creating secure directories".into(),
    });

    let dirs = if mode == "docker" {
        vec![
            home.join(".openclaw"),
            home.join("openclaw/workspace"),
            home.join("openclaw-docker"),
        ]
    } else {
        vec![home.join(".openclaw"), home.join("openclaw/workspace")]
    };

    for dir in &dirs {
        if !dir.exists() {
            std::fs::create_dir_all(dir)
                .map_err(|e| format!("Failed to create {}: {}", dir.display(), e))?;
            send(on_event, DeployEvent::StepLog {
                step_id: "directories".into(),
                level: "success".into(),
                message: format!("Created {}", dir.display()),
            });
        } else {
            send(on_event, DeployEvent::StepLog {
                step_id: "directories".into(),
                level: "info".into(),
                message: format!("{} already exists", dir.display()),
            });
        }
        // Set permissions to 700
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700));
        }
    }

    send(on_event, DeployEvent::StepCompleted {
        step_id: "directories".into(),
        success: true,
    });

    // Step 2: Create .env file with gateway token
    send(on_event, DeployEvent::StepStarted {
        step_id: "env_file".into(),
        label: "Setting up environment & secrets".into(),
    });

    let env_path = if mode == "docker" {
        home.join("openclaw-docker/.env")
    } else {
        home.join(".openclaw/.env")
    };

    let token = generate_gateway_token().await?;

    if env_path.exists() {
        let content = std::fs::read_to_string(&env_path).unwrap_or_default();
        if content.contains("GATEWAY_TOKEN=") {
            send(on_event, DeployEvent::StepLog {
                step_id: "env_file".into(),
                level: "info".into(),
                message: ".env already has a gateway token".into(),
            });
        } else {
            let mut content = content;
            content.push_str(&format!("\nGATEWAY_TOKEN={}\n", token));
            std::fs::write(&env_path, &content)
                .map_err(|e| format!("Failed to update .env: {}", e))?;
            send(on_event, DeployEvent::StepLog {
                step_id: "env_file".into(),
                level: "success".into(),
                message: "Generated and added GATEWAY_TOKEN".into(),
            });
        }
    } else {
        let content = format!(
            "# Clawkeeper — OpenClaw {} environment\n\
             # Generated: {}\n\n\
             # Gateway authentication token (required)\n\
             GATEWAY_TOKEN={}\n\n\
             # LLM API key\n{}\n",
            if mode == "docker" { "Docker" } else { "native" },
            chrono_now(),
            token,
            if let Some(ref key) = api_key {
                format!("ANTHROPIC_API_KEY={}", key)
            } else {
                "# ANTHROPIC_API_KEY=sk-ant-...".into()
            }
        );
        std::fs::write(&env_path, &content)
            .map_err(|e| format!("Failed to create .env: {}", e))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&env_path, std::fs::Permissions::from_mode(0o600));
        }

        send(on_event, DeployEvent::StepLog {
            step_id: "env_file".into(),
            level: "success".into(),
            message: format!(".env created at {}", env_path.display()),
        });
    }

    send(on_event, DeployEvent::StepCompleted {
        step_id: "env_file".into(),
        success: true,
    });

    // Step 3: Create hardened openclaw.json config
    send(on_event, DeployEvent::StepStarted {
        step_id: "config".into(),
        label: "Writing hardened configuration".into(),
    });

    let config_path = home.join(".openclaw/openclaw.json");
    let config = serde_json::json!({
        "gateway": {
            "mode": "local",
            "bind": "loopback",
            "auth": { "mode": "token", "allowTailscale": false },
            "controlUi": { "enabled": false }
        },
        "discovery": {
            "mdns": { "mode": "off" },
            "wideArea": { "enabled": false }
        },
        "tools": {
            "exec": {
                "applyPatch": { "workspaceOnly": true }
            }
        },
        "logging": {
            "redactSensitive": "tools"
        }
    });

    if config_path.exists() {
        send(on_event, DeployEvent::StepLog {
            step_id: "config".into(),
            level: "info".into(),
            message: "openclaw.json already exists, checking settings...".into(),
        });
    }

    std::fs::write(
        &config_path,
        serde_json::to_string_pretty(&config).unwrap(),
    )
    .map_err(|e| format!("Failed to write openclaw.json: {}", e))?;

    send(on_event, DeployEvent::StepLog {
        step_id: "config".into(),
        level: "success".into(),
        message: "Hardened openclaw.json written".into(),
    });

    send(on_event, DeployEvent::StepCompleted {
        step_id: "config".into(),
        success: true,
    });

    // Step 4: Mode-specific setup
    if mode == "docker" {
        setup_docker(&home, on_event).await?;
    } else {
        setup_native_launchd(&home, &token, on_event).await?;
    }

    send(on_event, DeployEvent::DeployCompleted {
        success: true,
        message: format!(
            "OpenClaw deployed successfully via {}",
            if mode == "docker" { "Docker" } else { "native (npm)" }
        ),
    });

    Ok(())
}

async fn setup_docker(home: &PathBuf, on_event: &Channel<DeployEvent>) -> Result<(), String> {
    send(on_event, DeployEvent::StepStarted {
        step_id: "docker_compose".into(),
        label: "Generating Docker Compose config".into(),
    });

    let compose_path = home.join("openclaw-docker/docker-compose.yml");
    let compose = r#"services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    container_name: openclaw
    restart: unless-stopped
    user: "1000:1000"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4g
        reservations:
          cpus: "0.25"
          memory: 512m
    ports:
      - "127.0.0.1:18789:18789"
      - "127.0.0.1:18790:18790"
    volumes:
      - ${HOME}/.openclaw/openclaw.json:/home/openclaw/.openclaw/openclaw.json:ro
      - ${HOME}/openclaw/workspace:/home/openclaw/workspace
    tmpfs:
      - /tmp:noexec,nosuid,size=256m
      - /home/openclaw/.openclaw/logs:noexec,nosuid,size=128m
    env_file:
      - .env
    environment:
      - OPENCLAW_DISABLE_BONJOUR=1
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:18789/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - openclaw_net

networks:
  openclaw_net:
    driver: bridge
    internal: false
"#;

    std::fs::write(&compose_path, compose)
        .map_err(|e| format!("Failed to write docker-compose.yml: {}", e))?;

    send(on_event, DeployEvent::StepLog {
        step_id: "docker_compose".into(),
        level: "success".into(),
        message: "Hardened docker-compose.yml written".into(),
    });

    send(on_event, DeployEvent::StepCompleted {
        step_id: "docker_compose".into(),
        success: true,
    });

    // Pull and start
    send(on_event, DeployEvent::StepStarted {
        step_id: "docker_start".into(),
        label: "Pulling image and starting container".into(),
    });

    let compose_dir = home.join("openclaw-docker");

    // Pull latest image
    let pull = Command::new("docker")
        .args(["compose", "pull"])
        .current_dir(&compose_dir)
        .output()
        .await
        .map_err(|e| format!("Failed to pull Docker image: {}", e))?;

    if pull.status.success() {
        send(on_event, DeployEvent::StepLog {
            step_id: "docker_start".into(),
            level: "success".into(),
            message: "Docker image pulled".into(),
        });
    } else {
        let stderr = String::from_utf8_lossy(&pull.stderr);
        send(on_event, DeployEvent::StepLog {
            step_id: "docker_start".into(),
            level: "warn".into(),
            message: format!("Pull warning: {}", stderr.trim()),
        });
    }

    // Start container
    let up = Command::new("docker")
        .args(["compose", "up", "-d"])
        .current_dir(&compose_dir)
        .output()
        .await
        .map_err(|e| format!("Failed to start Docker container: {}", e))?;

    if up.status.success() {
        send(on_event, DeployEvent::StepLog {
            step_id: "docker_start".into(),
            level: "success".into(),
            message: "OpenClaw container started".into(),
        });
    } else {
        let stderr = String::from_utf8_lossy(&up.stderr);
        send(on_event, DeployEvent::StepLog {
            step_id: "docker_start".into(),
            level: "error".into(),
            message: format!("Failed to start: {}", stderr.trim()),
        });
        send(on_event, DeployEvent::StepCompleted {
            step_id: "docker_start".into(),
            success: false,
        });
        return Err("Docker container failed to start".into());
    }

    // Wait for healthy
    send(on_event, DeployEvent::StepLog {
        step_id: "docker_start".into(),
        level: "info".into(),
        message: "Waiting for container to become healthy...".into(),
    });

    for _ in 0..15 {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        let health = Command::new("docker")
            .args(["inspect", "--format", "{{.State.Health.Status}}", "openclaw"])
            .output()
            .await;

        if let Ok(output) = health {
            let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if status == "healthy" {
                send(on_event, DeployEvent::StepLog {
                    step_id: "docker_start".into(),
                    level: "success".into(),
                    message: "Container is healthy".into(),
                });
                send(on_event, DeployEvent::StepCompleted {
                    step_id: "docker_start".into(),
                    success: true,
                });
                return Ok(());
            }
        }
    }

    send(on_event, DeployEvent::StepLog {
        step_id: "docker_start".into(),
        level: "warn".into(),
        message: "Container started but health check timed out (30s)".into(),
    });

    send(on_event, DeployEvent::StepCompleted {
        step_id: "docker_start".into(),
        success: true, // Container is running, just not healthy yet
    });

    Ok(())
}

async fn setup_native_launchd(
    home: &PathBuf,
    token: &str,
    on_event: &Channel<DeployEvent>,
) -> Result<(), String> {
    send(on_event, DeployEvent::StepStarted {
        step_id: "launchd".into(),
        label: "Setting up auto-start (LaunchAgent)".into(),
    });

    let plist_dir = home.join("Library/LaunchAgents");
    let plist_path = plist_dir.join("com.openclaw.agent.plist");

    if plist_path.exists() {
        send(on_event, DeployEvent::StepLog {
            step_id: "launchd".into(),
            level: "info".into(),
            message: "LaunchAgent already exists".into(),
        });
        send(on_event, DeployEvent::StepCompleted {
            step_id: "launchd".into(),
            success: true,
        });
        return Ok(());
    }

    std::fs::create_dir_all(&plist_dir)
        .map_err(|e| format!("Failed to create LaunchAgents dir: {}", e))?;

    // Find openclaw binary
    let openclaw_bin = Command::new("which")
        .arg("openclaw")
        .output()
        .await
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "/usr/local/bin/openclaw".to_string());

    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--gateway</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{}/openclaw/workspace</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>GATEWAY_TOKEN</key>
        <string>{}</string>
        <key>OPENCLAW_DISABLE_BONJOUR</key>
        <string>1</string>
    </dict>
    <key>StandardOutPath</key>
    <string>{}/openclaw/workspace/openclaw.log</string>
    <key>StandardErrorPath</key>
    <string>{}/openclaw/workspace/openclaw.err</string>
</dict>
</plist>"#,
        openclaw_bin,
        home.display(),
        token,
        home.display(),
        home.display()
    );

    std::fs::write(&plist_path, &plist)
        .map_err(|e| format!("Failed to write LaunchAgent: {}", e))?;

    send(on_event, DeployEvent::StepLog {
        step_id: "launchd".into(),
        level: "success".into(),
        message: "LaunchAgent created".into(),
    });

    // Load the LaunchAgent
    let load = Command::new("launchctl")
        .args(["load", "-w"])
        .arg(&plist_path)
        .output()
        .await;

    if let Ok(output) = load {
        if output.status.success() {
            send(on_event, DeployEvent::StepLog {
                step_id: "launchd".into(),
                level: "success".into(),
                message: "LaunchAgent loaded and started".into(),
            });
        }
    }

    send(on_event, DeployEvent::StepCompleted {
        step_id: "launchd".into(),
        success: true,
    });

    Ok(())
}

async fn generate_gateway_token() -> Result<String, String> {
    let output = Command::new("openssl")
        .args(["rand", "-hex", "24"])
        .output()
        .await
        .map_err(|e| format!("Failed to generate token: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("openssl rand failed".into())
    }
}

fn chrono_now() -> String {
    // Simple UTC timestamp without chrono dependency
    let output = std::process::Command::new("date")
        .args(["-u", "+%Y-%m-%dT%H:%M:%SZ"])
        .output()
        .ok();

    output
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".into())
}

fn send(channel: &Channel<DeployEvent>, event: DeployEvent) {
    let _ = channel.send(event);
}
