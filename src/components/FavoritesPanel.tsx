import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Star,
  Save,
  Trash2,
  Download,
  Upload,
  Copy,
  Edit,
  Check
} from "lucide-react";
import { CrosshairConfig } from "./CrosshairDesigner";

interface CrosshairPreset {
  id: string;
  name: string;
  config: CrosshairConfig;
  created_at: string;
}

interface FavoritesPanelProps {
  currentConfig: CrosshairConfig;
  onLoadPreset: (config: CrosshairConfig) => void;
}

export function FavoritesPanel({ currentConfig, onLoadPreset }: FavoritesPanelProps) {
  const [presets, setPresets] = useState<CrosshairPreset[]>([]);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const loadedPresets = await invoke<CrosshairPreset[]>("load_presets");
      setPresets(loadedPresets);
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) return;

    const preset: CrosshairPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      config: currentConfig,
      created_at: new Date().toISOString(),
    };

    try {
      await invoke("save_preset", { preset });
      await loadPresets();
      setNewPresetName("");
      setIsAddingPreset(false);
    } catch (error) {
      console.error("Failed to save preset:", error);
    }
  };

  const deletePreset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this preset?")) return;

    try {
      await invoke("delete_preset", { id });
      await loadPresets();
    } catch (error) {
      console.error("Failed to delete preset:", error);
    }
  };

  const updatePresetName = async (preset: CrosshairPreset, newName: string) => {
    const updatedPreset = { ...preset, name: newName };
    try {
      await invoke("save_preset", { preset: updatedPreset });
      await loadPresets();
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      console.error("Failed to update preset:", error);
    }
  };

  const duplicatePreset = async (preset: CrosshairPreset) => {
    const newPreset: CrosshairPreset = {
      ...preset,
      id: Date.now().toString(),
      name: `${preset.name} (Copy)`,
      created_at: new Date().toISOString(),
    };

    try {
      await invoke("save_preset", { preset: newPreset });
      await loadPresets();
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to duplicate preset:", error);
    }
  };

  const exportPresets = () => {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `crosshair-presets-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as CrosshairPreset[];
        for (const preset of imported) {
          preset.id = Date.now().toString() + Math.random();
          await invoke("save_preset", { preset });
        }
        await loadPresets();
      } catch (error) {
        console.error("Failed to import presets:", error);
        alert("Failed to import presets. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="favorites-panel">
      <div className="favorites-header">
        <h3>
          <Star size={20} />
          Saved Presets
        </h3>
        <div className="favorites-actions">
          <button 
            className="btn btn-icon"
            onClick={() => setIsAddingPreset(true)}
            title="Save current as preset"
          >
            <Save size={16} />
          </button>
          <button 
            className="btn btn-icon"
            onClick={exportPresets}
            disabled={presets.length === 0}
            title="Export all presets"
          >
            <Download size={16} />
          </button>
          <label className="btn btn-icon" title="Import presets">
            <Upload size={16} />
            <input 
              type="file" 
              accept=".json"
              onChange={importPresets}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {isAddingPreset && (
        <div className="add-preset-form">
          <input
            type="text"
            placeholder="Enter preset name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && savePreset()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={savePreset}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={() => {
            setIsAddingPreset(false);
            setNewPresetName("");
          }}>
            Cancel
          </button>
        </div>
      )}

      <div className="presets-list">
        {presets.length === 0 ? (
          <div className="empty-state">
            <Star size={40} />
            <p>No saved presets yet</p>
            <small>Save your current configuration to create a preset</small>
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="preset-item">
              <div className="preset-preview">
                <CrosshairMiniPreview config={preset.config} />
              </div>
              <div className="preset-info">
                {editingId === preset.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updatePresetName(preset, editingName);
                      }
                    }}
                    onBlur={() => {
                      setEditingId(null);
                      setEditingName("");
                    }}
                    autoFocus
                  />
                ) : (
                  <h4>{preset.name}</h4>
                )}
                <small>{formatDate(preset.created_at)}</small>
              </div>
              <div className="preset-actions">
                <button 
                  className="btn btn-icon"
                  onClick={() => onLoadPreset(preset.config)}
                  title="Load preset"
                >
                  <Download size={14} />
                </button>
                <button 
                  className="btn btn-icon"
                  onClick={() => {
                    setEditingId(preset.id);
                    setEditingName(preset.name);
                  }}
                  title="Rename"
                >
                  <Edit size={14} />
                </button>
                <button 
                  className="btn btn-icon"
                  onClick={() => duplicatePreset(preset)}
                  title="Duplicate"
                >
                  {copiedId === preset.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button 
                  className="btn btn-icon btn-danger"
                  onClick={() => deletePreset(preset.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CrosshairMiniPreview({ config }: { config: CrosshairConfig }) {
  const colorHex = "#" + config.color.toString(16).padStart(6, "0");
  const outlineColorHex = "#" + config.outline_color.toString(16).padStart(6, "0");
  
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" className="mini-preview">
      {config.show_outline && (
        <>
          <line
            x1="25"
            y1={25 - config.gap/2 - config.size/2}
            x2="25"
            y2={25 - config.gap/2}
            stroke={outlineColorHex}
            strokeWidth={(config.thickness + config.outline_thickness * 2) / 2}
            opacity={config.opacity}
          />
          <line
            x1="25"
            y1={25 + config.gap/2}
            x2="25"
            y2={25 + config.gap/2 + config.size/2}
            stroke={outlineColorHex}
            strokeWidth={(config.thickness + config.outline_thickness * 2) / 2}
            opacity={config.opacity}
          />
          <line
            x1={25 - config.gap/2 - config.size/2}
            y1="25"
            x2={25 - config.gap/2}
            y2="25"
            stroke={outlineColorHex}
            strokeWidth={(config.thickness + config.outline_thickness * 2) / 2}
            opacity={config.opacity}
          />
          <line
            x1={25 + config.gap/2}
            y1="25"
            x2={25 + config.gap/2 + config.size/2}
            y2="25"
            stroke={outlineColorHex}
            strokeWidth={(config.thickness + config.outline_thickness * 2) / 2}
            opacity={config.opacity}
          />
        </>
      )}
      
      <line
        x1="25"
        y1={25 - config.gap/2 - config.size/2}
        x2="25"
        y2={25 - config.gap/2}
        stroke={colorHex}
        strokeWidth={config.thickness / 2}
        opacity={config.opacity}
      />
      <line
        x1="25"
        y1={25 + config.gap/2}
        x2="25"
        y2={25 + config.gap/2 + config.size/2}
        stroke={colorHex}
        strokeWidth={config.thickness / 2}
        opacity={config.opacity}
      />
      <line
        x1={25 - config.gap/2 - config.size/2}
        y1="25"
        x2={25 - config.gap/2}
        y2="25"
        stroke={colorHex}
        strokeWidth={config.thickness / 2}
        opacity={config.opacity}
      />
      <line
        x1={25 + config.gap/2}
        y1="25"
        x2={25 + config.gap/2 + config.size/2}
        y2="25"
        stroke={colorHex}
        strokeWidth={config.thickness / 2}
        opacity={config.opacity}
      />
      
      {config.show_dot && (
        <circle
          cx="25"
          cy="25"
          r={config.dot_size / 2}
          fill={colorHex}
          opacity={config.opacity}
        />
      )}
    </svg>
  );
}