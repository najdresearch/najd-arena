import {authorizedRun} from "@/lib/run-access";
import {pool} from "@/lib/db";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const access=await authorizedRun(id,true);
 if(!access||access.run.role!=="admin")return Response.json({error:"Organization administrator access required."},{status:403});
 const result=await pool.query(`UPDATE runs SET publication_requested_at=now(),publication_requested_by=$2 WHERE id=$1 AND status='awaiting_review' RETURNING id`,[id,access.user.id]);
 if(!result.rowCount)return Response.json({error:"Only completed runs awaiting review can be submitted."},{status:409});
 await pool.query(`INSERT INTO audit_events(actor_id,run_id,action) VALUES($1,$2,'run.publication_requested')`,[access.user.id,id]);
 return Response.json({id,publication:"requested"});
}
