'use strict';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const webRequire = createRequire(
  path.resolve(__dirname, '../../apps/web/package.json')
);
const ort = webRequire('onnxruntime-node');

// Synthetic ONNX IR 8 / opset 13 model: Identity(input: float[2]) -> output.
// Embedded to keep this check independent of model downloads and production data.
const model = Buffer.from(
  'CAgSDW1pbnRlbmFuY2UtY2k6VwoZCgVpbnB1dBIGb3V0cHV0IghJZGVudGl0eRIPY2lfY3B1X2lkZW50aXR5WhMKBWlucHV0EgoKCAgBEgQKAggCYhQKBm91dHB1dBIKCggIARIECgIIAkICEA0=',
  'base64'
);

async function verify() {
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ['cpu'],
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
  });
  try {
    const values = [1.25, -2.5];
    const result = await session.run({
      input: new ort.Tensor('float32', Float32Array.from(values), [2]),
    });
    assert.deepEqual(result.output.dims, [2]);
    assert.deepEqual(Array.from(result.output.data), values);
    console.log(
      `ONNX CPU inference verified (${process.platform}/${process.arch}).`
    );
  } finally {
    await session.release();
  }
}

verify().catch((error) => {
  console.error('ONNX CPU inference verification failed:', error);
  process.exitCode = 1;
});
