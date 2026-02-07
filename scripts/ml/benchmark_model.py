#!/usr/bin/env python3
"""
Model Latency Benchmarking

Runs automated latency profiling (p50, p95, p99) with dummy inference.
Designed to run as part of CI/CD before deploying edge models.

Usage:
    python benchmark_model.py \
        --model-path runs/distill/nano_student/weights/best.pt \
        --warmup 10 \
        --iterations 100 \
        --imgsz 640

Output: JSON report with latency percentiles, throughput, and model metadata.
"""

import os
import json
import argparse
import time
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

import torch
import numpy as np
from ultralytics import YOLO


class ModelBenchmark:
    """Benchmarks YOLO model inference latency and throughput."""

    def __init__(self, model_path: str, device: str = '0', imgsz: int = 640):
        self.model_path = model_path
        self.device = device
        self.imgsz = imgsz
        self.model = YOLO(model_path)

        # Determine device string for torch
        if device == 'cpu':
            self.torch_device = torch.device('cpu')
        else:
            self.torch_device = torch.device(f'cuda:{device}' if torch.cuda.is_available() else 'cpu')

        print(f"Model: {model_path}")
        print(f"Device: {self.torch_device}")
        print(f"Image size: {imgsz}")

    def _create_dummy_input(self, batch_size: int = 1) -> np.ndarray:
        """Create a random dummy image for benchmarking."""
        return np.random.randint(0, 255, (self.imgsz, self.imgsz, 3), dtype=np.uint8)

    def run_warmup(self, iterations: int = 10) -> None:
        """Warm up the model to stabilize GPU/CPU caches."""
        print(f"Warming up ({iterations} iterations)...")
        dummy = self._create_dummy_input()
        for _ in range(iterations):
            self.model.predict(
                source=dummy,
                imgsz=self.imgsz,
                device=self.device,
                verbose=False,
                save=False
            )

    def measure_latency(
        self,
        iterations: int = 100,
        batch_size: int = 1
    ) -> Dict[str, Any]:
        """Measure inference latency over multiple iterations.

        Returns:
            Dictionary with p50, p95, p99 latencies (ms), throughput (FPS),
            and raw timing data.
        """
        dummy = self._create_dummy_input()
        latencies: List[float] = []

        print(f"Benchmarking ({iterations} iterations)...")
        for i in range(iterations):
            start = time.perf_counter()
            self.model.predict(
                source=dummy,
                imgsz=self.imgsz,
                device=self.device,
                verbose=False,
                save=False
            )
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies.append(elapsed_ms)

            if (i + 1) % 25 == 0:
                print(f"  {i + 1}/{iterations} done (last: {elapsed_ms:.1f}ms)")

        latencies_arr = np.array(latencies)

        return {
            'p50_ms': float(np.percentile(latencies_arr, 50)),
            'p95_ms': float(np.percentile(latencies_arr, 95)),
            'p99_ms': float(np.percentile(latencies_arr, 99)),
            'mean_ms': float(np.mean(latencies_arr)),
            'std_ms': float(np.std(latencies_arr)),
            'min_ms': float(np.min(latencies_arr)),
            'max_ms': float(np.max(latencies_arr)),
            'fps': float(1000.0 / np.mean(latencies_arr)) if np.mean(latencies_arr) > 0 else 0,
            'iterations': iterations,
            'raw_latencies_ms': latencies,
        }

    def get_model_metadata(self) -> Dict[str, Any]:
        """Collect model metadata (size, format, param count)."""
        model_file = Path(self.model_path)
        size_bytes = model_file.stat().st_size
        size_mb = size_bytes / (1024 * 1024)

        # Detect format from extension
        ext = model_file.suffix.lower()
        format_map = {
            '.pt': 'pytorch',
            '.onnx': 'onnx',
            '.tflite': 'tflite',
            '.engine': 'tensorrt',
            '.torchscript': 'torchscript',
        }
        model_format = format_map.get(ext, 'unknown')

        metadata = {
            'model_path': str(model_file),
            'model_format': model_format,
            'size_bytes': size_bytes,
            'size_mb': round(size_mb, 2),
            'device': str(self.torch_device),
            'imgsz': self.imgsz,
            'cuda_available': torch.cuda.is_available(),
        }

        if torch.cuda.is_available() and self.torch_device.type == 'cuda':
            metadata['gpu_name'] = torch.cuda.get_device_name(self.torch_device)
            metadata['gpu_memory_mb'] = round(
                torch.cuda.get_device_properties(self.torch_device).total_mem / (1024 * 1024), 0
            )

        return metadata

    def generate_report(
        self,
        latency_results: Dict[str, Any],
        metadata: Dict[str, Any],
        max_latency_ms: float = 0
    ) -> Dict[str, Any]:
        """Generate a full benchmark report with pass/fail status."""
        # Remove raw latencies from report (too large)
        report_latency = {k: v for k, v in latency_results.items() if k != 'raw_latencies_ms'}

        passed = True
        fail_reasons = []
        if max_latency_ms > 0:
            if latency_results['p95_ms'] > max_latency_ms:
                passed = False
                fail_reasons.append(
                    f"p95 latency ({latency_results['p95_ms']:.1f}ms) "
                    f"exceeds budget ({max_latency_ms}ms)"
                )

        return {
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata,
            'latency': report_latency,
            'passed': passed,
            'fail_reasons': fail_reasons,
            'max_latency_budget_ms': max_latency_ms,
        }


