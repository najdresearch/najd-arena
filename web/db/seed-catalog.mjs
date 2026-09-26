import {readFile} from 'node:fs/promises';
export async function seedCatalog(client) {
 const models=JSON.parse(await readFile(new URL('./seeds/model-catalog.json',import.meta.url),'utf8'));
 const evidence=JSON.parse(await readFile(new URL('./seeds/historical-metrics.json',import.meta.url),'utf8'));
 const {rows:[source]}=await client.query('SELECT * FROM historical_experiments WHERE source_snapshot_sha256=$1 AND source_evidence_sha256=$2',[evidence.gradesSha256,evidence.evidenceSha256]);
 if(!source)throw new Error('Verified historical source must be imported before catalog');
 const {rows:[existing]}=await client.query('SELECT id FROM evaluation_releases WHERE id=$1',[source.id]);
 if(existing)return; // Never reset an operator visibility decision on restart.
 await client.query('BEGIN');
 try{
 for(const m of models)await client.query(`INSERT INTO model_catalog(id,slug,display_name,provider_name,logo_url,color,visibility) VALUES($1,$2,$3,$4,$5,$6,'public') ON CONFLICT(id) DO NOTHING`,[m.id,m.slug,m.displayName,m.providerName,m.logoUrl,m.color]);
 await client.query(`INSERT INTO evaluation_releases(id,title,protocol,dataset_revision,metadata,visibility) VALUES($1,$2,'historical-pre-audit',$3,$4,'public')`,[source.id,source.title,source.published_dataset_revision,JSON.stringify(source)]);
 const {rows}=await client.query(`SELECT config_id, count(*)::int total,count(*) FILTER(WHERE label IN ('correct','possible_correct'))::int acceptable,count(*) FILTER(WHERE grade_status='technical_failure')::int technical FROM historical_grades WHERE experiment_id=$1 GROUP BY config_id`,[source.id]);
 for(const r of rows){
 const metric=evidence.configurations.find(m=>m.config===r.config_id);
 if(!metric||metric.total!==r.total||metric.correct+metric.possible_correct!==r.acceptable)throw new Error('Aggregate reconciliation failed');
 const {rows:tracks}=await client.query(`SELECT category AS name,count(*)::int total,count(*) FILTER(WHERE label IN ('correct','possible_correct'))::int acceptable,count(*) FILTER(WHERE grade_status='technical_failure')::int technical FROM historical_grades WHERE experiment_id=$1 AND config_id=$2 GROUP BY category`,[source.id,r.config_id]);
 const [model,execution,thinking]=r.config_id.split('--');
 await client.query(`INSERT INTO evaluation_results(id,release_id,model_id,execution,thinking,total,acceptable,technical,tracks,metrics,visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'public')`,[r.config_id,source.id,model,execution,thinking,r.total,r.acceptable,r.technical,JSON.stringify(tracks),JSON.stringify(metric)]);
 }
 if(rows.length!==source.configuration_count)throw new Error('Configuration coverage mismatch');
 await client.query('COMMIT');console.log(`Imported ${rows.length} reconciled catalog results`);
 }catch(e){await client.query('ROLLBACK');throw e;}
}
