"use client";
import {useComparison} from "./useComparison";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {UiIcon} from "./UiIcon";
const sections = [["/models", "Models"], ["/coding-agents", "Coding Agents"], ["/image", "Image"], ["/speech", "Speech"], ["/inference", "Inference"], ["/leaderboard", "Leaderboards"], ["/about", "About"]];
export function Header() {
 const path=usePathname();
 const {query}=useComparison();
 return <header className="analysis-header"><div className="analysis-header-inner"><Link href="/" className="analysis-brand" aria-label="Najd Arena home">najd<span>arena</span><i/></Link><nav aria-label="Primary">{sections.map(([href,label])=><Link href={{pathname:href,query:{...query,execution:href==="/models"?"raw":href==="/coding-agents"?"pi":query.execution}}} key={href} aria-current={path===href||(href==='/models'&&path.startsWith('/models/'))?'page':undefined}>{label}</Link>)}</nav><Link href="/dashboard" className="analysis-submit">Submit model<UiIcon name="arrow"/></Link></div></header>;
}
