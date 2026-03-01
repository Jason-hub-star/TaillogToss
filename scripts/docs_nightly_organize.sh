#!/usr/bin/env bash
set -euo pipefail

export TZ="Asia/Seoul"

BASE_DIR="/sessions/epic-intelligent-davinci/mnt/tosstaillog/docs"
RETENTION_DAYS=7
DRY_RUN=false
RUN_AT="$(date --iso-8601=seconds)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-dir)
      BASE_DIR="$2"
      shift 2
      ;;
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --run-at)
      RUN_AT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

PROJECT_ROOT="$(cd "$BASE_DIR/.." && pwd)"
CLAUDE_FILE="$PROJECT_ROOT/CLAUDE.md"
LOCK_FILE="$BASE_DIR/.docs-nightly.lock"
STATUS_LOG="$BASE_DIR/status/NIGHTLY-RUN-LOG.md"

moved_ref_count=0
moved_status_count=0
moved_daily_count=0
deleted_daily_count=0
any_change=0
errors="none"
declare -a weekly_updated=()
declare -a deleted_daily=()

if [[ -e "$LOCK_FILE" ]]; then
  echo "다른 nightly run 진행 중"
  exit 0
fi

cleanup() {
  rm -f "$LOCK_FILE"
}
trap cleanup EXIT

touch "$LOCK_FILE"

do_mkdir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    any_change=1
    if [[ "$DRY_RUN" == true ]]; then
      echo "[dry-run] mkdir -p $dir"
    else
      mkdir -p "$dir"
    fi
  fi
}

do_move_file() {
  local src="$1"
  local dst="$2"
  local count_var="$3"
  if [[ -f "$src" && ! -f "$dst" ]]; then
    any_change=1
    if [[ "$DRY_RUN" == true ]]; then
      echo "[dry-run] mv $src $dst"
    else
      mv "$src" "$dst"
    fi
    case "$count_var" in
      ref) moved_ref_count=$((moved_ref_count + 1)) ;;
      status) moved_status_count=$((moved_status_count + 1)) ;;
    esac
  fi
}

do_move_dir() {
  local src="$1"
  local dst_parent="$2"
  local base
  base="$(basename "$src")"
  if [[ -d "$src" && ! -d "$dst_parent/$base" ]]; then
    any_change=1
    if [[ "$DRY_RUN" == true ]]; then
      echo "[dry-run] mv $src $dst_parent/"
    else
      mv "$src" "$dst_parent/"
    fi
    moved_daily_count=$((moved_daily_count + 1))
  fi
}

# Step 1: Ensure structure
for dir in ref status daily weekly; do
  do_mkdir "$BASE_DIR/$dir"
done

# Step 2: Move reference files
ref_files=(
  BACKEND-PLAN.md
  SCHEMA-B2B.md
  ASSET-GUIDE.md
  PRD-TailLog-B2B.md
  PRD-TailLog-Toss.md
  10-MIGRATION-OPERATING-MODEL.md
  12-MIGRATION-WAVES-AND-GATES.md
)
for f in "${ref_files[@]}"; do
  do_move_file "$BASE_DIR/$f" "$BASE_DIR/ref/$f" "ref"
done

# Step 3: Move status files
status_files=(
  PROJECT-STATUS.md
  11-FEATURE-PARITY-MATRIX.md
  MISSING-AND-UNIMPLEMENTED.md
)
for f in "${status_files[@]}"; do
  do_move_file "$BASE_DIR/$f" "$BASE_DIR/status/$f" "status"
done

# Step 4: Move date directories to daily
shopt -s nullglob
for dir in "$BASE_DIR"/[0-9]*; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  if [[ "$name" =~ ^[0-9]+-[0-9]+$ ]]; then
    do_move_dir "$dir" "$BASE_DIR/daily"
  fi
done
shopt -u nullglob

# Helper: parse folder date to YYYY-MM-DD using year rollover logic
folder_to_date() {
  local folder_name="$1"
  if [[ ! "$folder_name" =~ ^([0-9]{1,2})-([0-9]{1,2})$ ]]; then
    return 1
  fi

  local mm="${BASH_REMATCH[1]}"
  local dd="${BASH_REMATCH[2]}"
  local this_year
  this_year="$(date +%Y)"

  local candidate
  candidate=$(printf "%04d-%02d-%02d" "$this_year" "$mm" "$dd")
  if ! date -d "$candidate" +%F >/dev/null 2>&1; then
    return 1
  fi

  local today
  today="$(date +%F)"
  if [[ "$candidate" > "$today" ]]; then
    candidate=$(printf "%04d-%02d-%02d" $((this_year - 1)) "$mm" "$dd")
    if ! date -d "$candidate" +%F >/dev/null 2>&1; then
      return 1
    fi
  fi

  echo "$candidate"
}

