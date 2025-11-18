#!/usr/bin/env python3
"""
Normalize YOLO class names (case/format variants), remap label indices, update data.yaml,
and run integrity checks for the Mintenance Building Defect dataset.

Usage (Windows PowerShell example):
  python normalize_labels.py --dataset-dir "C:\\Users\\Djodjo.Nkouka.ERICCOLE\\Downloads\\mintenance-clean\\Building Defect Detection 7.v2i.yolov11" --apply

Safe by default (dry run). Use --apply to write changes.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

try:
	import yaml  # type: ignore
except Exception:
	print("Missing dependency: PyYAML. Install with: pip install pyyaml", file=sys.stderr)
	raise


@dataclass
class RemapReport:
	old_num_classes: int
	new_num_classes: int
	old_names: List[str]
	new_names: List[str]
	remap: Dict[int, int]
	num_label_files_processed: int
	num_empty_label_files: int
	num_missing_images: int
	num_missing_labels: int
	issues: List[str]


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Normalize class names and remap YOLO labels.")
	parser.add_argument("--dataset-dir", type=Path, default=Path(__file__).parent,
	                    help="Path to the dataset root containing data.yaml, train/ valid/ test/")
	parser.add_argument("--apply", action="store_true", help="Apply changes. Without this flag, runs as dry-run.")
	parser.add_argument("--backup-dirname", type=str, default="_backup_before_normalize",
	                    help="Backup directory name created inside dataset-dir.")
	return parser.parse_args()


def load_yaml(path: Path) -> dict:
	with path.open("r", encoding="utf-8") as f:
		return yaml.safe_load(f)


def dump_yaml(path: Path, content: dict) -> None:
	with path.open("w", encoding="utf-8") as f:
		yaml.safe_dump(content, f, sort_keys=False, allow_unicode=True)


def normalize_label_name(raw: str) -> str:
	"""
	Conservative normalization:
	- lower-case
	- spaces and hyphens -> underscore
	- keep original tokens otherwise
	- unify simple case/format variants only (no semantic merges)
	"""
	name = raw.strip().lower()
	name = name.replace("-", " ").replace("_", " ")
	name = " ".join(name.split())  # collapse spaces
	name = name.replace(" ", "_")

	# Specific safe normalizations for obvious variants
	safe_aliases = {
		"damaged_roof": {"damaged_roof", "damagedroof", "damaged__roof"},
		"wall_leaking": {"wall_leaking", "wall-leaking", "wall__leaking"},
		"broken_window": {"broken_window", "brokenwindow"},
		"building": {"building"},
		"roof": {"roof"},
		"window": {"window"},
		"crack": {"crack"},
		"damage": {"damage"},
	}
	for canonical, variants in safe_aliases.items():
		if name in variants:
			return canonical
	return name


def build_names_and_remap(old_names: List[str]) -> Tuple[List[str], Dict[int, int]]:
	seen: Dict[str, int] = {}
	new_names: List[str] = []
	remap: Dict[int, int] = {}
	for old_idx, name in enumerate(old_names):
		norm = normalize_label_name(name)
		if norm not in seen:
			seen[norm] = len(new_names)
			new_names.append(norm)
		remap[old_idx] = seen[norm]
	return new_names, remap


def iter_label_files(labels_root: Path) -> List[Path]:
	if not labels_root.exists():
		return []
	return sorted(p for p in labels_root.rglob("*.txt") if p.is_file())


def corresponding_image_path(label_path: Path, images_root: Path) -> Path:
	rel = label_path.relative_to(label_path.parents[1])  # labels/<split>/.../<file>.txt
	img_rel = rel.with_suffix(".jpg").parts[1:]  # drop 'labels'
	return images_root.joinpath(*img_rel)


def process_split(split_dir: Path, remap: Dict[int, int], apply: bool) -> Tuple[int, int, int, int, List[str]]:
	labels_dir = split_dir / "labels"
	images_dir = split_dir / "images"
	issues: List[str] = []
	num_processed = 0
	num_empty = 0
	num_missing_images = 0
	num_missing_labels = 0

	# Check for orphaned images (no label) and orphaned labels (no image)
	if images_dir.exists():
		image_stems = {p.stem for p in images_dir.rglob("*.jpg")}
	else:
		image_stems = set()
	label_files = iter_label_files(labels_dir)
	label_stems = {p.stem for p in label_files}

	for stem in sorted(image_stems - label_stems):
		issues.append(f"Missing label for image: {images_dir}/**/{stem}.jpg")
		num_missing_labels += 1
	for stem in sorted(label_stems - image_stems):
		issues.append(f"Missing image for label: {labels_dir}/**/{stem}.txt")
		num_missing_images += 1

	for lbl_path in label_files:
		num_processed += 1
		try:
			content = lbl_path.read_text(encoding="utf-8").strip()
		except Exception as e:
			issues.append(f"Failed reading {lbl_path}: {e}")
			continue
		if not content:
			num_empty += 1
			continue

		lines = content.splitlines()
		new_lines: List[str] = []
		changed = False
		for ln in lines:
			parts = ln.strip().split()
			if not parts:
				continue
			try:
				old_idx = int(parts[0])
			except Exception:
				issues.append(f"Non-integer class id in {lbl_path}: '{parts[0]}'")
				continue
			if old_idx not in remap:
				issues.append(f"Class id {old_idx} not in remap for {lbl_path}")
				continue
			new_idx = remap[old_idx]
			if new_idx != old_idx:
				parts[0] = str(new_idx)
				changed = True
			new_lines.append(" ".join(parts))
		if apply and changed:
			lbl_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
	return num_processed, num_empty, num_missing_images, num_missing_labels, issues


def backup_dataset(dataset_dir: Path, backup_dirname: str) -> Path:
	backup_dir = dataset_dir / backup_dirname
	if backup_dir.exists():
		return backup_dir
	backup_dir.mkdir(parents=True, exist_ok=True)
	# Backup data.yaml
	shutil.copy2(dataset_dir / "data.yaml", backup_dir / "data.yaml.bak")
	# Backup labels (structure only)
	for split in ("train", "valid", "test"):
		src = dataset_dir / split / "labels"
		dest = backup_dir / split / "labels"
		if src.exists():
			dest.parent.mkdir(parents=True, exist_ok=True)
			# Ensure destination exists before copytree on Windows
			if not dest.exists():
				dest.mkdir(parents=True, exist_ok=True)
			shutil.copytree(src, dest, dirs_exist_ok=True)
	return backup_dir


def main() -> None:
	args = parse_args()
	dataset_dir: Path = args.dataset_dir.resolve()
	data_yaml = dataset_dir / "data.yaml"
	if not data_yaml.exists():
		print(f"ERROR: data.yaml not found at {data_yaml}", file=sys.stderr)
		sys.exit(1)

	cfg = load_yaml(data_yaml)
	old_names: List[str] = list(cfg.get("names", []))
	if not old_names or not isinstance(old_names, list):
		print("ERROR: 'names' missing or invalid in data.yaml", file=sys.stderr)
		sys.exit(1)
	new_names, remap = build_names_and_remap(old_names)

	if args.apply:
		backup_dir = backup_dataset(dataset_dir, args.backup_dirname)
		print(f"Backup created at: {backup_dir}")

	total_processed = 0
	total_empty = 0
	total_missing_images = 0
	total_missing_labels = 0
	all_issues: List[str] = []
	for split in ("train", "valid", "test"):
		split_dir = dataset_dir / split
		p, e, mi, ml, iss = process_split(split_dir, remap, apply=args.apply)
		total_processed += p
		total_empty += e
		total_missing_images += mi
		total_missing_labels += ml
		all_issues.extend(iss)

	if args.apply:
		# Update data.yaml
		cfg["names"] = new_names
		cfg["nc"] = len(new_names)
		dump_yaml(data_yaml, cfg)

	report = RemapReport(
		old_num_classes=len(old_names),
		new_num_classes=len(new_names),
		old_names=old_names,
		new_names=new_names,
		remap=remap,
		num_label_files_processed=total_processed,
		num_empty_label_files=total_empty,
		num_missing_images=total_missing_images,
		num_missing_labels=total_missing_labels,
		issues=all_issues,
	)

	# Human-readable summary
	print("\n=== Remap Summary ===")
	print(f"Classes: {report.old_num_classes} -> {report.new_num_classes}")
	print("Index remap (old->new) for changed entries:")
	for old_idx, new_idx in sorted(report.remap.items()):
		if old_idx != new_idx:
			print(f"  {old_idx} -> {new_idx}  ({old_names[old_idx]} -> {new_names[new_idx]})")
	print(f"\nLabel files processed: {report.num_label_files_processed}")
	print(f"Empty label files:     {report.num_empty_label_files}")
	print(f"Missing images:        {report.num_missing_images}")
	print(f"Missing labels:        {report.num_missing_labels}")
	if report.issues:
		print("\nIssues:")
		for msg in report.issues[:200]:
			print(f" - {msg}")
		if len(report.issues) > 200:
			print(f" ... and {len(report.issues) - 200} more")

	if not args.apply:
		print("\nDry run complete. Re-run with --apply to write changes and update data.yaml.")
	else:
		print("\nApply complete. data.yaml and label indices updated. Backup stored in backup directory.")


if __name__ == "__main__":
	main()


