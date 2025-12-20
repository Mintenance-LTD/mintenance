# ML Pipeline Infrastructure for Mintenance Building Surveyor

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "s3" {
    bucket = "mintenance-terraform-state"
    key    = "ml-pipeline/terraform.tfstate"
    region = "eu-west-2"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Mintenance"
      Component   = "ML-Pipeline"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# VPC Module
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "mintenance-ml-${var.environment}"
  cidr = var.vpc_cidr

  azs             = data.aws_availability_zones.available.names
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i)]
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 100)]

  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    "kubernetes.io/cluster/mintenance-ml-${var.environment}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/mintenance-ml-${var.environment}" = "shared"
    "kubernetes.io/role/elb"                                 = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/mintenance-ml-${var.environment}" = "shared"
    "kubernetes.io/role/internal-elb"                        = "1"
  }
}

# EKS Cluster for ML Workloads
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "19.15.0"

  cluster_name    = "mintenance-ml-${var.environment}"
  cluster_version = "1.28"

  vpc_id                          = module.vpc.vpc_id
  subnet_ids                      = module.vpc.private_subnets
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Enable IRSA
  enable_irsa = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Node groups
  eks_managed_node_groups = {
    # CPU nodes for general workloads
    general = {
      desired_size = 2
      min_size     = 1
      max_size     = 5

      instance_types = ["t3.large"]

      k8s_labels = {
        Environment = var.environment
        NodeType    = "general"
      }
    }

    # GPU nodes for model training and inference
    gpu = {
      desired_size = 1
      min_size     = 0
      max_size     = 3

      instance_types = ["g4dn.xlarge"]  # NVIDIA T4 GPU

      k8s_labels = {
        Environment = var.environment
        NodeType    = "gpu"
      }

      k8s_taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      # Install NVIDIA device plugin
      user_data = base64encode(<<-EOT
        #!/bin/bash
        /etc/eks/bootstrap.sh mintenance-ml-${var.environment}

        # Install NVIDIA drivers
        sudo yum install -y kernel-devel-$(uname -r) kernel-headers-$(uname -r)
        sudo yum install -y https://developer.download.nvidia.com/compute/cuda/repos/rhel7/x86_64/cuda-repo-rhel7-10.2.89-1.x86_64.rpm
        sudo yum clean all
        sudo yum install -y cuda-drivers

        # Install NVIDIA device plugin
        kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/deployments/static/nvidia-device-plugin.yml
      EOT
      )
    }
  }
}

# S3 Buckets for ML Assets
resource "aws_s3_bucket" "ml_models" {
  bucket = "mintenance-ml-models-${var.environment}"

  tags = {
    Name = "ML Models Storage"
  }
}

resource "aws_s3_bucket" "training_data" {
  bucket = "mintenance-training-data-${var.environment}"

  tags = {
    Name = "Training Data Storage"
  }
}

resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "mintenance-ml-artifacts-${var.environment}"

  tags = {
    Name = "ML Artifacts Storage"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Lifecycle
resource "aws_s3_bucket_lifecycle_configuration" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id

  rule {
    id = "expire-old-artifacts"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ECR Repositories for Model Images
resource "aws_ecr_repository" "yolo_model" {
  name                 = "mintenance/yolo-model"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_repository" "sam3_model" {
  name                 = "mintenance/sam3-model"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_repository" "inference_server" {
  name                 = "mintenance/inference-server"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# SageMaker Execution Role
resource "aws_iam_role" "sagemaker_execution" {
  name = "mintenance-sagemaker-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3_access" {
  name = "sagemaker-s3-access"
  role = aws_iam_role.sagemaker_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.ml_models.arn,
          "${aws_s3_bucket.ml_models.arn}/*",
          aws_s3_bucket.training_data.arn,
          "${aws_s3_bucket.training_data.arn}/*",
          aws_s3_bucket.ml_artifacts.arn,
          "${aws_s3_bucket.ml_artifacts.arn}/*"
        ]
      }
    ]
  })
}

