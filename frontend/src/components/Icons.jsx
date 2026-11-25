// Small inline icon set (stroke icons, 24x24, inherit currentColor).
const base = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true,
};

export const Logo = (p) => (
  <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <circle cx="16" cy="16" r="16" fill="var(--accent)" />
    <path d="M20.5 9a8 8 0 1 0 2.6 12.6A6.5 6.5 0 0 1 20.5 9z" fill="#fff" />
    <circle cx="22.5" cy="10.5" r="1.2" fill="#fff" opacity="0.8" />
  </svg>
);

export const Send = (p) => (<svg {...base} {...p}><path d="M5 12h13M12 5l7 7-7 7" /></svg>);
export const Stop = (p) => (<svg {...base} {...p}><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg>);
export const Wind = (p) => (<svg {...base} {...p}><path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" /></svg>);
export const Leaf = (p) => (<svg {...base} {...p}><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7" /></svg>);
export const Plus = (p) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const Heart = (p) => (<svg {...base} {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>);
export const Sun = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const Moon = (p) => (<svg {...base} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>);
export const Close = (p) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const Phone = (p) => (<svg {...base} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>);
export const Music = (p) => (<svg {...base} {...p}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></svg>);
export const Search = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
export const Lock = (p) => (<svg {...base} {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
