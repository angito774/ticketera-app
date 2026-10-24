#!/usr/bin/env bash
# Ejecuta el seed de eventos (src/db/seed/run.ts) contra RDS desde la EC2: la base no es accesible desde fuera de la VPC.
#
# Uso (en la EC2, o enviado por SSM Run Command):
#   bash seed-ec2.sh --dry-run
#   bash seed-ec2.sh --organizer-emails=a@x.com,b@x.com
#
# Usa la imagen `migrate` del despliegue actual (trae node_modules con tsx) y monta el código fuente de ese mismo
# commit, que se descarga del repositorio público. Lee las variables de /opt/ticketera/.env (generado al desplegar).
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
REPO_URL="${REPO_URL:-https://github.com/angito774/ticketera-app.git}"
APP_DIR=/opt/ticketera
SRC_DIR="$APP_DIR/repo"

APP_IMAGE="$(docker inspect --format '{{.Config.Image}}' ticketera)"
GIT_SHA="${APP_IMAGE##*:}"
MIGRATE_IMAGE="${APP_IMAGE}-migrate"
REGISTRY="${APP_IMAGE%%/*}"

command -v git > /dev/null || dnf install -y git > /dev/null

echo "==> Código fuente del commit ${GIT_SHA:0:7}"
rm -rf "$SRC_DIR"
mkdir -p "$SRC_DIR"
git -C "$SRC_DIR" init -q
git -C "$SRC_DIR" fetch -q --depth 1 "$REPO_URL" "$GIT_SHA"
git -C "$SRC_DIR" checkout -q FETCH_HEAD

echo "==> Imagen $MIGRATE_IMAGE"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" > /dev/null 2>&1
docker pull --quiet "$MIGRATE_IMAGE" > /dev/null

echo "==> Ejecutando el seed $*"
docker run --rm --env-file "$APP_DIR/.env" \
  -v "$SRC_DIR/src:/app/src:ro" \
  -v "$SRC_DIR/tsconfig.json:/app/tsconfig.json:ro" \
  -w /app "$MIGRATE_IMAGE" \
  npx tsx src/db/seed/run.ts "$@"
