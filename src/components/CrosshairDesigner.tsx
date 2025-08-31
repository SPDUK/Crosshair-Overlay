import { useState } from "react";
import { 
  Palette, 
  Move, 
  RotateCw, 
  Square, 
  Circle, 
  Minus,
  Plus,
  Crosshair,
  Star
} from "lucide-react";

export type CrosshairStyle = 'Classic' | 'Dot' | 'Circle' | 'Square' | 'TShape';

export interface CrosshairLine {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  thickness: number;
  color: number;
}

export interface CrosshairConfig {
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
  style: CrosshairStyle;
  position_x: number;
  position_y: number;
  rotation: number;
  t_length: number;
  shadow_enabled: boolean;
  shadow_color: number;
  shadow_offset: number;
  lines: CrosshairLine[];
}

interface CrosshairDesignerProps {
  config: CrosshairConfig;
  onConfigChange: (config: CrosshairConfig) => void;
}

const PRESET_STYLES: { name: CrosshairStyle; icon: React.ReactNode; description: string }[] = [
  { name: 'Classic', icon: <Plus size={20} />, description: 'Traditional crosshair' },
  { name: 'Dot', icon: <Circle size={20} />, description: 'Simple dot' },
  { name: 'Circle', icon: <Circle size={20} />, description: 'Circular crosshair' },
  { name: 'Square', icon: <Square size={20} />, description: 'Square crosshair' },
  { name: 'TShape', icon: <Minus size={20} />, description: 'T-shaped crosshair' },
  { name: 'Custom', icon: <Star size={20} />, description: 'Custom design' },
];

const PRESET_COLORS = [
  { name: "Green", value: 0x00ff00 },
  { name: "Red", value: 0xff0000 },
  { name: "Yellow", value: 0xffff00 },
  { name: "Cyan", value: 0x00ffff },
  { name: "White", value: 0xffffff },
  { name: "Magenta", value: 0xff00ff },
  { name: "Orange", value: 0xffa500 },
  { name: "Pink", value: 0xff69b4 },
];

