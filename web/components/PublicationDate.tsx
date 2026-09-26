export function PublicationDate({value}:{value?:string|null}){
 return <span className="publication-date">{value?<>Published <time dateTime={value}>{new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Riyadh"}).format(new Date(value))}</time></>:"Publication date not recorded"}</span>;
}
