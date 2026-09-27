"""Select reproducible evaluation-only SDNET2018 crops without extracting the full archive."""
import argparse
import hashlib
import json
import logging
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

SOURCE = 'https://digitalcommons.usu.edu/all_datasets/48/'
MIRROR = 'https://www.kaggle.com/datasets/aniruddhsharma/structural-defects-network-concrete-crack-images'
SEED = 'mint-sdnet-pilot-v1'


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def rank(value: str) -> str:
    return hashlib.sha256(f'{SEED}:{value}'.encode()).hexdigest()


def prepare(archive: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / 'images').mkdir(exist_ok=True)
    rows: list[dict] = []
    used_groups: set[str] = set()
    used_hashes: set[str] = set()
    with ZipFile(archive) as data:
        names = [n for n in data.namelist() if n.lower().endswith('.jpg')]
        for surface, count in [('Walls', 36), ('Decks', 20), ('Pavements', 24)]:
            for label in ['Cracked', 'Non-cracked']:
                candidates: dict[str, list[str]] = defaultdict(list)
                for name in names:
                    if name.startswith(f'{surface}/{label}/'):
                        parent = f'{surface}/{Path(name).stem.split("-")[0]}'
                        candidates[parent].append(name)
                chosen = 0
                for parent in sorted(candidates, key=rank):
                    if parent in used_groups:
                        continue
                    for name in sorted(candidates[parent], key=rank):
                        content = data.read(name)
                        sha = hashlib.sha256(content).hexdigest()
                        if sha in used_hashes:
                            continue
                        case_id = f'sdnet-{len(rows) + 1:03d}'
                        relative = f'images/{case_id}.jpg'
                        (output / relative).write_bytes(content)
                        rows.append(dict(id=case_id, image=relative, sha256=sha,
                            source_archive_member=name, source_group=parent,
                            source_url=SOURCE, license='CC-BY-4.0',
                            surface=surface.lower(), cohort='original',
                            crack_present=label == 'Cracked',
                            label_basis='SDNET2018 publisher class via mirror folder',
                            review_status='publisher_label_not_independently_reviewed',
                            safety_ground_truth=None, severity_ground_truth=None,
                            split='evaluation_only', training_allowed=False))
                        used_groups.add(parent)
                        used_hashes.add(sha)
                        chosen += 1
                        break
                    if chosen == count:
                        break
                if chosen != count:
                    raise ValueError(f'Insufficient distinct source groups: {surface}/{label}')
    assert len(rows) == 160 and len(used_groups) == 160
    (output / 'originals.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
    (output / 'provenance.json').write_text(json.dumps(dict(
        dataset='SDNET2018', version=SEED, source_url=SOURCE, mirror_url=MIRROR,
        archive_sha256=digest(archive), archive_bytes=archive.stat().st_size,
        publisher_archive_checksum_not_verified=True,
        license='https://creativecommons.org/licenses/by/4.0/',
        citation='Maguire, M., Dorafshan, S., & Thomas, R. J. (2018). SDNET2018. Utah State University. https://doi.org/10.15142/T3TD19',
        source_download_note='Publisher download returned HTTP 403; public Kaggle mirror used.',
        selection='80 cracked, 80 non-cracked; one crop per source photograph; hash-ranked deterministic selection.',
        limitations=['No-crack labels do not establish health or safety.',
          'Public images may already occur in foundation-model pretraining.',
          'Labels and filename-based parent grouping have not been independently audited.']), indent=2), encoding='utf-8')
    logging.info('Selected %d originals from %d distinct source groups', len(rows), len(used_groups))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.archive, args.output)