export function CrosshairDesigner({ config, onConfigChange }: CrosshairDesignerProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'color' | 'position' | 'advanced'>('style');
  const [isDrawingCustom, setIsDrawingCustom] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  const updateConfig = (updates: Partial<CrosshairConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const colorToHex = (color: number): string => {
    return "#" + color.toString(16).padStart(6, "0");
  };

  const hexToColor = (hex: string): number => {
    return parseInt(hex.substring(1), 16);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (config.style !== 'Custom' || !isDrawingCustom) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) - 150); // Center is at 150,150
    const y = Math.round((e.clientY - rect.top) - 150);

    if (!drawStart) {
      setDrawStart({ x, y });
    } else {
      const newLine: CrosshairLine = {
        start_x: drawStart.x,
        start_y: drawStart.y,
        end_x: x,
        end_y: y,
        thickness: config.thickness,
        color: config.color,
      };
      const newLines = [...config.lines, newLine];
      updateConfig({ lines: newLines });
      setDrawStart(null);
    }
  };

  const clearCustomLines = () => {
    updateConfig({ lines: [] });
    setDrawStart(null);
  };

  return (
    <div className="designer-container">
      <div className="designer-tabs">
        <button 
          className={`tab ${activeTab === 'style' ? 'active' : ''}`}
          onClick={() => setActiveTab('style')}
        >
          <Crosshair size={16} />
          Style
        </button>
        <button 
          className={`tab ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          <Palette size={16} />
          Colors
        </button>
        <button 
          className={`tab ${activeTab === 'position' ? 'active' : ''}`}
          onClick={() => setActiveTab('position')}
        >
          <Move size={16} />
          Position
        </button>
        <button 
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <RotateCw size={16} />
          Advanced
        </button>
      </div>

      <div className="designer-content">
        {activeTab === 'style' && (
          <div className="style-panel">
            <h3>Crosshair Style</h3>
            <div className="style-grid">
              {PRESET_STYLES.map((style) => (
                <button
                  key={style.name}
                  className={`style-card ${config.style === style.name ? 'active' : ''}`}
                  onClick={() => updateConfig({ style: style.name })}
                >
                  {style.icon}
                  <span>{style.name}</span>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>

            <div className="controls-section">
              <h4>Basic Settings</h4>
              
              <div className="control-group">
                <label>Size</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={config.size}
                  onChange={(e) => updateConfig({ size: parseInt(e.target.value) })}
                />
                <span className="value">{config.size}</span>
              </div>

              <div className="control-group">
                <label>Thickness</label>
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
                  max="30"
                  value={config.gap}
                  onChange={(e) => updateConfig({ gap: parseInt(e.target.value) })}
                />
                <span className="value">{config.gap}</span>
              </div>

              {config.style === 'TShape' && (
                <div className="control-group">
                  <label>T-Bar Length</label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={config.t_length}
                    onChange={(e) => updateConfig({ t_length: parseInt(e.target.value) })}
                  />
                  <span className="value">{config.t_length}</span>
                </div>
              )}

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
            </div>

            {config.style === 'Custom' && (
              <div className="custom-designer">
                <h4>Custom Shape Designer</h4>
                <canvas
                  width={300}
                  height={300}
                  className="custom-canvas"
                  onClick={handleCanvasClick}
                  style={{ cursor: isDrawingCustom ? 'crosshair' : 'default' }}
                />
                <div className="custom-controls">
                  <button 
                    className={`btn ${isDrawingCustom ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => setIsDrawingCustom(!isDrawingCustom)}
                  >
                    {isDrawingCustom ? 'Stop Drawing' : 'Start Drawing'}
                  </button>
                  <button className="btn btn-secondary" onClick={clearCustomLines}>
                    Clear All
                  </button>
                </div>
                {drawStart && (
                  <p className="hint">Click to set end point</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'color' && (
          <div className="color-panel">
            <h3>Color Settings</h3>
            
            <div className="color-section">
              <h4>Main Color</h4>
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
              <div className="control-group">
                <label>Custom Color</label>
                <input
                  type="color"
                  value={colorToHex(config.color)}
                  onChange={(e) => updateConfig({ color: hexToColor(e.target.value) })}
                  className="color-picker"
                />
              </div>
            </div>

            <div className="color-section">
              <h4>Outline</h4>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.show_outline}
                    onChange={(e) => updateConfig({ show_outline: e.target.checked })}
                  />
                  Enable Outline
                </label>
              </div>

              {config.show_outline && (
                <>
                  <div className="control-group">
                    <label>Outline Color</label>
                    <input
                      type="color"
                      value={colorToHex(config.outline_color)}
                      onChange={(e) => updateConfig({ outline_color: hexToColor(e.target.value) })}
                      className="color-picker"
                    />
                  </div>
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
                </>
              )}
            </div>

            <div className="color-section">
              <h4>Shadow</h4>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.shadow_enabled}
                    onChange={(e) => updateConfig({ shadow_enabled: e.target.checked })}
                  />
                  Enable Shadow
                </label>
              </div>

              {config.shadow_enabled && (
                <>
                  <div className="control-group">
                    <label>Shadow Color</label>
                    <input
                      type="color"
                      value={colorToHex(config.shadow_color)}
                      onChange={(e) => updateConfig({ shadow_color: hexToColor(e.target.value) })}
                      className="color-picker"
                    />
                  </div>
                  <div className="control-group">
                    <label>Shadow Offset</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={config.shadow_offset}
                      onChange={(e) => updateConfig({ shadow_offset: parseInt(e.target.value) })}
                    />
                    <span className="value">{config.shadow_offset}</span>
                  </div>
                </>
              )}
            </div>

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
        )}

        {activeTab === 'position' && (
          <div className="position-panel">
            <h3>Position & Alignment</h3>
            
            <div className="position-grid">
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: -50, position_y: -50 })}
              >↖</button>
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: 0, position_y: -50 })}
              >↑</button>
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: 50, position_y: -50 })}
              >↗</button>
              
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: -50, position_y: 0 })}
              >←</button>
              <button 
                className="position-btn center"
                onClick={() => updateConfig({ position_x: 0, position_y: 0 })}
              >●</button>
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: 50, position_y: 0 })}
              >→</button>
              
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: -50, position_y: 50 })}
              >↙</button>
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: 0, position_y: 50 })}
              >↓</button>
              <button 
                className="position-btn"
                onClick={() => updateConfig({ position_x: 50, position_y: 50 })}
              >↘</button>
            </div>

            <div className="control-group">
              <label>Horizontal Offset</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={config.position_x}
                onChange={(e) => updateConfig({ position_x: parseInt(e.target.value) })}
              />
              <span className="value">{config.position_x}px</span>
            </div>

            <div className="control-group">
              <label>Vertical Offset</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={config.position_y}
                onChange={(e) => updateConfig({ position_y: parseInt(e.target.value) })}
              />
              <span className="value">{config.position_y}px</span>
            </div>

            <button 
              className="btn btn-secondary"
              onClick={() => updateConfig({ position_x: 0, position_y: 0 })}
            >
              Reset to Center
            </button>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="advanced-panel">
            <h3>Advanced Settings</h3>
            
            <div className="control-group">
              <label>
                <RotateCw size={16} />
                Rotation
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={config.rotation}
                onChange={(e) => updateConfig({ rotation: parseInt(e.target.value) })}
              />
              <span className="value">{config.rotation}°</span>
            </div>

            <div className="rotation-presets">
              <button 
                className="btn btn-small"
                onClick={() => updateConfig({ rotation: 0 })}
              >0°</button>
              <button 
                className="btn btn-small"
                onClick={() => updateConfig({ rotation: 45 })}
              >45°</button>
              <button 
                className="btn btn-small"
                onClick={() => updateConfig({ rotation: 90 })}
              >90°</button>
              <button 
                className="btn btn-small"
                onClick={() => updateConfig({ rotation: 180 })}
              >180°</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}