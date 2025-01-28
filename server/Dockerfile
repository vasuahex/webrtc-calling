# Use the official Node.js 20 image as the base image
FROM node:20

# Install necessary packages for mediasoup and C/C++ components
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    cmake \
    libtool \
    automake \
    git \
    bash \
    libc-dev \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables for mediasoup
ENV MEDIASOUP_SKIP_WORKER_PREBUILT_DOWNLOAD=true
ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production
ENV PORT=9090

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy only package.json and package-lock.json
COPY package*.json ./

# Install production dependencies only
RUN npm install  --only=production

# Copy the compiled application code from the local dist directory
COPY dist ./dist

# Expose the app port
EXPOSE 9090

# Expose the Mediasoup ports for WebRTC transport connections
EXPOSE 10000-10500/udp
EXPOSE 10000-10500/tcp

# Start the application directly
CMD ["node", "dist/index.js"]