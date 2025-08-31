#[cfg(windows)]
mod overlay;
mod hotkeys;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use hotkeys::setup_global_hotkeys;

#[cfg(windows)]
use overlay::{CrosshairConfig, create_overlay_window, update_config, toggle_overlay, get_config};

#[derive(Clone, Serialize, Deserialize)]
struct ConfigPayload {
    config: CrosshairConfig,
}

#[derive(Clone, Serialize, Deserialize)]
struct CrosshairPreset {
    id: String,
    name: String,
    config: CrosshairConfig,
    created_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct FavoritesData {
    presets: Vec<CrosshairPreset>,
}

#[tauri::command]
async fn init_overlay() -> Result<String, String> {
    #[cfg(windows)]
    {
        create_overlay_window().map_err(|e| e.to_string())?;
        Ok("Overlay initialized".to_string())
    }
    
    #[cfg(not(windows))]
    {
        Err("Overlay is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn update_crosshair_config(config: CrosshairConfig) -> Result<(), String> {
    #[cfg(windows)]
    {
        update_config(config).map_err(|e| e.to_string())?;
        Ok(())
    }
    
    #[cfg(not(windows))]
    {
        Err("Overlay is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn toggle_crosshair(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        toggle_overlay(enabled).map_err(|e| e.to_string())?;
        Ok(())
    }
    
    #[cfg(not(windows))]
    {
        Err("Overlay is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn get_crosshair_config() -> Result<CrosshairConfig, String> {
    #[cfg(windows)]
    {
        Ok(get_config())
    }
    
    #[cfg(not(windows))]
    {
        Err("Overlay is only supported on Windows".to_string())
    }
}

#[tauri::command]
async fn save_config(config: CrosshairConfig) -> Result<(), String> {
    let config_str = serde_json::to_string_pretty(&config)
        .map_err(|e| e.to_string())?;
    
    let config_path = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("crosshair-overlay")
        .join("config.json");
    
    std::fs::create_dir_all(config_path.parent().unwrap())
        .map_err(|e| e.to_string())?;
    
    std::fs::write(config_path, config_str)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn save_preset(preset: CrosshairPreset) -> Result<(), String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("crosshair-overlay");
    
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| e.to_string())?;
    
    let presets_path = config_dir.join("presets.json");
    
    // Load existing presets
    let mut favorites_data = if presets_path.exists() {
        let presets_str = std::fs::read_to_string(&presets_path)
            .map_err(|e| e.to_string())?;
        serde_json::from_str::<FavoritesData>(&presets_str)
            .unwrap_or(FavoritesData { presets: Vec::new() })
    } else {
        FavoritesData { presets: Vec::new() }
    };
    
    // Remove existing preset with same ID if it exists
    favorites_data.presets.retain(|p| p.id != preset.id);
    
    // Add new preset
    favorites_data.presets.push(preset);
    
    // Save back to file
    let presets_str = serde_json::to_string_pretty(&favorites_data)
        .map_err(|e| e.to_string())?;
    
    std::fs::write(presets_path, presets_str)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn load_presets() -> Result<Vec<CrosshairPreset>, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("crosshair-overlay");
    
    let presets_path = config_dir.join("presets.json");
    
    if !presets_path.exists() {
        return Ok(Vec::new());
    }
    
    let presets_str = std::fs::read_to_string(presets_path)
        .map_err(|e| e.to_string())?;
    
    let favorites_data: FavoritesData = serde_json::from_str(&presets_str)
        .unwrap_or(FavoritesData { presets: Vec::new() });
    
    Ok(favorites_data.presets)
}

#[tauri::command]
async fn delete_preset(id: String) -> Result<(), String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("crosshair-overlay");
    
    let presets_path = config_dir.join("presets.json");
    
    if !presets_path.exists() {
        return Ok(());
    }
    
    let presets_str = std::fs::read_to_string(&presets_path)
        .map_err(|e| e.to_string())?;
    
    let mut favorites_data: FavoritesData = serde_json::from_str(&presets_str)
        .unwrap_or(FavoritesData { presets: Vec::new() });
    
    // Remove preset with matching ID
    favorites_data.presets.retain(|p| p.id != id);
    
    // Save back to file
    let presets_str = serde_json::to_string_pretty(&favorites_data)
        .map_err(|e| e.to_string())?;
    
    std::fs::write(presets_path, presets_str)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn load_config() -> Result<CrosshairConfig, String> {
    let config_path = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("crosshair-overlay")
        .join("config.json");
    
    if !config_path.exists() {
        return Ok(CrosshairConfig::default());
    }
    
    let config_str = std::fs::read_to_string(config_path)
        .map_err(|e| e.to_string())?;
    
    let config: CrosshairConfig = serde_json::from_str(&config_str)
        .map_err(|e| e.to_string())?;
    
    Ok(config)
}

fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Toggle Crosshair", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    
    let menu = Menu::with_items(app, &[&toggle_item, &settings_item, &quit_item])?;
    
    let _ = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "toggle" => {
                #[cfg(windows)]
                {
                    let config = get_config();
                    let _ = toggle_overlay(!config.enabled);
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            create_tray(app.handle())?;
            
            // Setup global hotkeys
            if let Err(e) = setup_global_hotkeys(app.handle().clone()) {
                eprintln!("Failed to setup hotkeys: {}", e);
            }
            
            // Initialize overlay on startup for Windows
            #[cfg(windows)]
            {
                tauri::async_runtime::spawn(async {
                    let _ = init_overlay().await;
                });
            }
            
            Ok(())
        })
        .on_window_event(|window, event| {
            // Prevent the window from closing and hide it instead
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the default close behavior
                api.prevent_close();
                // Hide the window instead
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            init_overlay,
            update_crosshair_config,
            toggle_crosshair,
            get_crosshair_config,
            save_config,
            load_config,
            save_preset,
            load_presets,
            delete_preset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}