#!/usr/bin/env bash
# Despliegue en la EC2 de Ticketera. Lo envía GitHub Actions por SSM Run Command; se ejecuta en la instancia.
#
# Variables requeridas: IMAGE_TAG, ECR_REGISTRY, ECR_REPOSITORY. Opcional: AWS_REGION (us-east-2).
# Flujo: login ECR -> pull -> .env desde Parameter Store -> migraciones -> reinicio -> health check (con rollback).
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
REGISTRY="${ECR_REGISTRY:?ECR_REGISTRY requerido}"
REPOSITORY="${ECR_REPOSITORY:?ECR_REPOSITORY requerido}"
TAG="${IMAGE_TAG:?IMAGE_TAG requerido}"
APP_IMAGE="${REGISTRY}/${REPOSITORY}:${TAG}"
MIGRATE_IMAGE="${REGISTRY}/${REPOSITORY}:${TAG}-migrate"
APP_DIR=/opt/ticketera
CONTAINER=ticketera

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "==> Login en ECR"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Descargando imágenes ($TAG)"
docker pull --quiet "$APP_IMAGE"
docker pull --quiet "$MIGRATE_IMAGE"

echo "==> Generando .env desde Parameter Store (/ticketera/*)"
umask 077
aws ssm get-parameters-by-path --path /ticketera --with-decryption --region "$REGION" \
  --query 'Parameters[].[Name,Value]' --output text \
  | awk -F'\t' '{ n=$1; sub(".*/", "", n); if (n != "DB_PASSWORD") print n "=" $2 }' > .env.new
mv .env.new .env
echo "    $(wc -l < .env) variables"

echo "==> Aplicando migraciones"
docker run --rm --env-file .env "$MIGRATE_IMAGE"

PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true)"

run_app() {
  docker run -d --name "$CONTAINER" --restart unless-stopped \
    --env-file .env -p 3000:3000 \
    --memory 700m \
    -e NODE_OPTIONS=--max-old-space-size=450 \
    --log-driver awslogs \
    --log-opt awslogs-region="$REGION" \
    --log-opt awslogs-group=/ticketera/app \
    "$1" > /dev/null
}

wait_healthy() {
  for _ in $(seq 1 40); do
    if curl -fsS --max-time 4 http://127.0.0.1:3000/api/health > /dev/null 2>&1; then return 0; fi
    sleep 3
  done
  return 1
}

echo "==> Reiniciando el contenedor"
docker rm -f "$CONTAINER" placeholder > /dev/null 2>&1 || true
run_app "$APP_IMAGE"

if wait_healthy; then
  echo "==> OK: $APP_IMAGE responde en /api/health"
else
  echo "==> FALLO: la app no respondió. Últimos logs:"
  docker logs --tail 80 "$CONTAINER" || true
  docker rm -f "$CONTAINER" > /dev/null 2>&1 || true
  if [ -n "$PREVIOUS_IMAGE" ] && [ "$PREVIOUS_IMAGE" != "$APP_IMAGE" ]; then
    echo "==> Rollback a $PREVIOUS_IMAGE"
    run_app "$PREVIOUS_IMAGE" || true
  fi
  exit 1
fi

echo "==> Limpiando imágenes sin uso"
docker image prune -af > /dev/null
docker ps --format 'contenedor {{.Names}}: {{.Image}} ({{.Status}})'
