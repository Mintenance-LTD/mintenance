"""Backport upstream PRs #46191 and #46890 to LLaMA-Factory-compatible 4.57.6.

Only three security-sensitive source files, the package version and wheel
metadata change. Dependency constraints and all other upstream files are kept.
"""
import argparse
import base64
import csv
import hashlib
import io
from pathlib import Path
import urllib.request
import zipfile

URL = "https://files.pythonhosted.org/packages/03/b8/e484ef633af3887baeeb4b6ad12743363af7cce68ae51e938e00aaa0529d/transformers-4.57.6-py3-none-any.whl"
UPSTREAM_SHA256 = "4c9e9de11333ddfe5114bc872c9f370509198acf0b87a832a0ab9458e2bd0550"
VERSION = "4.57.6+mintenance.1"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "vlm_training_worker/vendor" / f"transformers-{VERSION}-py3-none-any.whl"
OLD_INFO = "transformers-4.57.6.dist-info"
NEW_INFO = f"transformers-{VERSION}.dist-info"


def replace_once(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f"Unexpected upstream source for {old!r}")
    return source.replace(old, new, 1)


def patched_files(upstream):
    if hashlib.sha256(upstream).hexdigest() != UPSTREAM_SHA256:
        raise ValueError("Upstream wheel checksum mismatch")
    with zipfile.ZipFile(io.BytesIO(upstream)) as source:
        files = {name: source.read(name) for name in source.namelist()
                 if name != f"{OLD_INFO}/RECORD"}

    # https://github.com/huggingface/transformers/pull/46191
    for filename, indent in (("processing_utils.py", " " * 24),
                             ("tokenization_utils_base.py", " " * 20)):
        path = "transformers/" + filename
        old = indent + 'template_filepath = os.path.join(chat_template_dir, f"{template_name}.jinja")\n'
        new = old + indent + '# template_name is an untrusted dict key; reject path traversal (CWE-22)\n'
        new += indent + 'if Path(template_filepath).resolve().parent != Path(chat_template_dir).resolve():\n'
        new += indent + '    raise ValueError(f"Invalid chat template name: {template_name!r}")\n'
        files[path] = replace_once(files[path].decode("utf-8"), old, new).encode("utf-8")

    # https://github.com/huggingface/transformers/pull/46890
    # Use lexical containment, as upstream does, to retain HF cache symlinks.
    path = "transformers/modeling_utils.py"
    old = "                archive_file = os.path.join(pretrained_model_name_or_path, subfolder, transformers_explicit_filename)\n"
    new = '''                base_dir = os.path.join(pretrained_model_name_or_path, subfolder)
                archive_file = os.path.join(base_dir, transformers_explicit_filename)
                try:
                    absolute_base_dir = os.path.abspath(base_dir)
                    absolute_archive_file = os.path.abspath(archive_file)
                    contained = os.path.commonpath([absolute_base_dir, absolute_archive_file]) == absolute_base_dir
                except ValueError:
                    contained = False
                if not contained:
                    raise ValueError(
                        f"`transformers_weights` must reference a file inside the model directory, got {transformers_explicit_filename}"
                    )
'''
    files[path] = replace_once(files[path].decode("utf-8"), old, new).encode("utf-8")
    path = "transformers/__init__.py"
    files[path] = replace_once(files[path].decode("utf-8"), '__version__ = "4.57.6"',
                               f'__version__ = "{VERSION}"').encode("utf-8")
    path = f"{OLD_INFO}/METADATA"
    files[path] = replace_once(files[path].decode("utf-8"), "Version: 4.57.6\n",
                               f"Version: {VERSION}\n").encode("utf-8")
    files = {name.replace(OLD_INFO + "/", NEW_INFO + "/", 1): data for name, data in files.items()}
    record = io.StringIO(newline="")
    writer = csv.writer(record, lineterminator="\n")
    for name, content in sorted(files.items()):
        digest = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).rstrip(b"=").decode()
        writer.writerow([name, "sha256=" + digest, len(content)])
    writer.writerow([f"{NEW_INFO}/RECORD", "", ""])
    files[f"{NEW_INFO}/RECORD"] = record.getvalue().encode()
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upstream", type=Path, help="Cached upstream wheel (checksum still required)")
    parser.add_argument("--check", action="store_true", help="Verify every checked-in wheel entry against the rebuilt payload")
    args = parser.parse_args()
    if args.upstream:
        upstream = args.upstream.read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=60) as response:
            upstream = response.read()
    files = patched_files(upstream)
    if args.check:
        # Compare all uncompressed entries: zlib revisions can produce different
        # compressed streams. Neither source nor metadata may differ.
        with zipfile.ZipFile(OUTPUT) as wheel:
            if len(wheel.namelist()) != len(files) or set(wheel.namelist()) != set(files):
                raise SystemExit("Patched wheel file list differs")
            for name, data in files.items():
                if wheel.read(name) != data:
                    raise SystemExit(f"Patched wheel differs: {name}")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(OUTPUT, "w") as wheel:
            for name, data in sorted(files.items()):
                info = zipfile.ZipInfo(name, date_time=(2026, 11, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                wheel.writestr(info, data)
    print(f"{hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}  {OUTPUT.name}")


if __name__ == "__main__":
    main()
