# SAM3 Service for Maintenance App
# Multi-stage build for security and optimized image size

# Stage 1: Builder - install dependencies and download model
FROM python:3.10-slim AS builder

# Install build-time system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    git \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install Python dependencies into a virtual env for clean copy
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    torch==2.1.0 \
    torchvision==0.16.0 \
    segment-anything==1.0 \
    opencv-python-headless==4.8.0.74 \
    numpy==1.24.3 \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    python-multipart==0.0.6 \
    pillow==10.0.0 \
    httpx==0.25.0 \
    pydantic==2.4.2

# Download SAM model weights during build
RUN mkdir -p /build/model_cache && \
    wget -q https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth \
    -O /build/model_cache/sam_vit_h_4b8939.pth

# Stage 2: Runtime - minimal production image
FROM python:3.10-slim

# Install runtime-only system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

# Copy virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy model weights from builder
COPY --from=builder /build/model_cache /app/model_cache

# Copy application code with correct ownership
COPY --chown=appuser:appuser . .

# Create temp directory for any runtime files
RUN mkdir -p /app/temp && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose port
EXPOSE 8001

# Health check using Python stdlib (no requests dependency needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
