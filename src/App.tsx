import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  Target, 
  Power, 
  Save, 
  RotateCcw,
  Palette,
  Star,
  Eye,
  Heart,
  ArrowLeft,
  Grid
} from "lucide-react";
import { CrosshairDesigner } from "./components/CrosshairDesigner";
import { FavoritesPanel } from "./components/FavoritesPanel";
import { CrosshairPreview } from "./components/CrosshairPreview";
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
  style: 'Classic' | 'Dot' | 'Circle' | 'Square' | 'TShape' | 'Custom';
  position_x: number;
  position_y: number;
  rotation: number;
  t_length: number;
  shadow_enabled: boolean;
  shadow_color: number;
  shadow_offset: number;
  lines: Array<{
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    thickness: number;
    color: number;
  }>;
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
  style: 'Classic',
  position_x: 0,
  position_y: 0,
  rotation: 0,
  t_length: 15,
  shadow_enabled: false,
  shadow_color: 0x000000,
  shadow_offset: 2,
  lines: [],
};


const STARTER_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional crosshair with four lines',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'Classic' as const,
      size: 8,
      thickness: 2,
      gap: 4,
      show_dot: false,
      show_outline: false,
      color: 0x00ff00
    }
  },
  {
    id: 'dot',
    name: 'Dot',
    description: 'Simple center dot only',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'Dot' as const,
      size: 0,
      thickness: 0,
      gap: 0,
      show_dot: true,
      dot_size: 3,
      show_outline: false,
      color: 0xff0000
    }
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'Circular crosshair outline',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'Circle' as const,
      size: 12,
      thickness: 2,
      gap: 3,
      show_dot: true,
      dot_size: 2,
      show_outline: false,
      color: 0x00ffff
    }
  },
  {
    id: 'square',
    name: 'Square',
    description: 'Square outline crosshair',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'Square' as const,
      size: 10,
      thickness: 2,
      gap: 2,
      show_dot: false,
      show_outline: false,
      color: 0xffff00
    }
  },
  {
    id: 'tshape',
    name: 'T-Shape',
    description: 'T-shaped crosshair design',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'TShape' as const,
      size: 8,
      thickness: 2,
      gap: 4,
      t_length: 12,
      show_dot: false,
      show_outline: false,
      color: 0xff8800
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design',
    config: { 
      ...DEFAULT_CONFIG,
      style: 'Classic' as const,
      size: 6,
      thickness: 1,
      gap: 2,
      show_dot: true,
      dot_size: 1,
      show_outline: false,
      color: 0xffffff
    }
  }
];

type AppView = 'starters' | 'designer';

