# SAM3 Service for Maintenance App
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    git \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir \
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

# Download SAM3 model weights
RUN mkdir -p /models/sam3 && \
    wget -q https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth \
    -O /models/sam3/sam_vit_h_4b8939.pth

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]