#!/usr/bin/env bash
# 简单的前后端管理脚本：一键启动、停止、重启、查看状态与日志
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_DIR="$ROOT"
BACK_DIR="$ROOT/server"
PID_DIR="$ROOT/scripts/.pids"
LOG_DIR="$ROOT/logs"

FRONT_PID_FILE="$PID_DIR/frontend.pid"
BACK_PID_FILE="$PID_DIR/backend.pid"
FRONT_LOG="$LOG_DIR/frontend.log"
BACK_LOG="$LOG_DIR/backend.log"

FRONT_HOST="${FRONT_HOST:-0.0.0.0}"
FRONT_PORT="${FRONT_PORT:-3000}"
BACK_PORT="${BACK_PORT:-3002}"

usage() {
  cat <<'EOF'
用法: scripts/manage.sh <start|stop|restart|status|logs> [frontend|backend|all]

环境变量：
  FRONT_HOST (默认 0.0.0.0)
  FRONT_PORT (默认 3000)
  BACK_PORT  (默认 3002)
  GEMINI_API_KEY 等请放在根目录 .env.local 中由 Vite 读取

示例：
  scripts/manage.sh start        # 后台启动前后端
  scripts/manage.sh restart      # 重启前后端
  scripts/manage.sh status       # 查看运行状态
  scripts/manage.sh logs frontend # 查看前端最近日志
EOF
  exit 1
}

ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  ps -p "$pid" > /dev/null 2>&1
}

start_service() {
  local name="$1" dir="$2" cmd="$3" pid_file="$4" log_file="$5"
  if is_running "$pid_file"; then
    echo "$name 已在运行 (PID $(cat "$pid_file"))"
    return
  fi
  ensure_dirs
  echo "启动 $name ..."
  (cd "$dir" && nohup bash -lc "$cmd" >> "$log_file" 2>&1 & echo $! > "$pid_file")
  sleep 1
  if is_running "$pid_file"; then
    echo "$name 启动成功，日志: $log_file (PID $(cat "$pid_file"))"
  else
    echo "$name 启动失败，查看日志: $log_file"
    exit 1
  fi
}

stop_service() {
  local name="$1" pid_file="$2"
  if ! is_running "$pid_file"; then
    echo "$name 未在运行"
    rm -f "$pid_file"
    return
  fi
  local pid
  pid="$(cat "$pid_file")"
  echo "停止 $name (PID $pid) ..."
  kill "$pid" >/dev/null 2>&1 || true
  for _ in {1..20}; do
    if ! ps -p "$pid" > /dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  if ps -p "$pid" > /dev/null 2>&1; then
    echo "$name 停止超时，请手动 kill $pid"
  else
    echo "$name 已停止"
  fi
  rm -f "$pid_file"
}

status_service() {
  local name="$1" pid_file="$2" log_file="$3"
  if is_running "$pid_file"; then
    echo "$name: 运行中 (PID $(cat "$pid_file"))，日志: $log_file"
  else
    echo "$name: 未运行"
  fi
}

show_logs() {
  local name="$1" log_file="$2" lines="${3:-50}"
  if [[ ! -f "$log_file" ]]; then
    echo "$name 日志不存在: $log_file"
    exit 1
  fi
  tail -n "$lines" "$log_file"
}

start_all() {
  start_service "Frontend" "$FRONT_DIR" "npm run dev -- --host $FRONT_HOST --port $FRONT_PORT" "$FRONT_PID_FILE" "$FRONT_LOG"
  start_service "Backend" "$BACK_DIR" "PORT=$BACK_PORT npm run dev" "$BACK_PID_FILE" "$BACK_LOG"
}

stop_all() {
  stop_service "Frontend" "$FRONT_PID_FILE"
  stop_service "Backend" "$BACK_PID_FILE"
}

case "${1:-}" in
  start)
    case "${2:-all}" in
      frontend) start_service "Frontend" "$FRONT_DIR" "npm run dev -- --host $FRONT_HOST --port $FRONT_PORT" "$FRONT_PID_FILE" "$FRONT_LOG" ;;
      backend) start_service "Backend" "$BACK_DIR" "PORT=$BACK_PORT npm run dev" "$BACK_PID_FILE" "$BACK_LOG" ;;
      all) start_all ;;
      *) usage ;;
    esac
    ;;
  stop)
    case "${2:-all}" in
      frontend) stop_service "Frontend" "$FRONT_PID_FILE" ;;
      backend) stop_service "Backend" "$BACK_PID_FILE" ;;
      all) stop_all ;;
      *) usage ;;
    esac
    ;;
  restart)
    case "${2:-all}" in
      frontend)
        stop_service "Frontend" "$FRONT_PID_FILE"
        start_service "Frontend" "$FRONT_DIR" "npm run dev -- --host $FRONT_HOST --port $FRONT_PORT" "$FRONT_PID_FILE" "$FRONT_LOG"
        ;;
      backend)
        stop_service "Backend" "$BACK_PID_FILE"
        start_service "Backend" "$BACK_DIR" "PORT=$BACK_PORT npm run dev" "$BACK_PID_FILE" "$BACK_LOG"
        ;;
      all)
        stop_all
        start_all
        ;;
      *) usage ;;
    esac
    ;;
  status)
    status_service "Frontend" "$FRONT_PID_FILE" "$FRONT_LOG"
    status_service "Backend" "$BACK_PID_FILE" "$BACK_LOG"
    ;;
  logs)
    case "${2:-}" in
      frontend) show_logs "Frontend" "$FRONT_LOG" "${3:-50}" ;;
      backend) show_logs "Backend" "$BACK_LOG" "${3:-50}" ;;
      *) usage ;;
    esac
    ;;
  *)
    usage
    ;;
esac
