import io
import json
from unittest.mock import MagicMock, patch

import pytest
from najd_benchmark.fixtures import PROTOCOL

from najd_arena.dataset import fixture_files
from najd_arena.models import Benchmark, BenchmarkCase
from najd_arena.worker import grade_case


def benchmark(root):
    case = BenchmarkCase('fixture', 'agentic', 'ar', 'Read and write', (),
                         {'file_contains': {'answer.txt': 'Lulwa'}},
                         {'sourceId': 'najd-benchmark-v1'}, (), fixture='contacts')
    return Benchmark('test', 'version', 'revision', 'sha', root, (case,))


def test_worker_saves_failed_artifact_verdict(tmp_path):
    b = benchmark(tmp_path)
    payload = {'output': 'I wrote Lulwa', 'protocol': PROTOCOL, 'status': 'complete', 'files': {}}
    s3 = MagicMock()
    s3.get_object.return_value = {'Body': io.BytesIO(json.dumps(payload).encode())}
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = (0,)
    with (patch('najd_arena.worker._database') as database,
          patch('najd_arena.worker._run', return_value={'status': 'grading', 'total_cases': 1}),
          patch('najd_arena.worker._benchmark_for_run', return_value=b),
          patch('najd_arena.worker._s3', return_value=s3),
          patch.dict('os.environ', {'S3_BUCKET': 'test'})):
        database.return_value.__enter__.return_value = connection
        grade_case('run', 'fixture')
    saved = json.loads(s3.put_object.call_args.kwargs['Body'])
    assert saved['grade']['score'] == 0
    assert saved['dataset_revision'] == 'revision'
    assert s3.put_object.call_args.kwargs['Key'] == 'runs/run/grades/fixture.json'


def test_fixture_loader_rejects_tampered_bytes(tmp_path):
    (tmp_path / 'checksums.json').write_text(json.dumps({'files': {
        'fixtures/contacts/contacts.csv': '0' * 64}}))
    file = tmp_path / 'contacts.csv'
    file.write_text('modified')
    b = benchmark(tmp_path)
    with (patch('najd_arena.dataset.hf_hub_download', return_value=str(file)) as fetch,
          pytest.raises(ValueError, match='checksum mismatch')):
        fixture_files(b, b.cases[0])
    assert fetch.call_args.kwargs['revision'] == 'revision'
