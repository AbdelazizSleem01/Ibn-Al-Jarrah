import React from "react";
import * as FaIcons from "react-icons/fa";
import * as GiIcons from "react-icons/gi";
import * as BiIcons from "react-icons/bi";

interface IconRendererProps {
  name?: string;
  className?: string;
}

export default function IconRenderer({ name, className = "w-5 h-5" }: IconRendererProps) {
  if (!name) return <FaIcons.FaBook className={className} />;

  // Search in FontAwesome
  if (name.startsWith("Fa") && (FaIcons as any)[name]) {
    const IconComponent = (FaIcons as any)[name];
    return <IconComponent className={className} />;
  }

  // Search in GameIcons
  if (name.startsWith("Gi") && (GiIcons as any)[name]) {
    const IconComponent = (GiIcons as any)[name];
    return <IconComponent className={className} />;
  }

  // Search in BoxIcons
  if (name.startsWith("Bi") && (BiIcons as any)[name]) {
    const IconComponent = (BiIcons as any)[name];
    return <IconComponent className={className} />;
  }

  // Fallback icon
  return <FaIcons.FaBook className={className} />;
}
export type IconNameType = keyof typeof FaIcons | keyof typeof GiIcons | keyof typeof BiIcons;
