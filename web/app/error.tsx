"use client";
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="shell category-page"><div className="eyebrow">Unable to load</div><h1>Results are temporarily unavailable.</h1><p className="lede">Please try loading this page again.</p><button className="button" onClick={reset}>Try again</button></main>;}
