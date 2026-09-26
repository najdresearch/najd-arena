export function UiIcon({name}:{name:"arrow"|"download"|"chart"|"grid"|"plus"}) {
 const paths={arrow:"M7 17 17 7M7 7h10v10",download:"M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",chart:"M4 20V10m8 10V4m8 16v-7",grid:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",plus:"M12 5v14M5 12h14"};
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