# SageMaker Training Job Configuration
resource "aws_sagemaker_training_job" "yolo_training" {
  count = var.enable_training ? 1 : 0

  training_job_name = "mintenance-yolo-${formatdate("YYYYMMDD-HHmmss", timestamp())}"
  role_arn         = aws_iam_role.sagemaker_execution.arn

  algorithm_specification {
    training_image = "${aws_ecr_repository.yolo_model.repository_url}:latest"
    training_input_mode = "File"
  }

  input_data_config {
    channel_name = "training"
    data_source {
      s3_data_source {
        s3_data_type = "S3Prefix"
        s3_uri       = "s3://${aws_s3_bucket.training_data.bucket}/yolo/"
        s3_data_distribution_type = "FullyReplicated"
      }
    }
  }

  output_data_config {
    s3_output_path = "s3://${aws_s3_bucket.ml_models.bucket}/yolo/outputs"
  }

  resource_config {
    instance_type  = "ml.p3.2xlarge"  # GPU instance
    instance_count = 1
    volume_size_in_gb = 50
  }

  stopping_condition {
    max_runtime_in_seconds = 86400  # 24 hours
  }

  hyper_parameters = {
    epochs     = "100"
    batch_size = "16"
    learning_rate = "0.001"
  }

  tags = {
    Model = "YOLO"
    Purpose = "Building Defect Detection"
  }
}

# Lambda Function for Model Deployment Automation
resource "aws_lambda_function" "model_deployer" {
  function_name = "mintenance-model-deployer-${var.environment}"
  role         = aws_iam_role.lambda_execution.arn
  handler      = "deploy.handler"
  runtime      = "python3.10"
  timeout      = 300
  memory_size  = 512

  filename         = "${path.module}/lambda/deploy.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/deploy.zip")

  environment {
    variables = {
      ENVIRONMENT = var.environment
      EKS_CLUSTER_NAME = module.eks.cluster_name
      MODEL_BUCKET = aws_s3_bucket.ml_models.bucket
      ECR_REPO_INFERENCE = aws_ecr_repository.inference_server.repository_url
    }
  }

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_execution" {
  name = "mintenance-lambda-deployer-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_eks_access" {
  name = "lambda-eks-access"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.ml_models.arn,
          "${aws_s3_bucket.ml_models.arn}/*"
        ]
      }
    ]
  })
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name_prefix = "mintenance-lambda-"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "training_logs" {
  name              = "/aws/sagemaker/mintenance-training-${var.environment}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "inference_logs" {
  name              = "/aws/eks/mintenance-inference-${var.environment}"
  retention_in_days = 30
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "model_error_rate" {
  alarm_name          = "mintenance-model-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "ErrorRate"
  namespace          = "Mintenance/ML"
  period             = "300"
  statistic          = "Average"
  threshold          = "0.05"
  alarm_description  = "This metric monitors model error rate"
  alarm_actions      = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "model_latency" {
  alarm_name          = "mintenance-model-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "InferenceLatency"
  namespace          = "Mintenance/ML"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000"
  alarm_description  = "This metric monitors model inference latency"
  alarm_actions      = [aws_sns_topic.alerts.arn]
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "mintenance-ml-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# EventBridge Rule for Scheduled Training
resource "aws_cloudwatch_event_rule" "training_schedule" {
  name                = "mintenance-training-schedule-${var.environment}"
  description         = "Trigger weekly model training"
  schedule_expression = "cron(0 2 ? * SUN *)"  # Every Sunday at 2 AM UTC
}

resource "aws_cloudwatch_event_target" "training_lambda" {
  rule      = aws_cloudwatch_event_rule.training_schedule.name
  target_id = "TrainingLambda"
  arn       = aws_lambda_function.model_deployer.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.model_deployer.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.training_schedule.arn
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "ml_models_bucket" {
  description = "S3 bucket for ML models"
  value       = aws_s3_bucket.ml_models.bucket
}

output "training_data_bucket" {
  description = "S3 bucket for training data"
  value       = aws_s3_bucket.training_data.bucket
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    yolo_model       = aws_ecr_repository.yolo_model.repository_url
    sam3_model       = aws_ecr_repository.sam3_model.repository_url
    inference_server = aws_ecr_repository.inference_server.repository_url
  }
}

# Variables
variable "enable_training" {
  description = "Enable SageMaker training job"
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
}