def main():
    parser = argparse.ArgumentParser(description='Benchmark YOLO model inference latency')
    parser.add_argument('--model-path', required=True, help='Path to model file')
    parser.add_argument('--device', default='0', help='Device (0 for GPU, cpu for CPU)')
    parser.add_argument('--imgsz', type=int, default=640, help='Image size')
    parser.add_argument('--warmup', type=int, default=10, help='Warmup iterations')
    parser.add_argument('--iterations', type=int, default=100, help='Benchmark iterations')
    parser.add_argument('--max-latency-ms', type=float, default=0,
                       help='Maximum p95 latency budget in ms (0 = no limit)')
    parser.add_argument('--output', default=None, help='Output JSON report path')

    args = parser.parse_args()

    bench = ModelBenchmark(
        model_path=args.model_path,
        device=args.device,
        imgsz=args.imgsz
    )

    # Warmup
    bench.run_warmup(iterations=args.warmup)

    # Benchmark
    latency_results = bench.measure_latency(iterations=args.iterations)
    metadata = bench.get_model_metadata()
    report = bench.generate_report(latency_results, metadata, max_latency_ms=args.max_latency_ms)

    # Print summary
    print(f"\n{'='*50}")
    print(f"Benchmark Results:")
    print(f"  Model: {metadata['model_path']} ({metadata['size_mb']} MB)")
    print(f"  Device: {metadata['device']}")
    print(f"  p50: {report['latency']['p50_ms']:.1f}ms")
    print(f"  p95: {report['latency']['p95_ms']:.1f}ms")
    print(f"  p99: {report['latency']['p99_ms']:.1f}ms")
    print(f"  FPS: {report['latency']['fps']:.1f}")
    if args.max_latency_ms > 0:
        status = "PASS" if report['passed'] else "FAIL"
        print(f"  Budget: {args.max_latency_ms}ms -> {status}")
        for reason in report['fail_reasons']:
            print(f"    {reason}")
    print(f"{'='*50}\n")

    # Save report
    output_path = args.output or str(
        Path(args.model_path).parent / 'benchmark_report.json'
    )
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Report saved: {output_path}")

    # Exit with non-zero if budget exceeded (for CI/CD)
    if not report['passed']:
        exit(1)


if __name__ == '__main__':
    main()
