#!/usr/bin/env python3
"""
Photo Renamer Tool
Usage: python3 photo-renamer.py "/path/to/photo/folder"
Opens a local web UI to match names to photos and rename them.
"""

import sys
import os
import json
import urllib.parse
import webbrowser
import io
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from pathlib import Path
from PIL import Image

PHOTO_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}
PORT = 8765

def get_photo_folder():
    if len(sys.argv) < 2:
        print("Usage: python3 photo-renamer.py \"/path/to/photo/folder\"")
        print("\nAvailable folders under 活動資料/:")
        base = Path(os.path.expanduser("~/Library/CloudStorage/Dropbox/1121121-宗教文創平台/香供養/活動資料"))
        if base.exists():
            for d in sorted(base.iterdir()):
                if d.is_dir():
                    print(f"  {d.name}/")
                    for sub in sorted(d.iterdir()):
                        if sub.is_dir():
                            print(f"    {sub.name}/")
                            for subsub in sorted(sub.iterdir()):
                                if subsub.is_dir():
                                    print(f"      {subsub.name}/")
        sys.exit(1)
    folder = Path(sys.argv[1])
    if not folder.exists():
        print(f"Error: folder not found: {folder}")
        sys.exit(1)
    return folder

PHOTO_FOLDER = get_photo_folder()

def list_photos():
    photos = []
    for f in sorted(PHOTO_FOLDER.iterdir()):
        if f.suffix.lower() in PHOTO_EXTENSIONS:
            photos.append(f.name)
    return photos

THUMB_CACHE = {}

def get_thumbnail_bytes(filename):
    """Generate thumbnail using Pillow (works with Dropbox cloud storage)."""
    if filename in THUMB_CACHE:
        return THUMB_CACHE[filename]
    filepath = PHOTO_FOLDER / filename
    try:
        img = Image.open(filepath)
        img.thumbnail((600, 800), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=75)
        data = buf.getvalue()
        THUMB_CACHE[filename] = data
        return data
    except Exception as e:
        print(f"  Thumb error for {filename}: {e}")
        return None

HTML_PAGE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Photo Renamer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1a1a2e; color: #eee; }

