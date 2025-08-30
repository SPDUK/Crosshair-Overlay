import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  Target, 
  Settings, 
  Power, 
  Save, 
  RotateCcw,
  Circle,
  Square
} from "lucide-react";
import "./App.css";

interface CrosshairConfig {
  enabled: boolean;
  size: number;
  thickness: number;
  gap: number;
  color: number;
  outline_color: number;
  outline_thickness: number;
  show_dot: boolean;
  dot_size: number;
  show_outline: boolean;
  opacity: number;
}

const DEFAULT_CONFIG: CrosshairConfig = {
  enabled: true,
  size: 10,
  thickness: 2,
  gap: 5,
  color: 0x00ff00,
  outline_color: 0x000000,
  outline_thickness: 1,
  show_dot: true,
  dot_size: 2,
  show_outline: true,
  opacity: 1.0,
};

const PRESET_COLORS = [
  { name: "Green", value: 0x00ff00 },
  { name: "Red", value: 0xff0000 },
  { name: "Yellow", value: 0xffff00 },
  { name: "Cyan", value: 0x00ffff },
  { name: "White", value: 0xffffff },
  { name: "Magenta", value: 0xff00ff },
];

const PRESETS = [
  { 
    name: "Classic Static", 
    config: { size: 5, thickness: 1, gap: 3, show_dot: false, show_outline: false } 
  },
  { 
    name: "Dynamic", 
    config: { size: 10, thickness: 2, gap: 5, show_dot: true, show_outline: false } 
  },
  { 
    name: "Dot Only", 
    config: { size: 0, thickness: 0, gap: 0, show_dot: true, dot_size: 3 } 
  },
  { 
    name: "Large", 
    config: { size: 15, thickness: 3, gap: 7, show_dot: true, show_outline: true } 
  },
];

