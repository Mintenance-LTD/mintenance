"""Build our CLI-only dependency profile from the hash-verified upstream wheel.

Run from the repository root: python scripts/build_headless_llamafactory.py
Only distribution metadata/RECORD change. All upstream source and licenses are
preserved byte-for-byte; Gradio becomes an opt-in webui extra. No --no-deps or
resolver overrides are used when installing the resulting wheel.
"""
import argparse
import base64
import csv
import hashlib
import io
from pathlib import Path
import urllib.request
import zipfile

URL = "https://files.pythonhosted.org/packages/2e/4b/b97735f2ea65ea7f0e9fcd1f595002ad5616b9a638e9e97bad8871069aaa/llamafactory-0.9.5-py3-none-any.whl"
UPSTREAM_SHA256 = "10776e9b259798bf65f6c5343f6298f0302e92e9cd47472abe29eef69e286c6a"
VERSION = "0.9.5+mintenance.1"
FILENAME = f"llamafactory-{VERSION}-py3-none-any.whl"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "vlm_training_worker" / "vendor" / FILENAME
OLD_INFO = "llamafactory-0.9.5.dist-info"
NEW_INFO = f"llamafactory-{VERSION}.dist-info"
GRADIO = "Requires-Dist: gradio<=5.50.0,>=4.38.0\n"


def build(upstream: bytes) -> bytes:
    if hashlib.sha256(upstream).hexdigest() != UPSTREAM_SHA256:
        raise ValueError("Upstream wheel checksum mismatch")
    files = {}
    with zipfile.ZipFile(io.BytesIO(upstream)) as source:
        for name in source.namelist():
            if name == f"{OLD_INFO}/RECORD":
                continue
            content = source.read(name)
            if name == f"{OLD_INFO}/METADATA":
                metadata = content.decode("utf-8")
                if metadata.count(GRADIO) != 1 or metadata.count("Version: 0.9.5\n") != 1:
                    raise ValueError("Unexpected upstream metadata")
                metadata = metadata.replace("Version: 0.9.5\n", f"Version: {VERSION}\n", 1)
                metadata = metadata.replace(GRADIO, 'Provides-Extra: webui\nRequires-Dist: gradio<=5.50.0,>=4.38.0; extra == "webui"\n', 1)
                content = metadata.encode("utf-8")
            files[name.replace(OLD_INFO + "/", NEW_INFO + "/", 1)] = content
    record = io.StringIO(newline="")
    writer = csv.writer(record, lineterminator="\n")
    for name, content in sorted(files.items()):
        digest = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).rstrip(b"=").decode()
        writer.writerow([name, "sha256=" + digest, len(content)])
    writer.writerow([f"{NEW_INFO}/RECORD", "", ""])
    files[f"{NEW_INFO}/RECORD"] = record.getvalue().encode()
    result = io.BytesIO()
    # Stored entries make byte-for-byte reproduction independent of zlib versions.
    with zipfile.ZipFile(result, "w", compression=zipfile.ZIP_STORED) as wheel:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 29, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            wheel.writestr(info, content)
    return result.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upstream", type=Path, help="Use a cached upstream wheel (checksum still required)")
    parser.add_argument("--check", action="store_true", help="Verify the checked-in artifact without writing it")
    args = parser.parse_args()
    if args.upstream:
        upstream = args.upstream.read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=60) as response:
            upstream = response.read()
    content = build(upstream)
    if args.check:
        if OUTPUT.read_bytes() != content:
            raise SystemExit("Checked-in headless wheel differs from the reproducible build")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(content)
    print(f"{hashlib.sha256(content).hexdigest()}  {OUTPUT.name}")


if __name__ == "__main__":
    main()
