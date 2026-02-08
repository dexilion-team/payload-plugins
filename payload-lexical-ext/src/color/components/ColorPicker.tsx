"use client";

import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Color } from "../types";
import "./ColorPicker.css";

type ColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
  colors?: Color[];
};

export default function ColorPicker({
  color,
  onChange,
  colors,
}: ColorPickerProps): React.JSX.Element {
  const [customColor, setCustomColor] = useState<string>(color || "#000000");
  const stopDropdownClose = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleColorChange = (newColor: string) => {
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
      setCustomColor(value);
      if (value.length === 7) {
        onChange(value);
      }
    }
  };

  const handlePaletteClick = (paletteColor: string) => {
    setCustomColor(paletteColor);
    onChange(paletteColor);
  };

  const handleReset = () => {
    setCustomColor("#FFFFFF");
    onChange("");
  };

  if (!colors || colors.length === 0) {
    return (
      <div
        className="color-picker-wrapper"
        onClick={stopDropdownClose}
        onMouseDown={stopDropdownClose}
        onPointerDown={stopDropdownClose}
      >
        <div className="color-input">
          <input
            type="text"
            value={customColor}
            onChange={handleInputChange}
            placeholder="#000000"
            maxLength={7}
          />
        </div>
        <HexColorPicker color={customColor} onChange={handleColorChange} />
        <button onClick={handleReset} className="reset-button">
          Reset
        </button>
      </div>
    );
  }

  const paletteColors = colors.filter((c) => c.type === "palette");
  const customColors = colors.filter((c) => c.type === "button");

  return (
    <div
      className="color-picker-wrapper"
      onClick={stopDropdownClose}
      onMouseDown={stopDropdownClose}
      onPointerDown={stopDropdownClose}
    >
      {customColors.length > 0 && (
        <div className="basic-colors">
          {customColors.map((c, index) => (
            <button
              key={index}
              type="button"
              className="color-swatch"
              style={{ backgroundColor: c.color }}
              onClick={() => handlePaletteClick(c.color)}
              title={c.label || c.color}
            />
          ))}
        </div>
      )}

      {paletteColors.length > 0 && customColors.length > 0 && (
        <div className="color-divider" />
      )}

      {paletteColors.length > 0 && (
        <div className="palette-colors">
          {paletteColors.map((c, index) => (
            <button
              key={index}
              type="button"
              className="color-swatch"
              style={{ backgroundColor: c.color }}
              onClick={() => handlePaletteClick(c.color)}
              title={c.label || c.color}
            />
          ))}
        </div>
      )}

      <div className="color-divider" />

      <div className="color-input">
        <input
          type="text"
          value={customColor}
          onChange={handleInputChange}
          placeholder="#000000"
          maxLength={7}
        />
      </div>
      <HexColorPicker color={customColor} onChange={handleColorChange} />

      <div className="color-divider" />

      <button onClick={handleReset} className="reset-button">
        Reset
      </button>
    </div>
  );
}