function App() {
  const [config, setConfig] = useState<CrosshairConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('starters');
  const [favorites, setFavorites] = useState<CrosshairConfig[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isCurrentFavorited, setIsCurrentFavorited] = useState(false);

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

  // Check if current config is favorited
  useEffect(() => {
    const configString = JSON.stringify(config);
    const isFavorited = favorites.some(fav => JSON.stringify(fav) === configString);
    setIsCurrentFavorited(isFavorited);
  }, [config, favorites]);

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

  const selectStarter = async (template: typeof STARTER_TEMPLATES[0]) => {
    await updateConfig(template.config);
    setActiveView('designer');
  };

  const addToFavorites = () => {
    const configString = JSON.stringify(config);
    const existingIndex = favorites.findIndex(fav => JSON.stringify(fav) === configString);
    
    if (existingIndex === -1) {
      // Add to favorites
      const newFavorites = [...favorites, { ...config }];
      setFavorites(newFavorites);
      localStorage.setItem('crosshair_favorites', JSON.stringify(newFavorites));
      setIsCurrentFavorited(true);
    } else {
      // Remove from favorites
      const newFavorites = favorites.filter((_, index) => index !== existingIndex);
      setFavorites(newFavorites);
      localStorage.setItem('crosshair_favorites', JSON.stringify(newFavorites));
      setIsCurrentFavorited(false);
    }
  };

  const loadFromFavorites = (favoriteConfig: CrosshairConfig) => {
    updateConfig(favoriteConfig);
    setShowFavorites(false);
  };

  const toggleCrosshair = async () => {
    const newEnabled = !config.enabled;
    await updateConfig({ enabled: newEnabled });
    await invoke("toggle_crosshair", { enabled: newEnabled });
  };

  useEffect(() => {
    const savedFavorites = localStorage.getItem('crosshair_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);


  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="title-section">
            <Target className="logo" size={24} />
            <h1>Crosshair</h1>
          </div>
        </div>

        <div className="header-center">
          {activeView === 'designer' && (
            <div className="template-actions">
              <button 
                className="templates-btn"
                onClick={() => setActiveView('starters')}
              >
                <Grid size={16} />
                Templates
              </button>
              <button 
                className="favorites-btn"
                onClick={() => setShowFavorites(!showFavorites)}
              >
                <Star size={16} />
                Favorites ({favorites.length})
              </button>
            </div>
          )}
        </div>

        <div className="header-right">
          {activeView === 'designer' && (
            <button 
              className={`favorite-btn ${isCurrentFavorited ? 'favorited' : ''}`}
              onClick={addToFavorites}
              title={isCurrentFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={18} fill={isCurrentFavorited ? "currentColor" : "none"} />
            </button>
          )}
          <button 
            className={`toggle-btn ${config.enabled ? "enabled" : ""}`}
            onClick={toggleCrosshair}
          >
            <Power size={16} />
            {config.enabled ? "ON" : "OFF"}
          </button>
          <button 
            className="save-btn" 
            onClick={saveConfig} 
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="content">
        {activeView === 'starters' && (
          <div className="starters-view">
            <div className="starters-header">
              <h2>Choose a Template</h2>
              <p>Select a crosshair style to begin customizing</p>
            </div>
            <div className="starters-grid">
              {STARTER_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="starter-card"
                  onClick={() => selectStarter(template)}
                >
                  <div className="starter-preview">
                    <CrosshairPreview config={template.config} size={60} />
                  </div>
                  <div className="starter-info">
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeView === 'designer' && (
          <div className="designer-layout">
            {/* Favorites Panel */}
            {showFavorites && (
              <div className="favorites-panel">
                <div className="favorites-header">
                  <h3>Favorites</h3>
                  <button 
                    className="close-btn"
                    onClick={() => setShowFavorites(false)}
                  >
                    ×
                  </button>
                </div>
                {favorites.length === 0 ? (
                  <div className="empty-favorites">
                    <Heart size={32} />
                    <p>No favorites yet</p>
                  </div>
                ) : (
                  <div className="favorites-list">
                    {favorites.map((favorite, index) => (
                      <button
                        key={index}
                        className="favorite-item"
                        onClick={() => loadFromFavorites(favorite)}
                      >
                        <div className="favorite-preview-small">
                          <CrosshairPreview config={favorite} size={40} />
                        </div>
                        <div className="favorite-details">
                          <span className="favorite-name">{favorite.style}</span>
                          <span className="favorite-specs">
                            {favorite.size}px • {(favorite.opacity * 100).toFixed(0)}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Designer */}
            <div className="designer-main">
              <div className="controls-section">
                <CrosshairDesigner 
                  config={config} 
                  onConfigChange={updateConfig}
                />
              </div>
              <div className="preview-section">
                <div className="preview-box">
                  <CrosshairPreview config={config} size={200} />
                </div>
                <div className="config-summary">
                  <div className="summary-row">
                    <span>Style:</span>
                    <span>{config.style}</span>
                  </div>
                  <div className="summary-row">
                    <span>Size:</span>
                    <span>{config.size}px</span>
                  </div>
                  <div className="summary-row">
                    <span>Opacity:</span>
                    <span>{(config.opacity * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


export default App;