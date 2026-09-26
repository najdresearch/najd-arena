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
 console.log('PASS: counts preserved; third model discovered; model/result/release visibility enforced.');
}finally{await client.query('ROLLBACK');pool.query=originalQuery;client.release();await pool.end();}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
