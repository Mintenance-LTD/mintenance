#!/usr/bin/env python3
"""
Deploy ML models to production infrastructure with blue-green and canary strategies.
"""

import os
import json
import argparse
import time
import boto3
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import yaml
import docker
from kubernetes import client, config as k8s_config

class ModelDeployer:
    def __init__(self, environment: str, region: str):
        self.environment = environment
        self.region = region
        self.s3_client = boto3.client('s3', region_name=region)
        self.ecr_client = boto3.client('ecr', region_name=region)
        self.ecs_client = boto3.client('ecs', region_name=region)
        self.elb_client = boto3.client('elbv2', region_name=region)
        self.docker_client = docker.from_env()

        # Initialize Kubernetes client if available
        try:
            k8s_config.load_incluster_config()
            self.k8s_apps_v1 = client.AppsV1Api()
            self.k8s_core_v1 = client.CoreV1Api()
            self.use_k8s = True
        except:
            self.use_k8s = False

    def deploy_blue_green(
        self,
        model_package: str,
        service_name: str = 'building-surveyor-inference',
        health_check_url: Optional[str] = None,
        rollback_on_failure: bool = True
    ) -> Dict[str, Any]:
        """Deploy using blue-green strategy."""

        deployment_id = f"{service_name}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        try:
            # Step 1: Prepare new environment (green)
            print(f"Preparing green environment: {deployment_id}")
            green_env = self.prepare_environment(deployment_id, model_package)

            # Step 2: Deploy to green environment
            print(f"Deploying to green environment...")
            green_service = self.deploy_to_environment(
                environment_id=green_env['id'],
                model_package=model_package,
                service_name=f"{service_name}-green"
            )

            # Step 3: Health check green environment
            print("Running health checks on green environment...")
            if health_check_url:
                health_status = self.health_check(
                    url=f"{green_service['endpoint']}/health",
                    timeout=300,
                    interval=10
                )

                if not health_status['healthy']:
                    raise Exception(f"Green environment health check failed: {health_status['error']}")

            # Step 4: Run smoke tests
            print("Running smoke tests...")
            smoke_test_results = self.run_smoke_tests(green_service['endpoint'])

            if not smoke_test_results['passed']:
                raise Exception(f"Smoke tests failed: {smoke_test_results['failures']}")

            # Step 5: Switch traffic to green
            print("Switching traffic to green environment...")
            self.switch_traffic(
                target_group_arn=self.get_target_group_arn(service_name),
                new_targets=green_service['targets']
            )

            # Step 6: Monitor for issues
            print("Monitoring new deployment for 5 minutes...")
            monitoring_results = self.monitor_deployment(
                service_endpoint=green_service['endpoint'],
                duration_seconds=300,
                metrics=['error_rate', 'latency', 'cpu', 'memory']
            )

            if monitoring_results['has_issues']:
                if rollback_on_failure:
                    print("Issues detected, rolling back...")
                    self.rollback_deployment(service_name)
                    raise Exception(f"Deployment rolled back due to: {monitoring_results['issues']}")

            # Step 7: Terminate blue environment (old)
            print("Deployment successful, terminating old environment...")
            self.terminate_old_environment(service_name)

            return {
                'success': True,
                'deployment_id': deployment_id,
                'endpoint': green_service['endpoint'],
                'metrics': monitoring_results['metrics']
            }

        except Exception as e:
            print(f"Deployment failed: {e}")
            if rollback_on_failure:
                self.rollback_deployment(service_name)

            return {
                'success': False,
                'error': str(e),
                'deployment_id': deployment_id
            }

    def deploy_canary(
        self,
        model_package: str,
        service_name: str = 'building-surveyor-inference',
        canary_percentage: int = 10,
        canary_duration_minutes: int = 30,
        auto_promote: bool = True,
        success_threshold: float = 0.95
    ) -> Dict[str, Any]:
        """Deploy using canary strategy."""

        deployment_id = f"canary-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        try:
            # Step 1: Deploy canary version
            print(f"Deploying canary version with {canary_percentage}% traffic...")
            canary_service = self.deploy_canary_version(
                model_package=model_package,
                service_name=service_name,
                traffic_percentage=canary_percentage
            )

            # Step 2: Monitor canary metrics
            print(f"Monitoring canary for {canary_duration_minutes} minutes...")
            start_time = time.time()
            metrics_history = []

            while time.time() - start_time < canary_duration_minutes * 60:
                metrics = self.get_canary_metrics(canary_service['id'])
                metrics_history.append(metrics)

                # Check success rate
                if metrics['success_rate'] < success_threshold:
                    print(f"Canary success rate {metrics['success_rate']} below threshold {success_threshold}")
                    self.rollback_canary(service_name, canary_service['id'])
                    raise Exception("Canary deployment failed quality checks")

                time.sleep(60)  # Check every minute

            # Step 3: Analyze canary performance
            analysis = self.analyze_canary_performance(
                canary_metrics=metrics_history,
                baseline_metrics=self.get_baseline_metrics(service_name)
            )

            # Step 4: Decide on promotion
            if analysis['should_promote'] and auto_promote:
                print("Canary successful, promoting to full deployment...")
                self.promote_canary(service_name, canary_service['id'])
                promotion_status = 'auto_promoted'
            elif analysis['should_promote']:
                print("Canary successful, ready for manual promotion")
                promotion_status = 'ready_for_promotion'
            else:
                print("Canary did not meet promotion criteria")
                self.rollback_canary(service_name, canary_service['id'])
                promotion_status = 'rolled_back'

            return {
                'success': promotion_status != 'rolled_back',
                'deployment_id': deployment_id,
                'promotion_status': promotion_status,
                'canary_metrics': metrics_history,
                'analysis': analysis
            }

        except Exception as e:
            print(f"Canary deployment failed: {e}")
            self.rollback_canary(service_name, deployment_id)
            return {
                'success': False,
                'error': str(e),
                'deployment_id': deployment_id
            }

    def deploy_to_kubernetes(
        self,
        model_package: str,
        namespace: str = 'ml-models',
        deployment_name: str = 'building-surveyor',
        replicas: int = 3
    ) -> Dict[str, Any]:
        """Deploy model to Kubernetes cluster."""

        if not self.use_k8s:
            raise Exception("Kubernetes client not configured")

        # Build container image
        image_tag = self.build_and_push_image(model_package)

        # Create or update deployment
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(name=deployment_name),
            spec=client.V1DeploymentSpec(
                replicas=replicas,
                selector=client.V1LabelSelector(
                    match_labels={"app": deployment_name}
                ),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels={"app": deployment_name}),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name="model-server",
                                image=image_tag,
                                ports=[client.V1ContainerPort(container_port=8080)],
                                resources=client.V1ResourceRequirements(
                                    requests={
                                        "memory": "2Gi",
                                        "cpu": "1",
                                        "nvidia.com/gpu": "1"  # Request GPU
                                    },
                                    limits={
                                        "memory": "4Gi",
                                        "cpu": "2",
                                        "nvidia.com/gpu": "1"
                                    }
                                ),
                                env=[
                                    client.V1EnvVar(name="MODEL_NAME", value=deployment_name),
                                    client.V1EnvVar(name="MODEL_VERSION", value=image_tag.split(':')[-1]),
                                    client.V1EnvVar(name="PORT", value="8080")
                                ],
                                readiness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/health",
                                        port=8080
                                    ),
                                    initial_delay_seconds=30,
                                    period_seconds=10
                                ),
                                liveness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/health",
                                        port=8080
                                    ),
                                    initial_delay_seconds=60,
                                    period_seconds=30
                                )
                            )
                        ]
                    )
                )
            )
        )

        try:
            # Try to update existing deployment
            api_response = self.k8s_apps_v1.patch_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
                body=deployment
            )
            print(f"Deployment {deployment_name} updated")
        except client.exceptions.ApiException as e:
            if e.status == 404:
                # Create new deployment
                api_response = self.k8s_apps_v1.create_namespaced_deployment(
                    namespace=namespace,
                    body=deployment
                )
                print(f"Deployment {deployment_name} created")
            else:
                raise

        # Wait for rollout to complete
        self.wait_for_rollout(deployment_name, namespace)

        return {
            'deployment_name': deployment_name,
            'namespace': namespace,
            'image': image_tag,
            'replicas': replicas
        }

    def build_and_push_image(self, model_package: str) -> str:
        """Build Docker image and push to ECR."""

        # Extract model package
        extract_dir = Path('/tmp/model_extract')
        extract_dir.mkdir(exist_ok=True)
        os.system(f"tar -xzf {model_package} -C {extract_dir}")

        # Generate Dockerfile if not exists
        dockerfile_path = extract_dir / 'Dockerfile'
        if not dockerfile_path.exists():
            self.generate_dockerfile(dockerfile_path, extract_dir)

        # Build image
        image_name = f"building-surveyor-{self.environment}"
        version_hash = hashlib.md5(open(model_package, 'rb').read()).hexdigest()[:8]
        image_tag = f"{image_name}:{version_hash}"

        print(f"Building Docker image: {image_tag}")
        image, build_logs = self.docker_client.images.build(
            path=str(extract_dir),
            tag=image_tag,
            buildargs={
                'MODEL_PATH': '/app/model',
                'PORT': '8080'
            }
        )

        # Push to ECR
        ecr_uri = self.get_or_create_ecr_repository(image_name)
        full_image_tag = f"{ecr_uri}:{version_hash}"

        # Tag for ECR
        image.tag(ecr_uri, version_hash)

        # Get ECR login token
        token = self.ecr_client.get_authorization_token()
        registry_data = token['authorizationData'][0]
        registry_url = registry_data['proxyEndpoint']

        # Push image
        print(f"Pushing image to ECR: {full_image_tag}")
        push_response = self.docker_client.images.push(
            repository=ecr_uri,
            tag=version_hash,
            auth_config={
                'username': 'AWS',
                'password': registry_data['authorizationToken']
            }
        )

        return full_image_tag

    def generate_dockerfile(self, dockerfile_path: Path, model_dir: Path):
        """Generate Dockerfile for model serving."""

        dockerfile_content = """
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    libglib2.0-0 \\
    libsm6 \\
    libxext6 \\
    libxrender-dev \\
    libgomp1 \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \\
    fastapi \\
    uvicorn \\
    ultralytics \\
    torch torchvision --index-url https://download.pytorch.org/whl/cpu \\
    pillow \\
    numpy \\
    opencv-python-headless

# Copy model files
COPY . /app
WORKDIR /app

# Create inference server
RUN echo 'from fastapi import FastAPI, File, UploadFile\\n\
from fastapi.responses import JSONResponse\\n\
from ultralytics import YOLO\\n\
import io\\n\
from PIL import Image\\n\
import os\\n\
\\n\
app = FastAPI()\\n\
model = YOLO("/app/model/best.pt")\\n\
\\n\
@app.get("/health")\\n\
async def health():\\n\
    return {"status": "healthy"}\\n\
\\n\
@app.post("/predict")\\n\
async def predict(file: UploadFile = File(...)):\\n\
    contents = await file.read()\\n\
    img = Image.open(io.BytesIO(contents))\\n\
    results = model(img)\\n\
    return JSONResponse(content={"predictions": results[0].tojson()})\\n\
' > /app/server.py

# Expose port
EXPOSE 8080

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
"""

        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile_content)

    def get_or_create_ecr_repository(self, repository_name: str) -> str:
        """Get or create ECR repository."""

        try:
            response = self.ecr_client.describe_repositories(
                repositoryNames=[repository_name]
            )
            return response['repositories'][0]['repositoryUri']
        except self.ecr_client.exceptions.RepositoryNotFoundException:
            # Create repository
            response = self.ecr_client.create_repository(
                repositoryName=repository_name,
                imageScanningConfiguration={'scanOnPush': True},
                encryptionConfiguration={'encryptionType': 'AES256'}
            )
            return response['repository']['repositoryUri']

    def health_check(
        self,
        url: str,
        timeout: int = 300,
        interval: int = 10
    ) -> Dict[str, Any]:
        """Perform health check on deployed service."""

        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    return {
                        'healthy': True,
                        'response_time': response.elapsed.total_seconds(),
                        'status_code': response.status_code
                    }
            except Exception as e:
                pass

            time.sleep(interval)

        return {
            'healthy': False,
            'error': 'Health check timeout'
        }

    def run_smoke_tests(self, endpoint: str) -> Dict[str, Any]:
        """Run smoke tests on deployed model."""

        test_results = {
            'passed': True,
            'tests': [],
            'failures': []
        }

        # Test 1: Basic inference
        try:
            # Use a test image
            test_image_path = Path(__file__).parent / 'test_data' / 'test_image.jpg'
            if not test_image_path.exists():
                # Create a dummy test image
                from PIL import Image
                import numpy as np
                img = Image.fromarray(np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8))
                test_image_path.parent.mkdir(exist_ok=True)
                img.save(test_image_path)

            with open(test_image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{endpoint}/predict", files=files, timeout=30)

            if response.status_code == 200:
                test_results['tests'].append({
                    'name': 'basic_inference',
                    'passed': True,
                    'response_time': response.elapsed.total_seconds()
                })
            else:
                test_results['passed'] = False
                test_results['failures'].append(f"Inference returned {response.status_code}")

        except Exception as e:
            test_results['passed'] = False
            test_results['failures'].append(f"Inference test failed: {e}")

        # Test 2: Batch inference
        # Test 3: Edge cases
        # Add more tests as needed

        return test_results

    def monitor_deployment(
        self,
        service_endpoint: str,
        duration_seconds: int = 300,
        metrics: List[str] = ['error_rate', 'latency']
    ) -> Dict[str, Any]:
        """Monitor deployment for issues."""

        monitoring_data = {
            'has_issues': False,
            'issues': [],
            'metrics': {}
        }

        # Simple monitoring - in production, integrate with CloudWatch/Datadog
        start_time = time.time()
        error_count = 0
        request_count = 0
        latencies = []

        while time.time() - start_time < duration_seconds:
            try:
                response = requests.get(f"{service_endpoint}/health", timeout=5)
                request_count += 1

                if response.status_code != 200:
                    error_count += 1

                latencies.append(response.elapsed.total_seconds())

            except Exception:
                error_count += 1
                request_count += 1

            time.sleep(10)

        # Calculate metrics
        error_rate = error_count / max(request_count, 1)
        avg_latency = sum(latencies) / max(len(latencies), 1)

        monitoring_data['metrics'] = {
            'error_rate': error_rate,
            'avg_latency': avg_latency,
            'p99_latency': sorted(latencies)[int(len(latencies) * 0.99)] if latencies else 0
        }

        # Check thresholds
        if error_rate > 0.05:
            monitoring_data['has_issues'] = True
            monitoring_data['issues'].append(f"High error rate: {error_rate:.2%}")

        if avg_latency > 1.0:
            monitoring_data['has_issues'] = True
            monitoring_data['issues'].append(f"High latency: {avg_latency:.2f}s")

        return monitoring_data

    def rollback_deployment(self, service_name: str):
        """Rollback to previous deployment."""
        # Implementation depends on your infrastructure
        print(f"Rolling back {service_name} to previous version...")

    def get_target_group_arn(self, service_name: str) -> str:
        """Get target group ARN for service."""
        # Implementation specific to your AWS setup
        pass

    def switch_traffic(self, target_group_arn: str, new_targets: List[str]):
        """Switch traffic to new targets."""
        # Implementation specific to your AWS setup
        pass


def main():
    parser = argparse.ArgumentParser(description='Deploy ML model to production')
    parser.add_argument('--model-package', required=True, help='Path to model package')
    parser.add_argument('--environment', required=True, choices=['staging', 'canary', 'production'])
    parser.add_argument('--region', required=True, help='AWS region')
    parser.add_argument('--deployment-strategy', choices=['blue-green', 'canary', 'rolling'],
                       default='canary')
    parser.add_argument('--canary-percentage', type=int, default=10,
                       help='Percentage of traffic for canary')
    parser.add_argument('--health-check-url', help='Health check URL')

    args = parser.parse_args()

    deployer = ModelDeployer(args.environment, args.region)

    if args.deployment_strategy == 'blue-green':
        result = deployer.deploy_blue_green(
            model_package=args.model_package,
            health_check_url=args.health_check_url
        )
    elif args.deployment_strategy == 'canary':
        result = deployer.deploy_canary(
            model_package=args.model_package,
            canary_percentage=args.canary_percentage
        )
    else:
        # Rolling update via Kubernetes
        result = deployer.deploy_to_kubernetes(
            model_package=args.model_package
        )

    print(json.dumps(result, indent=2))
    return 0 if result.get('success', False) else 1


if __name__ == '__main__':
    exit(main())