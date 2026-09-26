import assert from 'node:assert/strict';
import {pool,publicEvaluation,type PublicEvaluation} from '../lib/db';
async function main(){
const client=await pool.connect();
const originalQuery=pool.query;
// Route the production reader through one rollback-only transaction.
pool.query=client.query.bind(client) as typeof pool.query;
try{
 await client.query('BEGIN');
 const baseline=await publicEvaluation();
 assert(baseline);assert.equal(baseline.configurations.length,28);
 assert.equal(baseline.configurations.reduce((n,r)=>n+r.total,0),170492);
 for(const r of baseline.configurations){const metric:PublicEvaluation["metrics"][number]=baseline.metrics.find(m=>m.config===r.name)!;assert.equal(Number(metric.correct)+Number(metric.possible_correct),r.acceptable);}
 const {rows:[release]}=await client.query("SELECT id FROM evaluation_releases WHERE visibility='public' ORDER BY created_at DESC LIMIT 1");
 await client.query("INSERT INTO model_catalog(id,slug,display_name,provider_name,visibility) VALUES('catalog-test','catalog-test','Catalog test','Test','private')");
 await client.query("INSERT INTO evaluation_results(id,release_id,model_id,execution,thinking,total,acceptable,technical,visibility) VALUES('catalog-test-result',$1,'catalog-test','raw','default',10,7,1,'private')",[release.id]);
 assert.equal((await publicEvaluation())!.catalog.length,baseline.catalog.length);
 await client.query("UPDATE model_catalog SET visibility='public' WHERE id='catalog-test'");
 assert.equal((await publicEvaluation())!.catalog.length,baseline.catalog.length);
 await client.query("UPDATE evaluation_results SET visibility='public' WHERE id='catalog-test-result'");
 const expanded=(await publicEvaluation())!;
 assert.equal(expanded.catalog.length,baseline.catalog.length+1);
 assert.equal(expanded.configurations.find(r=>r.model==='catalog-test')!.acceptable,7);
 await client.query("UPDATE model_catalog SET visibility='private' WHERE id='catalog-test'");
 assert.equal((await publicEvaluation())!.catalog.length,baseline.catalog.length);
 await client.query("UPDATE evaluation_releases SET visibility='private'");
 assert.equal(await publicEvaluation(),null);

 const {rows:[org]}=await client.query("INSERT INTO organizations(provider,provider_org_id,slug,name) VALUES('test','publication-test','publication-test','Publication test') RETURNING id");
 const {rows:[owner]}=await client.query("INSERT INTO users(name) VALUES('Test org approver') RETURNING id");
 const {rows:[admin]}=await client.query("INSERT INTO users(name) VALUES('Test Najd approver') RETURNING id");
 const {rows:[run]}=await client.query(`INSERT INTO runs(id,organization_id,created_by,status,model_display_name,model_id,endpoint_url,concurrency,rpm,tpm,dataset_version,dataset_revision,total_cases,completed_cases,coverage)
 VALUES(gen_random_uuid(),$1,$2,'awaiting_review','Test','test','https://example.com',1,1,1,'test','test',1,1,1) RETURNING id`,[org.id,owner.id]);
 async function rejectPublish(){
  await client.query('SAVEPOINT approval_check');
  await assert.rejects(client.query("UPDATE runs SET status='published',published_at=now() WHERE id=$1",[run.id]),/publication_requires_both_approvals/);
  await client.query('ROLLBACK TO SAVEPOINT approval_check');
 }
 await rejectPublish();
 await client.query("UPDATE runs SET publication_requested_at=now(),publication_requested_by=$2 WHERE id=$1",[run.id,owner.id]);
 await rejectPublish();
 await client.query("UPDATE runs SET publication_requested_at=NULL,publication_requested_by=NULL,najd_approved_at=now(),najd_approved_by=$2 WHERE id=$1",[run.id,admin.id]);
 await rejectPublish();
 await client.query("UPDATE runs SET publication_requested_at=now(),publication_requested_by=$2,status='published',published_at=now() WHERE id=$1",[run.id,owner.id]);
 const {rows:[published]}=await client.query('SELECT published_at FROM runs WHERE id=$1',[run.id]);
 assert(published.published_at instanceof Date);
 console.log('PASS: neither approval, org-only, and Najd-only publication rejected; both approvals publish with a timestamp.');
 console.log('PASS: counts preserved; third model discovered; model/result/release visibility enforced.');
}finally{await client.query('ROLLBACK');pool.query=originalQuery;client.release();await pool.end();}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