.header {
    background: #16213e;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #e94560;
}
.header h1 { font-size: 20px; color: #e94560; }
.header .info { font-size: 14px; color: #999; }

.main { display: flex; height: calc(100vh - 60px); }

/* Left panel - name list */
.left-panel {
    width: 320px;
    background: #16213e;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
}
.name-input-area { padding: 12px; border-bottom: 1px solid #333; }
.name-input-area textarea {
    width: 100%;
    height: 120px;
    background: #0f3460;
    color: #eee;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 8px;
    font-size: 13px;
    resize: vertical;
}
.name-input-area button {
    margin-top: 8px;
    width: 100%;
    padding: 8px;
    background: #e94560;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
}
.name-input-area button:hover { background: #c73e54; }

.name-list { flex: 1; overflow-y: auto; padding: 8px; }
.name-item {
    padding: 10px 12px;
    margin: 4px 0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
}
.name-item:hover { background: #0f3460; }
.name-item.active { background: #e94560; color: white; font-weight: bold; font-size: 16px; }
.name-item.done { background: #1b4332; color: #95d5b2; text-decoration: line-through; opacity: 0.7; }
.name-item .status { width: 20px; text-align: center; }

/* Right panel - photo grid */
.right-panel { flex: 1; display: flex; flex-direction: column; }
.current-target {
    padding: 20px 24px;
    background: #0f3460;
    border-bottom: 1px solid #333;
    text-align: center;
}
.current-target .label { font-size: 14px; color: #999; margin-bottom: 4px; }
.current-target .name {
    font-size: 36px;
    font-weight: bold;
    color: #e94560;
    letter-spacing: 4px;
}
.current-target .hint { font-size: 13px; color: #666; margin-top: 4px; }

.photo-grid {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    align-content: start;
}
.photo-card {
    background: #16213e;
    border: 2px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}
.photo-card:hover { border-color: #e94560; transform: scale(1.02); }
.photo-card.used { opacity: 0.3; pointer-events: none; border-color: #1b4332; }
.photo-card img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 400px;
    border-radius: 6px 6px 0 0;
}
.photo-card .filename {
    padding: 6px 8px;
    font-size: 11px;
    color: #999;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Undo bar */
.undo-bar {
    padding: 12px 24px;
    background: #1b4332;
    border-top: 1px solid #333;
    display: none;
    align-items: center;
    justify-content: space-between;
}
.undo-bar.show { display: flex; }
.undo-bar button {
    padding: 6px 16px;
    background: #e94560;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* Skip button */
.skip-btn {
    margin-top: 8px;
    padding: 6px 16px;
    background: #444;
    color: #ccc;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
}
.skip-btn:hover { background: #555; }

/* Done overlay */
.done-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 100;
}
.done-overlay.show { display: flex; }
.done-overlay h2 { font-size: 48px; color: #95d5b2; margin-bottom: 16px; }
.done-overlay p { font-size: 18px; color: #ccc; }
</style>
</head>
<body>

<div class="header">
    <h1>Photo Renamer</h1>
    <div class="info">
        <span id="folder-path"></span> |
        Progress: <span id="progress">0/0</span>
    </div>
</div>

<div class="main">
    <div class="left-panel">
        <div class="name-input-area">
            <textarea id="nameInput" placeholder="Paste name list here, one per line...&#10;Example:&#10;1-Name1&#10;2-Name2&#10;3-Name3"></textarea>
            <button onclick="loadNames()">Load Names</button>
        </div>
        <div class="name-list" id="nameList"></div>
    </div>

    <div class="right-panel">
        <div class="current-target">
            <div class="label">Current target name:</div>
            <div class="name" id="currentName">-- Paste name list to start --</div>
            <div class="hint">Click on the matching photo below</div>
            <button class="skip-btn" onclick="skipCurrent()">Skip this one</button>
        </div>
        <div class="photo-grid" id="photoGrid"></div>
    </div>
</div>

<div class="undo-bar" id="undoBar">
    <span id="undoMsg"></span>
    <button onclick="undoLast()">Undo</button>
</div>

<div class="done-overlay" id="doneOverlay">
    <h2>All Done!</h2>
    <p id="doneSummary"></p>
</div>

<script>
let names = [];
let photos = [];
let currentIndex = 0;
let renamedMap = {};  // original -> new name
let history = [];     // for undo
const PAGE_SIZE = 12;
let visibleCount = PAGE_SIZE;

async function init() {
    document.getElementById('folder-path').textContent = await (await fetch('/api/folder')).text();
    await loadPhotos();
}

async function loadPhotos() {
    const res = await fetch('/api/photos');
    photos = await res.json();
    renderPhotos();
}

function loadNames() {
    const text = document.getElementById('nameInput').value.trim();
    if (!text) return;
    names = text.split('\\n').map(s => s.trim()).filter(s => s.length > 0);
    currentIndex = 0;
    renamedMap = {};
    history = [];
    renderNames();
    renderCurrent();
    updateProgress();
}

function renderNames() {
    const container = document.getElementById('nameList');
    container.innerHTML = '';
    names.forEach((name, i) => {
        const div = document.createElement('div');
        div.className = 'name-item' + (i === currentIndex ? ' active' : '') + (renamedMap[name] ? ' done' : '');
        div.innerHTML = '<span class="status">' + (renamedMap[name] ? '✅' : (i === currentIndex ? '👉' : '⬜')) + '</span>' + name;
        div.onclick = () => {
            if (!renamedMap[name]) {
                currentIndex = i;
                renderNames();
                renderCurrent();
            }
        };
        container.appendChild(div);
    });
    // scroll active into view
    const active = container.querySelector('.active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function renderCurrent() {
    const el = document.getElementById('currentName');
    if (currentIndex < names.length) {
        el.textContent = names[currentIndex];
    } else {
        el.textContent = '-- All done! --';
        showDone();
    }
}

function renderPhotos() {
    const container = document.getElementById('photoGrid');
    container.innerHTML = '';
    const toShow = photos.slice(0, visibleCount);
    toShow.forEach(photo => {
        const used = Object.values(renamedMap).includes(photo);
        const card = document.createElement('div');
        card.className = 'photo-card' + (used ? ' used' : '');
        card.innerHTML = '<img src="/api/thumb/' + encodeURIComponent(photo) + '"><div class="filename">' + photo + '</div>';
        if (!used) {
            card.onclick = () => renamePhoto(photo);
        }
        container.appendChild(card);
    });
    // Load more button
    if (visibleCount < photos.length) {
        const more = document.createElement('div');
        more.style.cssText = 'grid-column: 1/-1; text-align:center; padding:16px;';
        more.innerHTML = '<button onclick="loadMore()" style="padding:10px 32px;background:#e94560;color:white;border:none;border-radius:6px;cursor:pointer;font-size:15px;">Load more (' + (photos.length - visibleCount) + ' remaining)</button>';
        container.appendChild(more);
    }
}

function loadMore() {
    visibleCount += PAGE_SIZE;
    renderPhotos();
}

async function renamePhoto(originalName) {
    if (currentIndex >= names.length) return;
    const targetName = names[currentIndex];
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const newName = targetName + ext;

    const res = await fetch('/api/rename', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ original: originalName, newName: newName })
    });

    if (res.ok) {
        history.push({ name: targetName, original: originalName, newName: newName });
        renamedMap[targetName] = originalName;

        // Update photo list
        const idx = photos.indexOf(originalName);
        if (idx >= 0) photos[idx] = newName;

        // Show undo
        showUndo(targetName + ' -> ' + newName);

        // Move to next undone
        moveToNextUndone();
        renderNames();
        renderCurrent();
        renderPhotos();
        updateProgress();
    } else {
        alert('Rename failed: ' + await res.text());
    }
}

function moveToNextUndone() {
    for (let i = currentIndex + 1; i < names.length; i++) {
        if (!renamedMap[names[i]]) {
            currentIndex = i;
            return;
        }
    }
    // check from beginning
    for (let i = 0; i < names.length; i++) {
        if (!renamedMap[names[i]]) {
            currentIndex = i;
            return;
        }
    }
    currentIndex = names.length; // all done
}

function skipCurrent() {
    moveToNextUndone();
    renderNames();
    renderCurrent();
}

async function undoLast() {
    if (history.length === 0) return;
    const last = history.pop();

    const res = await fetch('/api/rename', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ original: last.newName, newName: last.original })
    });

    if (res.ok) {
        delete renamedMap[last.name];
        const idx = photos.indexOf(last.newName);
        if (idx >= 0) photos[idx] = last.original;
        currentIndex = names.indexOf(last.name);
        renderNames();
        renderCurrent();
        renderPhotos();
        updateProgress();
        hideUndo();
    }
}

function showUndo(msg) {
    document.getElementById('undoMsg').textContent = '✅ ' + msg;
    document.getElementById('undoBar').classList.add('show');
    setTimeout(() => hideUndo(), 5000);
}
function hideUndo() { document.getElementById('undoBar').classList.remove('show'); }

function updateProgress() {
    const done = Object.keys(renamedMap).length;
    document.getElementById('progress').textContent = done + '/' + names.length;
}

function showDone() {
    const done = Object.keys(renamedMap).length;
    const skipped = names.length - done;
    document.getElementById('doneSummary').textContent =
        'Renamed ' + done + ' photos' + (skipped > 0 ? ', skipped ' + skipped : '');
    document.getElementById('doneOverlay').classList.add('show');
}

init();
</script>
</body>
</html>
"""

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress logs

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode('utf-8'))

        elif self.path == '/api/folder':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(str(PHOTO_FOLDER).encode('utf-8'))

        elif self.path == '/api/photos':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(list_photos()).encode('utf-8'))

        elif self.path.startswith('/api/thumb/'):
            filename = urllib.parse.unquote(self.path[len('/api/thumb/'):])
            data = get_thumbnail_bytes(filename)
            if data:
                self.send_response(200)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Cache-Control', 'max-age=3600')
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_response(404)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/api/rename':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            original = body['original']
            new_name = body['newName']

            src = PHOTO_FOLDER / original
            dst = PHOTO_FOLDER / new_name

            if not src.exists():
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f"Source not found: {original}".encode())
                return

            if dst.exists() and src != dst:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f"Target already exists: {new_name}".encode())
                return

            try:
                src.rename(dst)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'OK')
                print(f"  Renamed: {original} -> {new_name}")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    print(f"\n📸 Photo Renamer")
    print(f"   Folder: {PHOTO_FOLDER}")
    print(f"   Photos: {len(list_photos())}")
    print(f"   URL:    http://localhost:{PORT}")
    print(f"\n   Opening browser...\n")

    class ThreadedServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True
    server = ThreadedServer(('localhost', PORT), Handler)
    webbrowser.open(f'http://localhost:{PORT}')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down.")
        server.shutdown()
