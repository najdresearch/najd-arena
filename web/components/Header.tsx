"use client";
import { useState } from "react";
import { useComparison } from "./useComparison";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "./UiIcon";

const sections = [["/models", "Models"], ["/coding-agents", "Coding Agents"], ["/image", "Image"], ["/speech", "Speech"], ["/inference", "Inference"], ["/leaderboard", "Leaderboards"], ["/about", "About"]];
export function Header() {
  const path = usePathname();
  const { query } = useComparison();
  const [open, setOpen] = useState(false);
  return <header className="analysis-header" onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); event.currentTarget.querySelector<HTMLButtonElement>(".mobile-menu-toggle")?.focus(); }
  }}><div className="analysis-header-inner">
    <Link href="/" className="analysis-brand" aria-label="Najd Arena home" onClick={() => setOpen(false)}>najd<span>arena</span><i /></Link>
    <button className="mobile-menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>{open ? "Close" : "Menu"}
    </button>
    <nav id="primary-navigation" aria-label="Primary" data-open={open}>
      {sections.map(([href, label]) => <Link href={{ pathname: href, query: { ...query, execution: href === "/models" ? "raw" : href === "/coding-agents" ? "pi" : query.execution } }} key={href} onClick={() => setOpen(false)} aria-current={path === href || (href === "/models" && path.startsWith("/models/")) ? "page" : undefined}>{label}{["/image","/speech"].includes(href)&&<small className="nav-status">In development</small>}</Link>)}
      <Link className="mobile-submit" href="/request-evaluation" onClick={() => setOpen(false)}>Request evaluation<UiIcon name="arrow" /></Link>
    </nav>
    <Link href="/request-evaluation" className="analysis-submit">Request evaluation<UiIcon name="arrow" /></Link>
  </div></header>;
}
