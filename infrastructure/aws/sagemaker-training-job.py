#!/usr/bin/env python3
"""
SageMaker Training Job Configuration for YOLO Model
Optimized for cost-effective spot instance training
"""

import boto3
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker.tuner import HyperparameterTuner, IntegerParameter, ContinuousParameter
import json
from datetime import datetime
import os

# Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
ROLE_ARN = os.environ.get('SAGEMAKER_ROLE_ARN', 'arn:aws:iam::YOUR_ACCOUNT:role/mintenance-ml-sagemaker-role')
S3_BUCKET = os.environ.get('S3_BUCKET', 'mintenance-ml-storage-production')
ECR_IMAGE = os.environ.get('ECR_IMAGE', 'YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/mintenance-ml-training:latest')

class YOLOTrainingJob:
    def __init__(self, job_name=None):
        """Initialize SageMaker training job configuration"""
        self.session = sagemaker.Session()
        self.role = ROLE_ARN
        self.job_name = job_name or f"yolo-training-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    def create_estimator(self, use_spot=True, instance_type='ml.p3.2xlarge'):
        """
        Create SageMaker PyTorch estimator with spot instance support

        Args:
            use_spot: Use spot instances for 70% cost savings
            instance_type: AWS instance type (p3.2xlarge recommended for YOLO)
        """

        estimator = PyTorch(
            entry_point='train.py',
            source_dir='./yolo_dataset_full',
            role=self.role,
            instance_type=instance_type,
            instance_count=1,
            framework_version='2.0',
            py_version='py39',

            # Spot instance configuration
            use_spot_instances=use_spot,
            max_wait=7200 if use_spot else None,  # 2 hours max wait
            max_run=18000,  # 5 hours max runtime

            # Hyperparameters
            hyperparameters={
                'epochs': 300,
                'batch_size': 16,  # Larger batch for GPU
                'learning_rate': 0.001,
                'img_size': 640,
                'device': 'cuda',
                'workers': 4,
                'patience': 50,
                'cache': 'ram',
                'optimizer': 'AdamW',
                'model': 'yolov8m.pt',
                'project': 'maintenance_production',
                'name': 'sagemaker_run',
            },

            # Output configuration
            output_path=f's3://{S3_BUCKET}/training-output',
            code_location=f's3://{S3_BUCKET}/code',

            # Monitoring
            enable_sagemaker_metrics=True,
            metric_definitions=[
                {'Name': 'train:loss', 'Regex': 'box_loss: ([0-9\\.]+)'},
                {'Name': 'train:mAP', 'Regex': 'mAP@50: ([0-9\\.]+)'},
                {'Name': 'train:precision', 'Regex': 'Precision: ([0-9\\.]+)'},
                {'Name': 'train:recall', 'Regex': 'Recall: ([0-9\\.]+)'},
            ],

            tags=[
                {'Key': 'Project', 'Value': 'Mintenance'},
                {'Key': 'Model', 'Value': 'YOLO'},
                {'Key': 'Environment', 'Value': 'Production'},
            ],
        )

        return estimator

    def create_tuning_job(self, estimator):
        """
        Create hyperparameter tuning job for optimal performance
        """

        hyperparameter_ranges = {
            'learning_rate': ContinuousParameter(0.0001, 0.01),
            'batch_size': IntegerParameter(8, 32),
            'patience': IntegerParameter(30, 100),
            'warmup_epochs': IntegerParameter(3, 10),
        }

        objective_metric_name = 'train:mAP'
        objective_type = 'Maximize'

        tuner = HyperparameterTuner(
            estimator,
            objective_metric_name=objective_metric_name,
            objective_type=objective_type,
            hyperparameter_ranges=hyperparameter_ranges,
            max_jobs=10,
            max_parallel_jobs=2,
            strategy='Bayesian',
            early_stopping_type='Auto',
        )

        return tuner

    def start_training(self, data_path, wait=False):
        """
        Start the training job

        Args:
            data_path: S3 path to training data
            wait: Whether to wait for job completion
        """

        # Create estimator
        estimator = self.create_estimator()

        # Define input channels
        inputs = {
            'training': data_path,
            'validation': f'{data_path}/val',
        }

        # Start training
        estimator.fit(inputs, job_name=self.job_name, wait=wait)

        if wait:
            # Deploy model after training
            predictor = estimator.deploy(
                initial_instance_count=1,
                instance_type='ml.m5.xlarge',
                endpoint_name=f'yolo-endpoint-{self.job_name}',
            )
            return predictor

        return estimator

    def get_training_status(self):
        """Check status of running training job"""
        client = boto3.client('sagemaker', region_name=AWS_REGION)

        try:
            response = client.describe_training_job(TrainingJobName=self.job_name)
            return {
                'status': response['TrainingJobStatus'],
                'secondary_status': response.get('SecondaryStatus', 'N/A'),
                'elapsed_time': response.get('TrainingTimeInSeconds', 0),
                'metrics': response.get('FinalMetricDataList', []),
            }
        except Exception as e:
            return {'error': str(e)}

    def download_model(self, local_path='./models'):
        """Download trained model from S3"""
        s3 = boto3.client('s3', region_name=AWS_REGION)

        model_path = f'training-output/{self.job_name}/output/model.tar.gz'
        local_file = f'{local_path}/{self.job_name}_model.tar.gz'

        try:
            s3.download_file(S3_BUCKET, model_path, local_file)
            print(f"Model downloaded to {local_file}")
            return local_file
        except Exception as e:
            print(f"Error downloading model: {e}")
            return None


def main():
    """Example usage"""

    # Initialize training job
    trainer = YOLOTrainingJob()

    # Upload your data to S3 first
    data_s3_path = f's3://{S3_BUCKET}/datasets/yolo-training-data'

    print(f"Starting training job: {trainer.job_name}")
    print(f"Using spot instances for 70% cost savings")
    print(f"Estimated cost: $4.60 (spot) vs $15.30 (on-demand)")

    # Start training (non-blocking)
    estimator = trainer.start_training(data_s3_path, wait=False)

    print(f"Training job started. Monitor progress in SageMaker console.")
    print(f"Job name: {trainer.job_name}")

    # Check status
    status = trainer.get_training_status()
    print(f"Current status: {status}")

    # To wait and deploy after training:
    # predictor = trainer.start_training(data_s3_path, wait=True)
    # print(f"Model deployed to endpoint: {predictor.endpoint_name}")


if __name__ == "__main__":
    main()