is_old_enough() {
  local dir_path="$1"
  local folder_name
  folder_name="$(basename "$dir_path")"

  local parsed
  if parsed="$(folder_to_date "$folder_name")"; then
    local now_ts target_ts age_days
    now_ts="$(date +%s)"
    target_ts="$(date -d "$parsed" +%s)"
    age_days=$(((now_ts - target_ts) / 86400))
    [[ "$age_days" -gt "$RETENTION_DAYS" ]]
    return $?
  fi

  find "$dir_path" -maxdepth 0 -type d -mtime "+$RETENTION_DAYS" | grep -q .
}

date_key_for_dir() {
  local dir_path="$1"
  local folder_name
  folder_name="$(basename "$dir_path")"

  local parsed
  if parsed="$(folder_to_date "$folder_name")"; then
    echo "$parsed"
    return 0
  fi

  date -d "@$(stat -c %Y "$dir_path")" +%F
}

summarize_markdown_dir() {
  local dir_path="$1"
  local output="$2"

  local found=false
  shopt -s nullglob
  local md_files=("$dir_path"/*.md)
  shopt -u nullglob

  if [[ ${#md_files[@]} -eq 0 ]]; then
    echo "- No markdown files in this folder." >> "$output"
    return 0
  fi

  for md in "${md_files[@]}"; do
    found=true
    echo "- $(basename "$md")" >> "$output"
    awk 'NR<=120 && ($0 ~ /^#|^- |^\* |^[0-9]+\./) {print "  " $0}' "$md" | sed -n '1,8p' >> "$output"
  done

  if [[ "$found" == false ]]; then
    echo "- No summary points extracted." >> "$output"
  fi
}

# Step 5: weekly compaction
if [[ "$DRY_RUN" == false ]]; then
  mapfile -t old_dirs < <(find "$BASE_DIR/daily" -mindepth 1 -maxdepth 1 -type d | sort)
else
  mapfile -t old_dirs < <(find "$BASE_DIR/daily" -mindepth 1 -maxdepth 1 -type d | sort)
fi

declare -A week_dirs
for d in "${old_dirs[@]}"; do
  if is_old_enough "$d"; then
    dkey="$(date_key_for_dir "$d")"
    week_key="$(date -d "$dkey" +%G-W%V)"
    week_dirs["$week_key"]+="$d"
    week_dirs["$week_key"]+=$'\n'
  fi
done

for week in $(printf '%s\n' "${!week_dirs[@]}" | sort); do
  [[ -n "$week" ]] || continue
  mapfile -t dirs_for_week < <(printf '%s' "${week_dirs[$week]}" | sed '/^$/d' | sort)
  [[ ${#dirs_for_week[@]} -gt 0 ]] || continue

  any_change=1

  week_file="$BASE_DIR/weekly/$week.md"
  tmp_file="$(mktemp)"

  first_date=""
  last_date=""
  declare -A parity_map=()

  for d in "${dirs_for_week[@]}"; do
    dkey="$(date_key_for_dir "$d")"
    if [[ -z "$first_date" || "$dkey" < "$first_date" ]]; then
      first_date="$dkey"
    fi
    if [[ -z "$last_date" || "$dkey" > "$last_date" ]]; then
      last_date="$dkey"
    fi
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && parity_map["$pid"]=1
    done < <(find "$d" -maxdepth 1 -type f -name '*.md' -print0 | xargs -0 -r rg -o "[A-Z]{2,6}-[0-9]{3}" 2>/dev/null | awk '{print $NF}' | sort -u)
  done

  week_year="$(echo "$week" | cut -d- -f1)"
  week_num="$(echo "$week" | cut -dW -f2)"

  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] update $week_file using ${#dirs_for_week[@]} folders"
    weekly_updated+=("$week.md")
    continue
  fi

  if [[ -f "$week_file" ]]; then
    {
      echo
      echo "## Incremental Update ($(date -d "$RUN_AT" +%F))"
      echo
      for d in "${dirs_for_week[@]}"; do
        dkey="$(date_key_for_dir "$d")"
        echo "### $(date -d "$dkey" +%m/%d\ \(%a\))"
        summarize_markdown_dir "$d" "$tmp_file"
        cat "$tmp_file"
        : > "$tmp_file"
        echo
      done
      echo "### Added Parity IDs"
      if [[ ${#parity_map[@]} -eq 0 ]]; then
        echo "- none"
      else
        for pid in $(printf '%s\n' "${!parity_map[@]}" | sort); do
          echo "- $pid"
        done
      fi
      echo
    } >> "$week_file"
  else
    {
      echo "# TaillogToss 주간 작업 로그 — ${week_year}년 $(date -d "$first_date" +%m)월 W${week_num}주차"
      echo
      echo "## 포함 날짜: $(date -d "$first_date" +%m/%d) ~ $(date -d "$last_date" +%m/%d)"
      echo

      for d in "${dirs_for_week[@]}"; do
        dkey="$(date_key_for_dir "$d")"
        echo "### $(date -d "$dkey" +%m/%d\ \(%a\))"
        summarize_markdown_dir "$d" "$tmp_file"
        cat "$tmp_file"
        : > "$tmp_file"
        echo
      done

      echo "## 이번 주 완료 Parity ID"
      if [[ ${#parity_map[@]} -eq 0 ]]; then
        echo "- none"
      else
        for pid in $(printf '%s\n' "${!parity_map[@]}" | sort); do
          echo "- $pid"
        done
      fi
    } > "$week_file"
  fi

  rm -f "$tmp_file"

  if [[ -s "$week_file" ]] && rg -q "^# TaillogToss 주간 작업 로그" "$week_file" && rg -q "^## 포함 날짜:" "$week_file" && rg -q "^## 이번 주 완료 Parity ID" "$week_file"; then
    weekly_updated+=("$week.md")
    for d in "${dirs_for_week[@]}"; do
      deleted_daily+=("$(basename "$d")")
      rm -rf "$d"
      deleted_daily_count=$((deleted_daily_count + 1))
    done
  else
    errors="weekly verification failed: $week_file"
    break
  fi
done

# Step 6: CLAUDE.md path refresh
if [[ -f "$CLAUDE_FILE" ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    :
  else
    sed -i \
      -e 's#docs/PROJECT-STATUS\.md#docs/status/PROJECT-STATUS.md#g' \
      -e 's#docs/11-FEATURE-PARITY-MATRIX\.md#docs/status/11-FEATURE-PARITY-MATRIX.md#g' \
      -e 's#docs/MISSING-AND-UNIMPLEMENTED\.md#docs/status/MISSING-AND-UNIMPLEMENTED.md#g' \
      -e 's#docs/BACKEND-PLAN\.md#docs/ref/BACKEND-PLAN.md#g' \
      -e 's#docs/SCHEMA-B2B\.md#docs/ref/SCHEMA-B2B.md#g' \
      -e 's#docs/ASSET-GUIDE\.md#docs/ref/ASSET-GUIDE.md#g' \
      -e 's#docs/PRD-TailLog-B2B\.md#docs/ref/PRD-TailLog-B2B.md#g' \
      -e 's#docs/PRD-TailLog-Toss\.md#docs/ref/PRD-TailLog-Toss.md#g' \
      -e 's#docs/10-MIGRATION-OPERATING-MODEL\.md#docs/ref/10-MIGRATION-OPERATING-MODEL.md#g' \
      -e 's#docs/12-MIGRATION-WAVES-AND-GATES\.md#docs/ref/12-MIGRATION-WAVES-AND-GATES.md#g' \
      "$CLAUDE_FILE"
  fi
fi

# Step 7: integrity checks
if [[ ! -f "$BASE_DIR/status/PROJECT-STATUS.md" ]]; then
  errors="status/PROJECT-STATUS.md missing"
fi

# Step 8: log append
if [[ "$DRY_RUN" == false ]]; then
  mkdir -p "$(dirname "$STATUS_LOG")"
  if [[ ! -f "$STATUS_LOG" ]]; then
    cat > "$STATUS_LOG" <<'LOGEOF'
# Nightly Run Log

## Runs
LOGEOF
  fi

  {
    echo
    echo "- run_at: $RUN_AT"
    echo "- dry_run: $DRY_RUN"
    echo "- moved_ref_count: $moved_ref_count"
    echo "- moved_status_count: $moved_status_count"
    echo "- moved_daily_count: $moved_daily_count"
    if [[ ${#weekly_updated[@]} -eq 0 ]]; then
      echo "- weekly_created_or_updated: none"
    else
      echo "- weekly_created_or_updated: $(IFS=','; echo "${weekly_updated[*]}")"
    fi
    echo "- deleted_daily_count: $deleted_daily_count"
    echo "- errors: $errors"
  } >> "$STATUS_LOG"
fi

# Final output
if [[ "$moved_ref_count" -eq 0 && "$moved_status_count" -eq 0 && "$moved_daily_count" -eq 0 && "${#weekly_updated[@]}" -eq 0 && "$deleted_daily_count" -eq 0 ]]; then
  echo "변경 없음"
  exit 0
fi

count_files=$(find "$BASE_DIR" -type f | wc -l | tr -d ' ')

echo "[docs/ 정리 완료] $(date +%F) 22:00"
echo "- ref/로 이동: $moved_ref_count개 파일"
echo "- status/로 이동: $moved_status_count개 파일"
echo "- daily/로 이동: $moved_daily_count개 폴더"
if [[ ${#weekly_updated[@]} -eq 0 ]]; then
  echo "- weekly/ 압축: none"
else
  echo "- weekly/ 압축: $(IFS=','; echo "${weekly_updated[*]}") 생성/갱신"
fi
echo "- 삭제된 daily/ 폴더: $deleted_daily_count개"
echo "- 현재 docs/ 파일 수: $count_files개"
