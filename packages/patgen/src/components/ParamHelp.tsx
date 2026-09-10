import { useState, type ReactNode } from "react";

type ParamHelpProps = {
  description: string;
  children: ReactNode;
};

export function ParamHelp({ description, children }: ParamHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="param-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="param-help-trigger" aria-label="Parameter info">
        {children}
      </span>
      {open ? <span className="param-help-popup" role="tooltip">{description}</span> : null}
    </span>
  );
}
