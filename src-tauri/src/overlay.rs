use std::sync::{Arc, Mutex};
use windows::{
    core::*,
    Win32::{
        Foundation::*,
        Graphics::Gdi::*,
        System::LibraryLoader::*,
        UI::WindowsAndMessaging::*,
    },
};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

static OVERLAY_STATE: Lazy<Arc<Mutex<OverlayState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(OverlayState::default()))
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrosshairConfig {
    pub enabled: bool,
    pub size: i32,
    pub thickness: i32,
    pub gap: i32,
    pub color: u32,
    pub outline_color: u32,
    pub outline_thickness: i32,
    pub show_dot: bool,
    pub dot_size: i32,
    pub show_outline: bool,
    pub opacity: f32,
}

impl Default for CrosshairConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            size: 10,
            thickness: 2,
            gap: 5,
            color: 0x00FF00, // Green
            outline_color: 0x000000,
            outline_thickness: 1,
            show_dot: true,
            dot_size: 2,
            show_outline: true,
            opacity: 1.0,
        }
    }
}

struct OverlayState {
    hwnd: Option<HWND>,
    config: CrosshairConfig,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            hwnd: None,
            config: CrosshairConfig::default(),
        }
    }
}

unsafe impl Send for OverlayState {}
unsafe impl Sync for OverlayState {}

