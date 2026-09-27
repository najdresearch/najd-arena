from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

import pytest
from najd_benchmark.release import CASE_COUNT, DATASET_REVISION, DATASET_VERSION

from najd_arena.metrics import deterministic_grade
from najd_arena.models import Benchmark, BenchmarkCase
from najd_arena.worker import _benchmark_for_run, summarize_run


def benchmark():
    case = BenchmarkCase.from_dict({
        'id': 'one', 'track': 'arabic', 'language': 'ar', 'prompt': 'question',
        'expected': {'answer': 'answer'}, 'provenance': {'sourceId': 'najd-benchmark-v1'},
    })
    return Benchmark('test', 'version', 'revision', 'sha', Path('.'),
                     (case, replace(case, id='two')))


def test_run_uses_recorded_release():
    with patch('najd_arena.worker.fetch_benchmark', return_value=benchmark()) as fetch:
        _benchmark_for_run({'dataset_version': 'old', 'dataset_revision': 'immutable', 'total_cases': 2})
        fetch.assert_called_once_with(version='old', revision='immutable')
        with pytest.raises(ValueError):
            _benchmark_for_run({'dataset_version': 'old', 'dataset_revision': 'immutable', 'total_cases': 3})


def test_incomplete_results_have_no_headline():
    _, coverage, macro, micro, complete = summarize_run(benchmark(), [('one', 'arabic', 1), ('two', 'arabic', None)])
    assert (coverage, macro, micro, complete) == (0.5, None, None, False)
    assert summarize_run(benchmark(), [('one', 'arabic', 1), ('two', 'arabic', 0)])[1:] == (1, 0.5, 0.5, True)


@pytest.mark.parametrize('rows', [
    [('one', 'arabic', 1), ('one', 'arabic', 1)], [('unknown', 'arabic', 1)],
    [('one', 'wrong-track', 1)], [('one', 'arabic', float('nan'))],
])
def test_invalid_grades_rejected(rows):
    with pytest.raises(ValueError):
        summarize_run(benchmark(), rows)


def test_missing_evidence_stays_ungraded():
    case = benchmark().cases[0]
    assert deterministic_grade(replace(case, fixture='documents'), 'answer')['score'] is None
    assert deterministic_grade(replace(case, audit_issues=('missing_expected_answer',)), 'answer')['score'] is None


def test_web_and_worker_release_agree():
    source = (Path(__file__).parents[2] / 'web/lib/dataset-release.ts').read_text()
    assert DATASET_VERSION in source
    assert DATASET_REVISION in source
    assert str(CASE_COUNT) in source
