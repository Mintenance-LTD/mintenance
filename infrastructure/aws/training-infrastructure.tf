# AWS Infrastructure for YOLO Training Pipeline
# Terraform configuration for ML training infrastructure

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"

  backend "s3" {
    bucket = "mintenance-terraform-state"
    key    = "training-infrastructure/terraform.tfstate"
    region = "eu-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "mintenance-ml"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "production"
}

variable "alert_email" {
  description = "Email address for training notifications"
  type        = string
  sensitive   = true
}

# S3 Bucket for Training Data and Models
resource "aws_s3_bucket" "ml_storage" {
  bucket = "${var.project_name}-ml-storage-${var.environment}"

  tags = {
    Name        = "${var.project_name}-ml-storage"
    Environment = var.environment
    Purpose     = "ML Training Data and Models"
  }
}

resource "aws_s3_bucket_versioning" "ml_storage_versioning" {
  bucket = aws_s3_bucket.ml_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ml_storage_lifecycle" {
  bucket = aws_s3_bucket.ml_storage.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}

# IAM Role for SageMaker
resource "aws_iam_role" "sagemaker_role" {
  name = "${var.project_name}-sagemaker-role"

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
  role       = aws_iam_role.sagemaker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3_access" {
  name = "${var.project_name}-sagemaker-s3-access"
  role = aws_iam_role.sagemaker_role.id

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
          aws_s3_bucket.ml_storage.arn,
          "${aws_s3_bucket.ml_storage.arn}/*"
        ]
      }
    ]
  })
}

# ECR Repository for Custom Training Images
resource "aws_ecr_repository" "training_images" {
  name                 = "${var.project_name}-training"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-training-images"
    Environment = var.environment
  }
}

# VPC for Training (Optional - for network isolation)
resource "aws_vpc" "training_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-training-vpc"
  }
}

resource "aws_subnet" "training_subnet" {
  vpc_id                  = aws_vpc.training_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-training-subnet"
  }
}

resource "aws_internet_gateway" "training_igw" {
  vpc_id = aws_vpc.training_vpc.id

  tags = {
    Name = "${var.project_name}-training-igw"
  }
}

resource "aws_route_table" "training_routes" {
  vpc_id = aws_vpc.training_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.training_igw.id
  }

  tags = {
    Name = "${var.project_name}-training-routes"
  }
}

resource "aws_route_table_association" "training_route_association" {
  subnet_id      = aws_subnet.training_subnet.id
  route_table_id = aws_route_table.training_routes.id
}

# Security Group for Training Instances
resource "aws_security_group" "training_sg" {
  name        = "${var.project_name}-training-sg"
  description = "Security group for ML training instances"
  vpc_id      = aws_vpc.training_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-training-sg"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# CloudWatch Log Group for Training Logs
resource "aws_cloudwatch_log_group" "training_logs" {
  name              = "/aws/sagemaker/${var.project_name}-training"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-training-logs"
    Environment = var.environment
  }
}

# SNS Topic for Training Notifications
resource "aws_sns_topic" "training_notifications" {
  name = "${var.project_name}-training-notifications"

  tags = {
    Name        = "${var.project_name}-training-notifications"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "training_email" {
  topic_arn = aws_sns_topic.training_notifications.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Outputs
output "s3_bucket_name" {
  value       = aws_s3_bucket.ml_storage.id
  description = "Name of the S3 bucket for ML storage"
}

output "sagemaker_role_arn" {
  value       = aws_iam_role.sagemaker_role.arn
  description = "ARN of the SageMaker IAM role"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.training_images.repository_url
  description = "URL of the ECR repository for training images"
}

output "vpc_id" {
  value       = aws_vpc.training_vpc.id
  description = "ID of the training VPC"
}

output "subnet_id" {
  value       = aws_subnet.training_subnet.id
  description = "ID of the training subnet"
}

output "security_group_id" {
  value       = aws_security_group.training_sg.id
  description = "ID of the training security group"
}