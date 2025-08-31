import { useEffect, useRef } from "react";
import { CrosshairConfig } from "./CrosshairDesigner";

interface CrosshairPreviewProps {
  config: CrosshairConfig;
  size?: number;
  showBackground?: boolean;
}

export function CrosshairPreview({ config, size = 400, showBackground = true }: CrosshairPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background if enabled
    if (showBackground) {
      // Draw game-like background
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, 'rgba(100, 100, 100, 0.1)');
      gradient.addColorStop(1, 'rgba(50, 50, 50, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
    }

    const centerX = size / 2 + config.position_x;
    const centerY = size / 2 + config.position_y;

    // Convert colors
    const mainColor = `#${config.color.toString(16).padStart(6, '0')}`;
    const outlineColor = `#${config.outline_color.toString(16).padStart(6, '0')}`;
    const shadowColor = `#${config.shadow_color.toString(16).padStart(6, '0')}`;

    ctx.save();
    ctx.globalAlpha = config.opacity;

    // Apply rotation
    if (config.rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((config.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw shadow if enabled
    if (config.shadow_enabled) {
      ctx.strokeStyle = shadowColor;
      ctx.fillStyle = shadowColor;
      drawCrosshairShape(ctx, centerX + config.shadow_offset, centerY + config.shadow_offset, config);
    }

    // Draw outline if enabled
    if (config.show_outline) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = config.thickness + config.outline_thickness * 2;
      drawCrosshairShape(ctx, centerX, centerY, config);
    }

    // Draw main crosshair
    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineWidth = config.thickness;
    drawCrosshairShape(ctx, centerX, centerY, config);

    // Draw center dot if enabled
    if (config.show_dot) {
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, config.dot_size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [config, size, showBackground]);

  const drawCrosshairShape = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    switch (config.style) {
      case 'Classic':
        drawClassicCrosshair(ctx, x, y, config);
        break;
      case 'Circle':
        drawCircleCrosshair(ctx, x, y, config);
        break;
      case 'Square':
        drawSquareCrosshair(ctx, x, y, config);
        break;
      case 'TShape':
        drawTCrosshair(ctx, x, y, config);
        break;
      case 'Custom':
        drawCustomCrosshair(ctx, x, y, config);
        break;
      case 'Dot':
        // Dot is handled separately
        break;
    }
  };

  const drawClassicCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    // Top line
    ctx.beginPath();
    ctx.moveTo(x, y - config.gap - config.size);
    ctx.lineTo(x, y - config.gap);
    ctx.stroke();

    // Bottom line
    ctx.beginPath();
    ctx.moveTo(x, y + config.gap);
    ctx.lineTo(x, y + config.gap + config.size);
    ctx.stroke();

    // Left line
    ctx.beginPath();
    ctx.moveTo(x - config.gap - config.size, y);
    ctx.lineTo(x - config.gap, y);
    ctx.stroke();

    // Right line
    ctx.beginPath();
    ctx.moveTo(x + config.gap, y);
    ctx.lineTo(x + config.gap + config.size, y);
    ctx.stroke();
  };

  const drawCircleCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    const radius = config.size + config.gap;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (config.gap > 0) {
      drawClassicCrosshair(ctx, x, y, config);
    }
  };

  const drawSquareCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    const halfSize = config.size + config.gap;
    ctx.beginPath();
    ctx.rect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
    ctx.stroke();

    if (config.gap > 0) {
      drawClassicCrosshair(ctx, x, y, config);
    }
  };

  const drawTCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    // Horizontal top bar
    ctx.beginPath();
    ctx.moveTo(x - config.t_length, y - config.gap - config.size);
    ctx.lineTo(x + config.t_length, y - config.gap - config.size);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - config.gap - config.size);
    ctx.lineTo(x, y - config.gap);
    ctx.stroke();

    if (config.gap > 0) {
      // Bottom line
      ctx.beginPath();
      ctx.moveTo(x, y + config.gap);
      ctx.lineTo(x, y + config.gap + config.size);
      ctx.stroke();

      // Left line
      ctx.beginPath();
      ctx.moveTo(x - config.gap - config.size, y);
      ctx.lineTo(x - config.gap, y);
      ctx.stroke();

      // Right line
      ctx.beginPath();
      ctx.moveTo(x + config.gap, y);
      ctx.lineTo(x + config.gap + config.size, y);
      ctx.stroke();
    }
  };

  const drawCustomCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number, config: CrosshairConfig) => {
    for (const line of config.lines) {
      ctx.beginPath();
      ctx.moveTo(x + line.start_x, y + line.start_y);
      ctx.lineTo(x + line.end_x, y + line.end_y);
      ctx.stroke();
    }
  };

  return (
    <div className="crosshair-preview-container">
      <canvas 
        ref={canvasRef}
        width={size}
        height={size}
        className="crosshair-preview-canvas"
      />
      {showBackground && (
        <div className="preview-info">
          <small>Style: {config.style}</small>
          {config.position_x !== 0 || config.position_y !== 0 ? (
            <small>Offset: {config.position_x}, {config.position_y}</small>
          ) : null}
          {config.rotation !== 0 ? (
            <small>Rotation: {config.rotation}°</small>
          ) : null}
        </div>
      )}
    </div>
  );
}