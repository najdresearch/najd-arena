import {authorizedRun} from "@/lib/run-access";
import {pool} from "@/lib/db";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const access=await authorizedRun(id,true);
 if(!access||access.run.role!=="admin")return Response.json({error:"Organization administrator approval is required."},{status:403});
 const client=await pool.connect();
 try {
  await client.query("BEGIN");
  const result=await client.query(`UPDATE runs SET publication_requested_at=COALESCE(publication_requested_at,now()),publication_requested_by=COALESCE(publication_requested_by,$2)
   WHERE id=$1 AND status='awaiting_review' AND completed_cases=total_cases AND coverage=1
   AND EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=runs.organization_id AND m.user_id=$2 AND m.role='admin') RETURNING id`,[id,access.user.id]);
  if(!result.rowCount){await client.query("ROLLBACK");return Response.json({error:"Only complete evaluations may be approved for publication."},{status:409});}
  await client.query(`INSERT INTO audit_events(actor_id,run_id,action) VALUES($1,$2,'run.organization_approved_publication')`,[access.user.id,id]);
  await client.query("COMMIT");
  return Response.json({id,publication:"organization_approved",status:"awaiting_najd_approval"});
 }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
