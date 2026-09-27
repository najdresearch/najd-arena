"""Reject schema drift from the pinned benchmark contract source."""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path


def check(root: Path, offline=False):
    lock = json.loads((root / 'contracts.lock.json').read_text())
    revision = lock['revision']
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('Contract source must use an immutable Git commit')
    for entry in lock['files']:
        local = (root / entry['local_path']).resolve()
        if root.resolve() not in local.parents:
            raise ValueError('Contract path escapes repository')
        if hashlib.sha256(local.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f"Vendored schema changed: {entry['local_path']}")
        if not offline:
            url = ('https://raw.githubusercontent.com/najdresearch/benchmark/'
                   + revision + '/' + entry['source_path'])
            with urllib.request.urlopen(url, timeout=30) as response:
                raw = response.read()
            if hashlib.sha256(raw).hexdigest() != entry['sha256']:
                raise ValueError('Vendored schema differs from pinned upstream')
    print(f"Verified {len(lock['files'])} schemas at benchmark commit {revision}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    check(Path(__file__).resolve().parents[1], args.offline)
