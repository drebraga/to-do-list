#!/bin/bash

set -e

ROOT_DIR=$(pwd)
PIDS_FILE="$ROOT_DIR/.pids"

start_service() {
  SERVICE_NAME=$1
  echo "---------------------------------------------"
  echo "📦 Entrando na pasta $SERVICE_NAME..."
  cd "$ROOT_DIR/$SERVICE_NAME"

  echo "📥 Instalando dependências..."
  npm install --silent

  echo "🏗️  Gerando build..."
  npm run build > /dev/null 2>&1

  echo "▶️  Iniciando o serviço $SERVICE_NAME..."
  npm start > /dev/null 2>&1 &
  PID=$!
  echo "$SERVICE_NAME:$PID" >> "$PIDS_FILE"

  cd "$ROOT_DIR"
}

stop_services() {
  if [ -f "$PIDS_FILE" ]; then
    echo "🛑 Encerrando serviços..."
    while IFS=: read -r NAME PID; do
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "Finalizando $NAME (PID $PID)..."
        kill "$PID" 2>/dev/null || true
      fi
    done < "$PIDS_FILE"
    rm -f "$PIDS_FILE"
    echo "✅ Todos os serviços foram encerrados!"
  else
    echo "⚠️  Nenhum serviço rodando (arquivo .pids não encontrado)."
  fi
}

case "$1" in
  up)
    echo "🚀 Iniciando backend e frontend..."
    > "$PIDS_FILE"  # limpa ou cria o arquivo de PIDs
    start_service "backend"
    start_service "frontend"
    echo "---------------------------------------------"
    echo "✅ Todos os serviços foram iniciados!"
    ;;
  down)
    stop_services
    ;;
  *)
    echo "Uso: $0 {up|down}"
    exit 1
    ;;
esac
