use global_hotkey::{
    hotkey::{Code, HotKey},
    GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState,
};
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use crate::overlay::{get_config, toggle_overlay};

pub fn setup_global_hotkeys(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let manager = GlobalHotKeyManager::new()?;
    
    // F9 hotkey for toggle
    let hotkey = HotKey::new(None, Code::F9);
    manager.register(hotkey)?;
    
    // Create a channel for hotkey events (unused but kept for future use)
    let (_tx, _rx) = mpsc::channel::<()>();
    
    // Spawn a thread to handle hotkey events
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let global_hotkey_receiver = GlobalHotKeyEvent::receiver();
        
        loop {
            if let Ok(event) = global_hotkey_receiver.try_recv() {
                if event.state() == HotKeyState::Pressed {
                    // Toggle crosshair when F9 is pressed
                    #[cfg(windows)]
                    {
                        let current_config = get_config();
                        let new_enabled = !current_config.enabled;
                        
                        if let Err(e) = toggle_overlay(new_enabled) {
                            eprintln!("Failed to toggle overlay: {}", e);
                        }
                        
                        // Emit event to frontend to update UI
                        if let Err(e) = app_handle.emit("crosshair-toggled", new_enabled) {
                            eprintln!("Failed to emit toggle event: {}", e);
                        }
                    }
                }
            }
            
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
    
    Ok(())
}