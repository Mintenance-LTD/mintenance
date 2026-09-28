import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from reviewed_split import load_reviewed_split


class ReviewedSplitTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        root = Path(self.directory.name)
        self.train, self.val, self.manifest = (root / name for name in ('train.jsonl', 'val.jsonl', 'split.json'))
        self.train.write_bytes(b'{"messages":[]}\n')
        self.val.write_bytes(b'{"messages":[]}\n')
        self.data = {'version': 1, 'groupCount': 2,
            'trainSha256': hashlib.sha256(self.train.read_bytes()).hexdigest(),
            'validationSha256': hashlib.sha256(self.val.read_bytes()).hexdigest(),
            'assignments': [
                {'assessmentId': 'a', 'propertyId': 'one', 'group': 'one', 'split': 'train'},
                {'assessmentId': 'b', 'propertyId': 'two', 'group': 'two', 'split': 'validation'}]}

    def check(self):
        self.manifest.write_text(json.dumps(self.data), encoding='utf-8')
        return load_reviewed_split(str(self.train), str(self.val), str(self.manifest))

    def test_accepts_content_bound_grouped_split(self):
        self.assertEqual([len(rows) for rows in self.check()], [1, 1])

    def test_rejects_changed_dataset(self):
        self.train.write_bytes(b'{"messages":["changed"]}\n')
        with self.assertRaisesRegex(ValueError, 'content differs'):
            self.check()

    def test_rejects_property_leakage(self):
        self.data['assignments'][1]['propertyId'] = 'one'
        with self.assertRaisesRegex(ValueError, 'leaks'):
            self.check()

    def test_rejects_count_mismatch(self):
        self.data['assignments'].pop()
        with self.assertRaisesRegex(ValueError, 'counts differ'):
            self.check()


if __name__ == '__main__':
    unittest.main()
