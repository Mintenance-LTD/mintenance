"""CPU-only preflight for an explicitly grouped, content-bound dataset split."""
import hashlib
import json
from pathlib import Path


def load_reviewed_split(train_path: str, validation_path: str, manifest_path: str) -> tuple[list[dict], list[dict]]:
    if not validation_path or not manifest_path:
        raise ValueError('Explicit validation data and split manifest are required; row-based splitting is prohibited')
    manifest = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
    datasets = []
    for file_path, hash_key in [(train_path, 'trainSha256'), (validation_path, 'validationSha256')]:
        data = Path(file_path).read_bytes()
        if hashlib.sha256(data).hexdigest() != manifest.get(hash_key):
            raise ValueError('Dataset content differs from the reviewed split manifest')
        rows = [json.loads(line) for line in data.decode('utf-8').splitlines() if line.strip()]
        if not rows:
            raise ValueError('Training and validation partitions must both contain examples')
        datasets.append(rows)
    if manifest.get('version') != 1:
        raise ValueError('Unsupported split manifest version')
    seen_ids, properties, groups = set(), {}, {}
    counts = {'train': 0, 'validation': 0}
    assignments = manifest.get('assignments')
    if not isinstance(assignments, list):
        raise ValueError('Missing split assignments')
    for assignment in assignments:
        aid, prop, group, split = (assignment.get(k) for k in ('assessmentId', 'propertyId', 'group', 'split'))
        if not all(isinstance(v, str) and v.strip() for v in (aid, prop, group)) or split not in counts:
            raise ValueError('Invalid split assignment')
        if aid in seen_ids:
            raise ValueError('Duplicate assessment in split manifest')
        seen_ids.add(aid)
        for mapping, key in [(properties, prop), (groups, group)]:
            if key in mapping and mapping[key] != split:
                raise ValueError('Property or shared-image group leaks across partitions')
            mapping[key] = split
        counts[split] += 1
    if counts['train'] != len(datasets[0]) or counts['validation'] != len(datasets[1]):
        raise ValueError('Split assignment counts differ from dataset rows')
    if len(groups) < 2 or manifest.get('groupCount') != len(groups):
        raise ValueError('Invalid independent group count')
    return datasets[0], datasets[1]
