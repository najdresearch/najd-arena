export function PublicationDate({value}:{value?:string|null}){
 if (!value) return null;
 return <span className="publication-date">Published <time dateTime={value}>{new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Riyadh"}).format(new Date(value))}</time></span>;
}