function App() {
  const [config, setConfig] = useState<CrosshairConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    
    // Listen for hotkey toggle events
    const unlisten = listen("crosshair-toggled", (event) => {
      const enabled = event.payload as boolean;
      setConfig(prev => ({ ...prev, enabled }));
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const loadConfig = async () => {
    try {
      const loadedConfig = await invoke<CrosshairConfig>("load_config");
      setConfig(loadedConfig);
      await invoke("update_crosshair_config", { config: loadedConfig });
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const updateConfig = async (updates: Partial<CrosshairConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await invoke("update_crosshair_config", { config: newConfig });
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await invoke("save_config", { config });
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      console.error("Failed to save config:", error);
      setIsSaving(false);
    }
  };

  const resetConfig = async () => {
    setConfig(DEFAULT_CONFIG);
    await invoke("update_crosshair_config", { config: DEFAULT_CONFIG });
  };

  const applyPreset = (preset: any) => {
    updateConfig(preset.config);
  };

  const toggleCrosshair = async () => {
    const newEnabled = !config.enabled;
    await updateConfig({ enabled: newEnabled });
    await invoke("toggle_crosshair", { enabled: newEnabled });
  };

  const colorToHex = (color: number): string => {
    return "#" + color.toString(16).padStart(6, "0");
  };

  const hexToColor = (hex: string): number => {
    return parseInt(hex.substring(1), 16);
  };

  return (
    <div className="container">
      <header className="header">
        <div className="title-section">
          <Target className="logo" size={32} />
          <h1>Crosshair Overlay</h1>
        </div>
        <button 
          className={`toggle-btn ${config.enabled ? "enabled" : ""}`}
          onClick={toggleCrosshair}
        >
          <Power size={20} />
          {config.enabled ? "Enabled" : "Disabled"}
        </button>
      </header>

      <div className="content">
        <div className="sidebar">
          <h3>Presets</h3>
          <div className="preset-list">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="preset-btn"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <h3>Quick Colors</h3>
          <div className="color-grid">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.name}
                className="color-btn"
                style={{ backgroundColor: colorToHex(color.value) }}
                onClick={() => updateConfig({ color: color.value })}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="main-panel">
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="preview-box">
              <CrosshairPreview config={config} />
            </div>
          </div>

          <div className="controls">
            <div className="control-group">
              <label>
                <Settings size={16} />
                Size
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={config.size}
                onChange={(e) => updateConfig({ size: parseInt(e.target.value) })}
              />
              <span className="value">{config.size}</span>
            </div>

            <div className="control-group">
              <label>
                <Square size={16} />
                Thickness
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.thickness}
                onChange={(e) => updateConfig({ thickness: parseInt(e.target.value) })}
              />
              <span className="value">{config.thickness}</span>
            </div>

            <div className="control-group">
              <label>Gap</label>
              <input
                type="range"
                min="0"
                max="20"
                value={config.gap}
                onChange={(e) => updateConfig({ gap: parseInt(e.target.value) })}
              />
              <span className="value">{config.gap}</span>
            </div>

            <div className="control-group">
              <label>Color</label>
              <input
                type="color"
                value={colorToHex(config.color)}
                onChange={(e) => updateConfig({ color: hexToColor(e.target.value) })}
                className="color-picker"
              />
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.show_dot}
                  onChange={(e) => updateConfig({ show_dot: e.target.checked })}
                />
                <Circle size={16} />
                Show Center Dot
              </label>
            </div>

            {config.show_dot && (
              <div className="control-group">
                <label>Dot Size</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.dot_size}
                  onChange={(e) => updateConfig({ dot_size: parseInt(e.target.value) })}
                />
                <span className="value">{config.dot_size}</span>
              </div>
            )}

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.show_outline}
                  onChange={(e) => updateConfig({ show_outline: e.target.checked })}
                />
                Show Outline
              </label>
            </div>

            {config.show_outline && (
              <>
                <div className="control-group">
                  <label>Outline Thickness</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.outline_thickness}
                    onChange={(e) => updateConfig({ outline_thickness: parseInt(e.target.value) })}
                  />
                  <span className="value">{config.outline_thickness}</span>
                </div>

                <div className="control-group">
                  <label>Outline Color</label>
                  <input
                    type="color"
                    value={colorToHex(config.outline_color)}
                    onChange={(e) => updateConfig({ outline_color: hexToColor(e.target.value) })}
                    className="color-picker"
                  />
                </div>
              </>
            )}

            <div className="control-group">
              <label>Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={config.opacity}
                onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
              />
              <span className="value">{(config.opacity * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={saveConfig} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Config"}
            </button>
            <button className="btn btn-secondary" onClick={resetConfig}>
              <RotateCcw size={16} />
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrosshairPreview({ config }: { config: CrosshairConfig }) {
  const colorHex = "#" + config.color.toString(16).padStart(6, "0");
  const outlineColorHex = "#" + config.outline_color.toString(16).padStart(6, "0");
  
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="crosshair-preview">
      {/* Outline */}
      {config.show_outline && (
        <>
          <line
            x1="100"
            y1={100 - config.gap - config.size}
            x2="100"
            y2={100 - config.gap}
            stroke={outlineColorHex}
            strokeWidth={config.thickness + config.outline_thickness * 2}
            opacity={config.opacity}
          />
          <line
            x1="100"
            y1={100 + config.gap}
            x2="100"
            y2={100 + config.gap + config.size}
            stroke={outlineColorHex}
            strokeWidth={config.thickness + config.outline_thickness * 2}
            opacity={config.opacity}
          />
          <line
            x1={100 - config.gap - config.size}
            y1="100"
            x2={100 - config.gap}
            y2="100"
            stroke={outlineColorHex}
            strokeWidth={config.thickness + config.outline_thickness * 2}
            opacity={config.opacity}
          />
          <line
            x1={100 + config.gap}
            y1="100"
            x2={100 + config.gap + config.size}
            y2="100"
            stroke={outlineColorHex}
            strokeWidth={config.thickness + config.outline_thickness * 2}
            opacity={config.opacity}
          />
        </>
      )}
      
      {/* Main crosshair */}
      <line
        x1="100"
        y1={100 - config.gap - config.size}
        x2="100"
        y2={100 - config.gap}
        stroke={colorHex}
        strokeWidth={config.thickness}
        opacity={config.opacity}
      />
      <line
        x1="100"
        y1={100 + config.gap}
        x2="100"
        y2={100 + config.gap + config.size}
        stroke={colorHex}
        strokeWidth={config.thickness}
        opacity={config.opacity}
      />
      <line
        x1={100 - config.gap - config.size}
        y1="100"
        x2={100 - config.gap}
        y2="100"
        stroke={colorHex}
        strokeWidth={config.thickness}
        opacity={config.opacity}
      />
      <line
        x1={100 + config.gap}
        y1="100"
        x2={100 + config.gap + config.size}
        y2="100"
        stroke={colorHex}
        strokeWidth={config.thickness}
        opacity={config.opacity}
      />
      
      {/* Center dot */}
      {config.show_dot && (
        <circle
          cx="100"
          cy="100"
          r={config.dot_size}
          fill={colorHex}
          opacity={config.opacity}
        />
      )}
    </svg>
  );
}

export default App;