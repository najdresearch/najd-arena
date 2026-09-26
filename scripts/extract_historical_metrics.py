"""Export aggregate-only historical metrics; never publish answers or prompts."""
import argparse
import collections
import gzip
import hashlib
import json
import math
import statistics
from pathlib import Path

EXPECTED_GRADES = '57a22d0a8ffb0aa9ba2ba108e77f90352e457e4b70fc3d28d44bcfed820ded1b'
EXPECTED_EVIDENCE = '9d349cfc53f688412abf3e7950ba92618de3f31d9b20c963d9cc32826ce5ca8e'

def digest(path):
    with path.open('rb') as file:
        h = hashlib.sha256()
        for block in iter(lambda: file.read(1024*1024), b''):
            h.update(block)
        return h.hexdigest()

def extract(snapshot, seed):
    grades_path, evidence_path = snapshot/'grades.latest.jsonl', snapshot/'evidence.valid.jsonl'
    if digest(grades_path) != EXPECTED_GRADES or digest(evidence_path) != EXPECTED_EVIDENCE:
        raise ValueError('Snapshot hash mismatch')
    groups, grades = collections.defaultdict(collections.Counter), {}
    for line in grades_path.open():
        r = json.loads(line)
        if r['result_id'] in grades:
            raise ValueError('Duplicate result ID')
        grades[r['result_id']] = r
        g = groups[r['config_id']]
        g['total'] += 1
        label = 'technical_failure' if r['grade_status'] == 'technical_failure' else r['label']
        if label not in {'correct','possible_correct','partial_correct','wrong','technical_failure'}:
            raise ValueError('Unexpected grade')
        g[label] += 1
    if len(grades) != 170492 or len(groups) != 28 or any(g['total'] != 6089 for g in groups.values()):
        raise ValueError('Incomplete configuration coverage')
    # Reconcile the additional export against the existing deployable database seed.
    seeded = collections.defaultdict(collections.Counter)
    with gzip.open(seed, 'rt') as file:
        for r in json.load(file)['grades']:
            seeded[r[0]]['total'] += 1
            label = 'technical_failure' if r[4] == 'technical_failure' else r[5]
            seeded[r[0]][label] += 1
    if dict(seeded) != dict(groups):
        raise ValueError('Metrics differ from the database seed')
    times, seen = collections.defaultdict(list), set()
    for line in evidence_path.open():
        r = json.loads(line)
        if r['result_id'] in seen:
            raise ValueError('Duplicate evidence')
        seen.add(r['result_id'])
        grade = grades[r['result_id']]
        if r['config_id'] != grade['config_id'] or r['case_id'] != grade['case_id']:
            raise ValueError('Evidence identity mismatch')
        t = r.get('elapsed_seconds')
        if r['status'] == 'ok' and grade['grade_status'] == 'ok' and isinstance(t,(int,float)) and math.isfinite(t) and t > 0:
            times[r['config_id']].append(t)
    output = []
    for config,g in sorted(groups.items()):
        values = sorted(times[config])
        output.append({'config':config, **dict(g), 'timedOutputs':len(values),
            'medianSeconds':round(statistics.median(values),3) if values else None,
            'p95Seconds':round(values[math.ceil(.95*len(values))-1],3) if values else None})
    return {'schemaVersion':1, 'snapshot':'2026-09-09', 'gradesSha256':EXPECTED_GRADES,
        'evidenceSha256':EXPECTED_EVIDENCE, 'configurations':output}

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot',type=Path)
    parser.add_argument('--seed',type=Path,default=Path('web/db/seeds/historical-m3.json.gz'))
    parser.add_argument('--output',type=Path,default=Path('web/db/seeds/historical-metrics.json'))
    args=parser.parse_args()
    result=extract(args.snapshot,args.seed)
    args.output.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print(f'Verified {len(result["configurations"])} configurations against seed. Exported aggregates only.')
