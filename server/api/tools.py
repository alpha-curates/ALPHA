from flask import Blueprint, jsonify, request
from main import db
from models.models import Note, Todo, Bookmark
from flask_login import login_required, current_user
from datetime import datetime
import hashlib, base64, json, os

tools_bp = Blueprint('tools', __name__)

@tools_bp.route('/password', methods=['POST'])
@login_required
def generate_password():
    data = request.json
    length = min(int(data.get('length', 16)), 128)
    include_upper = data.get('upper', True)
    include_lower = data.get('lower', True)
    include_digits = data.get('digits', True)
    include_symbols = data.get('symbols', True)
    chars = ''
    if include_lower: chars += 'abcdefghijklmnopqrstuvwxyz'
    if include_upper: chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if include_digits: chars += '0123456789'
    if include_symbols: chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
    if not chars: chars = 'abcdefghijklmnopqrstuvwxyz'
    pw = ''.join(__import__('random').choice(chars) for _ in range(length))
    return jsonify({'password': pw})

@tools_bp.route('/qrcode', methods=['POST'])
@login_required
def generate_qr():
    data = request.json
    text = data.get('text', '')
    if not text: return jsonify({'error': 'No text'}), 400
    try:
        import qrcode
        from io import BytesIO
        img = qrcode.make(text)
        buf = BytesIO()
        img.save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode()
        return jsonify({'image': f'data:image/png;base64,{b64}'})
    except ImportError:
        return jsonify({'error': 'qrcode library not installed'}), 501

@tools_bp.route('/shorten', methods=['POST'])
@login_required
def shorten_url():
    data = request.json
    url = data.get('url', '')
    if not url: return jsonify({'error': 'No URL'}), 400
    custom = data.get('custom', '')
    slug = custom or hashlib.md5(url.encode()).hexdigest()[:8]
    from models.models import Bookmark
    existing = Bookmark.query.filter_by(user_id=current_user.id, folder='__shorturl__', url=slug).first()
    if existing:
        return jsonify({'short_url': f'/api/tools/r/{slug}'})
    bm = Bookmark(user_id=current_user.id, title=url, url=url, folder='__shorturl__')
    bm.favicon = slug
    db.session.add(bm)
    db.session.commit()
    existing2 = Bookmark.query.filter_by(user_id=current_user.id, favicon=slug).first()
    if existing2:
        existing2.title = url
        existing2.url = url
    else:
        db.session.add(Bookmark(user_id=current_user.id, title=url, url=url, folder='_redirects', favicon=slug))
    db.session.commit()
    return jsonify({'short_url': f'/api/tools/r/{slug}', 'slug': slug})

@tools_bp.route('/r/<slug>')
def redirect_short(slug):
    from models.models import Bookmark
    bm = Bookmark.query.filter_by(folder='_redirects', favicon=slug).first()
    if bm:
        return jsonify({'url': bm.title})
    return jsonify({'error': 'Not found'}), 404

# --- Notes ---
@tools_bp.route('/notes')
@login_required
def list_notes():
    notes = Note.query.filter_by(user_id=current_user.id).order_by(Note.pinned.desc(), Note.updated_at.desc()).all()
    return jsonify([{
        'id': n.id, 'title': n.title, 'content': n.content, 'category': n.category,
        'pinned': n.pinned, 'created_at': n.created_at.isoformat(), 'updated_at': n.updated_at.isoformat()
    } for n in notes])

@tools_bp.route('/notes', methods=['POST'])
@login_required
def create_note():
    data = request.json
    note = Note(user_id=current_user.id, title=data.get('title', 'Untitled'), content=data.get('content', ''), category=data.get('category', 'personal'))
    db.session.add(note)
    db.session.commit()
    return jsonify({'id': note.id, 'message': 'Created'}), 201

@tools_bp.route('/notes/<note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    note = Note.query.get(note_id)
    if not note or note.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    data = request.json
    if 'title' in data: note.title = data['title']
    if 'content' in data: note.content = data['content']
    if 'category' in data: note.category = data['category']
    if 'pinned' in data: note.pinned = data['pinned']
    note.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Updated'})

@tools_bp.route('/notes/<note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    note = Note.query.get(note_id)
    if not note or note.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# --- Todos ---
@tools_bp.route('/todos')
@login_required
def list_todos():
    todos = Todo.query.filter_by(user_id=current_user.id).order_by(Todo.created_at.desc()).all()
    return jsonify([{
        'id': t.id, 'title': t.title, 'completed': t.completed, 'priority': t.priority,
        'due_date': t.due_date.isoformat() if t.due_date else None,
        'category': t.category, 'created_at': t.created_at.isoformat()
    } for t in todos])

@tools_bp.route('/todos', methods=['POST'])
@login_required
def create_todo():
    data = request.json
    todo = Todo(user_id=current_user.id, title=data['title'], priority=data.get('priority', 'medium'), category=data.get('category', 'general'))
    if data.get('due_date'): todo.due_date = datetime.fromisoformat(data['due_date'])
    db.session.add(todo)
    db.session.commit()
    return jsonify({'id': todo.id}), 201

@tools_bp.route('/todos/<todo_id>', methods=['PUT'])
@login_required
def update_todo(todo_id):
    todo = Todo.query.get(todo_id)
    if not todo or todo.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    data = request.json
    if 'completed' in data: todo.completed = data['completed']
    if 'title' in data: todo.title = data['title']
    if 'priority' in data: todo.priority = data['priority']
    db.session.commit()
    return jsonify({'message': 'Updated'})

@tools_bp.route('/todos/<todo_id>', methods=['DELETE'])
@login_required
def delete_todo(todo_id):
    todo = Todo.query.get(todo_id)
    if not todo or todo.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    db.session.delete(todo)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# --- Bookmarks ---
@tools_bp.route('/bookmarks')
@login_required
def list_bookmarks():
    bms = Bookmark.query.filter_by(user_id=current_user.id).filter(Bookmark.folder != '_redirects').filter(Bookmark.folder != '__shorturl__').order_by(Bookmark.folder, Bookmark.created_at.desc()).all()
    return jsonify([{
        'id': b.id, 'title': b.title, 'url': b.url, 'favicon': b.favicon, 'folder': b.folder, 'created_at': b.created_at.isoformat()
    } for b in bms])

@tools_bp.route('/bookmarks', methods=['POST'])
@login_required
def create_bookmark():
    data = request.json
    bm = Bookmark(user_id=current_user.id, title=data.get('title', ''), url=data['url'], folder=data.get('folder', 'General'))
    db.session.add(bm)
    db.session.commit()
    return jsonify({'id': bm.id}), 201

@tools_bp.route('/bookmarks/<bm_id>', methods=['DELETE'])
@login_required
def delete_bookmark(bm_id):
    bm = Bookmark.query.get(bm_id)
    if not bm or bm.user_id != current_user.id: return jsonify({'error': 'Not found'}), 404
    db.session.delete(bm)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@tools_bp.route('/bookmarks/folders')
@login_required
def list_folders():
    folders = db.session.query(Bookmark.folder).filter_by(user_id=current_user.id).filter(Bookmark.folder != '_redirects').filter(Bookmark.folder != '__shorturl__').distinct().all()
    return jsonify([f[0] for f in folders])
