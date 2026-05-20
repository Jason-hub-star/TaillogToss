#!/usr/bin/env python3
"""iPhone Mirroring 창 캡처 헬퍼 — AIT iOS QA 루프용"""
import subprocess, sys, os
from PIL import ImageGrab

IPHONE_MIRROR = {"x": 833, "y": 101, "w": 326, "h": 720}

def capture(out_path: str = "/tmp/iphone_current.png") -> str:
    pos = subprocess.run(
        ["osascript", "-e", 'tell application "System Events" to tell process "iPhone Mirroring" to get {position, size} of window 1'],
        capture_output=True, text=True
    )
    if pos.returncode == 0 and pos.stdout.strip():
        vals = [int(v.strip()) for v in pos.stdout.strip().split(",")]
        x, y, w, h = vals[0], vals[1], vals[2], vals[3]
    else:
        x, y, w, h = IPHONE_MIRROR["x"], IPHONE_MIRROR["y"], IPHONE_MIRROR["w"], IPHONE_MIRROR["h"]

    # screencapture -R: 포커스 이동 없이 특정 영역 캡처
    subprocess.run(["screencapture", "-R", f"{x},{y},{w},{h}", out_path], check=True)
    return out_path

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/iphone_current.png"
    path = capture(out)
    print(f"captured: {path}")