pub fn create_overlay_window() -> Result<()> {
    std::thread::spawn(|| {
        unsafe {
            let instance = GetModuleHandleW(None)?;
            let class_name = w!("CrosshairOverlayClass");
            
            let wc = WNDCLASSEXW {
                cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(window_proc),
                hInstance: instance.into(),
                hCursor: LoadCursorW(None, IDC_ARROW)?,
                lpszClassName: class_name,
                hbrBackground: HBRUSH(std::ptr::null_mut()), // No background brush for transparency
                ..Default::default()
            };
            
            RegisterClassExW(&wc);
            
            let screen_width = GetSystemMetrics(SM_CXSCREEN);
            let screen_height = GetSystemMetrics(SM_CYSCREEN);
            
            // Calculate window size based on default crosshair config
            let default_config = CrosshairConfig::default();
            let window_size = (default_config.size + default_config.gap) * 2 + default_config.thickness * 2 + 20; // Add padding
            
            // Center the window on screen
            let x = (screen_width - window_size) / 2;
            let y = (screen_height - window_size) / 2;
            
            let hwnd = CreateWindowExW(
                WS_EX_TOPMOST | WS_EX_TRANSPARENT | WS_EX_LAYERED | WS_EX_TOOLWINDOW,
                class_name,
                w!("Crosshair Overlay"),
                WS_POPUP | WS_VISIBLE,
                x,
                y,
                window_size,
                window_size,
                None,
                None,
                instance,
                None,
            )?;
            
            // Use color key for transparency - make black transparent
            SetLayeredWindowAttributes(hwnd, COLORREF(0x000000), 255, LWA_COLORKEY)?;
            
            {
                let mut state = OVERLAY_STATE.lock().unwrap();
                state.hwnd = Some(hwnd);
            }
            
            let _ = ShowWindow(hwnd, SW_SHOW);
            let _ = UpdateWindow(hwnd);
            
            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            
            Ok::<(), windows::core::Error>(())
        }
    });
    
    Ok(())
}

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_PAINT => {
            let mut ps = PAINTSTRUCT::default();
            let hdc = BeginPaint(hwnd, &mut ps);
            
            // Get window client area
            let mut rect = RECT::default();
            let _ = GetClientRect(hwnd, &mut rect);
            
            // Clear the window with the transparent color (black)
            let black_brush = HBRUSH(GetStockObject(BLACK_BRUSH).0);
            FillRect(hdc, &rect, black_brush);
            
            let state = OVERLAY_STATE.lock().unwrap();
            if state.config.enabled {
                draw_crosshair(hdc, &state.config);
            }
            
            let _ = EndPaint(hwnd, &ps);
            LRESULT(0)
        }
        WM_DESTROY => {
            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

fn draw_crosshair(hdc: HDC, config: &CrosshairConfig) {
    unsafe {
        // Get the window rectangle to find center
        let hwnd = WindowFromDC(hdc);
        let mut rect = RECT::default();
        let _ = GetClientRect(hwnd, &mut rect);
        let center_x = (rect.right - rect.left) / 2;
        let center_y = (rect.bottom - rect.top) / 2;
        
        // Create pen for crosshair
        let r = ((config.color >> 16) & 0xFF) as u8;
        let g = ((config.color >> 8) & 0xFF) as u8;
        let b = (config.color & 0xFF) as u8;
        
        let color = (b as u32) << 16 | (g as u32) << 8 | r as u32;
        let pen = CreatePen(PS_SOLID, config.thickness, COLORREF(color));
        let old_pen = SelectObject(hdc, pen);
        
        // Draw outline if enabled
        if config.show_outline {
            let outline_r = ((config.outline_color >> 16) & 0xFF) as u8;
            let outline_g = ((config.outline_color >> 8) & 0xFF) as u8;
            let outline_b = (config.outline_color & 0xFF) as u8;
            
            let outline_color = (outline_b as u32) << 16 | (outline_g as u32) << 8 | outline_r as u32;
            let outline_pen = CreatePen(
                PS_SOLID,
                config.thickness + config.outline_thickness * 2,
                COLORREF(outline_color)
            );
            let _ = SelectObject(hdc, outline_pen);
            
            // Draw outline lines
            draw_crosshair_lines(hdc, center_x, center_y, config);
            
            let _ = DeleteObject(outline_pen);
            let _ = SelectObject(hdc, pen);
        }
        
        // Draw main crosshair lines
        draw_crosshair_lines(hdc, center_x, center_y, config);
        
        // Draw center dot if enabled
        if config.show_dot {
            let dot_brush = CreateSolidBrush(COLORREF(color));
            let old_brush = SelectObject(hdc, dot_brush);
            
            let _ = Ellipse(
                hdc,
                center_x - config.dot_size,
                center_y - config.dot_size,
                center_x + config.dot_size,
                center_y + config.dot_size,
            );
            
            SelectObject(hdc, old_brush);
            let _ = DeleteObject(dot_brush);
        }
        
        SelectObject(hdc, old_pen);
        let _ = DeleteObject(pen);
    }
}

fn draw_crosshair_lines(hdc: HDC, center_x: i32, center_y: i32, config: &CrosshairConfig) {
    unsafe {
        // Top line
        let _ = MoveToEx(hdc, center_x, center_y - config.gap - config.size, None);
        let _ = LineTo(hdc, center_x, center_y - config.gap);
        
        // Bottom line
        let _ = MoveToEx(hdc, center_x, center_y + config.gap, None);
        let _ = LineTo(hdc, center_x, center_y + config.gap + config.size);
        
        // Left line
        let _ = MoveToEx(hdc, center_x - config.gap - config.size, center_y, None);
        let _ = LineTo(hdc, center_x - config.gap, center_y);
        
        // Right line
        let _ = MoveToEx(hdc, center_x + config.gap, center_y, None);
        let _ = LineTo(hdc, center_x + config.gap + config.size, center_y);
    }
}

pub fn update_config(config: CrosshairConfig) -> Result<()> {
    let mut state = OVERLAY_STATE.lock().unwrap();
    let old_size = (state.config.size + state.config.gap) * 2 + state.config.thickness * 2 + 20;
    state.config = config.clone();
    
    if let Some(hwnd) = state.hwnd {
        unsafe {
            // Calculate new window size
            let new_size = (config.size + config.gap) * 2 + config.thickness * 2 + 20;
            
            // Only resize if size changed
            if new_size != old_size {
                let screen_width = GetSystemMetrics(SM_CXSCREEN);
                let screen_height = GetSystemMetrics(SM_CYSCREEN);
                let x = (screen_width - new_size) / 2;
                let y = (screen_height - new_size) / 2;
                
                SetWindowPos(
                    hwnd,
                    HWND_TOPMOST,
                    x,
                    y,
                    new_size,
                    new_size,
                    SWP_SHOWWINDOW,
                )?;
            }
            
            let _ = InvalidateRect(hwnd, None, true);
        }
    }
    
    Ok(())
}

pub fn toggle_overlay(enabled: bool) -> Result<()> {
    let mut state = OVERLAY_STATE.lock().unwrap();
    state.config.enabled = enabled;
    
    if let Some(hwnd) = state.hwnd {
        unsafe {
            let _ = InvalidateRect(hwnd, None, true);
        }
    }
    
    Ok(())
}

pub fn get_config() -> CrosshairConfig {
    let state = OVERLAY_STATE.lock().unwrap();
    state.config.clone()
}