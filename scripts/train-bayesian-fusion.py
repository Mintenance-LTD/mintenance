#!/usr/bin/env python3
"""
Bayesian Fusion Training Script

Trains Bayesian Fusion weights using PyMC3 to learn optimal weighting
of evidence from SAM 3, GPT-4, and scene graph features.

Usage:
    python scripts/train-bayesian-fusion.py [--input-csv path/to/shadow-mode-predictions.csv] [--output-json path/to/fusion_weights.json]

Dependencies:
    pip install pymc3 pandas numpy
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import pandas as pd
    import numpy as np
    import pymc3 as pm
    import theano.tensor as tt
except ImportError as e:
    print(f"❌ Missing required dependency: {e}")
    print("   Install with: pip install pymc3 pandas numpy")
    sys.exit(1)


def load_training_data(csv_path: str) -> pd.DataFrame:
    """Load training data from CSV file."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    
    # Validate required columns
    required_cols = ['sam3_confidence', 'gpt4_confidence', 'scene_graph_score', 'y_true']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Validate data
    if len(df) < 50:
        raise ValueError(f"Insufficient training data: {len(df)} samples (minimum 50 required)")

    # Check for NaN values
    if df[required_cols].isna().any().any():
        print("⚠️  Warning: Found NaN values in training data, dropping rows...")
        df = df.dropna(subset=required_cols)

    print(f"✓ Loaded {len(df)} training samples")
    return df


def train_bayesian_fusion_weights(df: pd.DataFrame) -> dict:
    """
    Train Bayesian Fusion weights using PyMC3.
    
    Model:
    - Dirichlet prior for weights (ensures they sum to 1)
    - Linear combination: logit_p = weights[0]*sam3 + weights[1]*gpt4 + weights[2]*scene_graph
    - Likelihood: Bernoulli(y_obs, logit_p=logit_p, observed=y_true)
    """
    print("\n🔬 Training Bayesian Fusion model...")

    # Extract features
    sam3 = df['sam3_confidence'].values
    gpt4 = df['gpt4_confidence'].values
    scene_graph = df['scene_graph_score'].values
    y_true = df['y_true'].values

    # Normalize features to [0, 1] if needed
    sam3 = np.clip(sam3, 0, 1)
    gpt4 = np.clip(gpt4, 0, 1)
    scene_graph = np.clip(scene_graph, 0, 1)

    with pm.Model() as model:
        # Dirichlet prior for weights (ensures they sum to 1)
        # Using uniform Dirichlet (alpha=[1, 1, 1]) for uninformative prior
        weights = pm.Dirichlet('weights', a=np.array([1.0, 1.0, 1.0]))

        # Linear combination: logit_p = w0*sam3 + w1*gpt4 + w2*scene_graph
        logit_p = (
            weights[0] * sam3 +
            weights[1] * gpt4 +
            weights[2] * scene_graph
        )

        # Apply sigmoid to get probability
        p = pm.Deterministic('p', pm.math.sigmoid(logit_p))

        # Likelihood: Bernoulli with observed data
        y_obs = pm.Bernoulli('y_obs', p=p, observed=y_true)

        # Sample from posterior
        print("   Running MCMC sampling (2000 samples, 1000 tune)...")
        trace = pm.sample(
            draws=2000,
            tune=1000,
            cores=2,
            return_inferencedata=False,
            progressbar=True
        )

    # Extract mean weights from trace
    weights_samples = trace['weights']
    mean_weights = weights_samples.mean(axis=0)

    # Normalize to ensure they sum to 1 (should already be close)
    mean_weights = mean_weights / mean_weights.sum()

    result = {
        'sam3': float(mean_weights[0]),
        'gpt4': float(mean_weights[1]),
        'sceneGraph': float(mean_weights[2])
    }

    print(f"\n✓ Training complete!")
    print(f"   Learned weights:")
    print(f"   - SAM 3: {result['sam3']:.4f}")
    print(f"   - GPT-4: {result['gpt4']:.4f}")
    print(f"   - Scene Graph: {result['sceneGraph']:.4f}")
    print(f"   - Sum: {sum(result.values()):.4f}")

    return result


def save_weights(weights: dict, output_path: str):
    """Save weights to JSON file."""
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(weights, f, indent=2)

    print(f"\n✓ Saved weights to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Train Bayesian Fusion weights using PyMC3'
    )
    parser.add_argument(
        '--input-csv',
        type=str,
        default='training-data/shadow-mode-predictions.csv',
        help='Path to training data CSV (default: training-data/shadow-mode-predictions.csv)'
    )
    parser.add_argument(
        '--output-json',
        type=str,
        default='apps/web/lib/services/building-surveyor/fusion_weights.json',
        help='Path to output JSON file (default: apps/web/lib/services/building-surveyor/fusion_weights.json)'
    )

    args = parser.parse_args()

    try:
        # Load training data
        df = load_training_data(args.input_csv)

        # Train weights
        weights = train_bayesian_fusion_weights(df)

        # Save weights
        save_weights(weights, args.output_json)

        print("\n✅ Bayesian Fusion training completed successfully!")
        return 0

    except Exception as e:
        print(f"\n❌ Training failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())

