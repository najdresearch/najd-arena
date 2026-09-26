"use client";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { effortLevels } from "@/lib/model-catalog";
function subscribe(listener:()=>void) {
 window.addEventListener("popstate",listener);
 window.addEventListener("najd-comparison",listener);
 return ()=>{window.removeEventListener("popstate",listener);window.removeEventListener("najd-comparison",listener);};
}
export function useComparison(){
 const path=usePathname();
 const query=useSyncExternalStore(subscribe,()=>window.location.search,()=>"");
 const params=new URLSearchParams(query);
 const prompt=path.startsWith("/models")?"raw":path==="/coding-agents"?"pi":params.get("execution")==="pi"?"pi":"raw";
 const requested=params.get("thinking")??"default";
 const level=effortLevels.includes(requested)?requested:"default";
 function update(key:string,value:string){
  const url=new URL(window.location.href);url.searchParams.set(key,value);
  window.history.pushState(null,"",url);window.dispatchEvent(new Event("najd-comparison"));
 }
 return {prompt,level,setPrompt:(v:string)=>update("execution",v),setLevel:(v:string)=>update("thinking",v),query:{execution:prompt,thinking:level}};
}
