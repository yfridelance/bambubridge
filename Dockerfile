# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better caching
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.12.9-slim-bookworm

# permissions and nonroot user for tightened security
RUN adduser --disabled-login nonroot
RUN mkdir /home/app/ && chown -R nonroot:nonroot /home/app
RUN mkdir /home/app/logs/ && chown -R nonroot:nonroot /home/app/logs
RUN mkdir /home/app/data/ && chown -R nonroot:nonroot /home/app/data
RUN mkdir -p /home/app/static/prints && chown -R nonroot:nonroot /home/app/static/prints
RUN mkdir -p /var/log/flask-app && touch /var/log/flask-app/flask-app.err.log && touch /var/log/flask-app/flask-app.out.log
RUN chown -R nonroot:nonroot /var/log/flask-app
WORKDIR /home/app
USER nonroot

# Copy Python application files (excluding frontend source)
COPY --chown=nonroot:nonroot *.py ./
COPY --chown=nonroot:nonroot requirements.txt ./
COPY --chown=nonroot:nonroot api/ ./api/
COPY --chown=nonroot:nonroot templates/ ./templates/
COPY --chown=nonroot:nonroot static/ ./static/
COPY --chown=nonroot:nonroot scripts/ ./scripts/

# Copy the built frontend from the first stage
COPY --from=frontend-builder --chown=nonroot:nonroot /frontend/dist ./frontend/dist

# venv
ENV VIRTUAL_ENV=/home/app/venv

# python setup
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# define the port number the container should expose
EXPOSE 8000

CMD ["gunicorn", "-w", "1", "--threads", "4", "-b", "0.0.0.0:8000", "app:app"]
