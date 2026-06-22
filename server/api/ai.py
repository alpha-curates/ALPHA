from flask import Blueprint, jsonify, request
from main import db
from models.models import AIModel, ChatMessage
from flask_login import login_required, current_user
from config import Config
import requests
import json
import os

ai_bp = Blueprint('ai', __name__)

STORAGE_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage')

@ai_bp.route('/status')
@login_required
def status():
    remote_enabled = current_user.settings.get('remote_ai', False) if current_user.settings else False
    result = {'local': False, 'remote': remote_enabled, 'ollama': False}
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=5)
        if r.status_code == 200:
            result['ollama'] = True
            result['local'] = True
    except:
        pass
    result['models'] = []
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=5)
        if r.status_code == 200:
            result['models'] = r.json().get('models', [])
    except:
        pass
    return jsonify(result)

@ai_bp.route('/models')
@login_required
def models():
    local = AIModel.query.all()
    remote = []
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=5)
        if r.status_code == 200:
            remote = r.json().get('models', [])
    except:
        pass
    return jsonify({
        'local': [{'id': m.id, 'name': m.name, 'model_id': m.model_id, 'size': m.size, 'downloaded': m.downloaded, 'active': m.active} for m in local],
        'remote': remote
    })

@ai_bp.route('/models/pull', methods=['POST'])
@login_required
def pull_model():
    model = request.json.get('model', 'llama3.2:1b')
    try:
        r = requests.post(f'{Config.OLLAMA_URL}/api/pull', json={'name': model}, timeout=300)
        if r.status_code == 200:
            existing = AIModel.query.filter_by(model_id=model).first()
            if not existing:
                m = AIModel(name=model, model_id=model, downloaded=True)
                db.session.add(m)
                db.session.commit()
            return jsonify({'message': f'Model {model} pulled'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Failed to pull model'}), 500

@ai_bp.route('/models/remove', methods=['POST'])
@login_required
def remove_model():
    model_id = request.json.get('model_id', '')
    try:
        r = requests.delete(f'{Config.OLLAMA_URL}/api/delete', json={'name': model_id}, timeout=30)
        m = AIModel.query.filter_by(model_id=model_id).first()
        if m:
            db.session.delete(m)
            db.session.commit()
        return jsonify({'message': f'Model {model_id} removed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    message = data.get('message', '')
    model = data.get('model', 'llama3.2:1b')
    user_msg = ChatMessage(user_id=current_user.id, role='user', content=message, model=model)
    db.session.add(user_msg)
    try:
        r = requests.post(f'{Config.OLLAMA_URL}/api/generate', json={'model': model, 'prompt': message, 'stream': False}, timeout=120)
        if r.status_code == 200:
            response = r.json().get('response', '')
            ai_msg = ChatMessage(user_id=current_user.id, role='assistant', content=response, model=model)
            db.session.add(ai_msg)
            db.session.commit()
            return jsonify({'response': response, 'id': ai_msg.id})
    except Exception as e:
        db.session.commit()
        return jsonify({'response': f'AI unavailable: {str(e)}'})
    db.session.commit()
    return jsonify({'response': 'AI service unavailable'})

@ai_bp.route('/history')
@login_required
def history():
    msgs = ChatMessage.query.filter_by(user_id=current_user.id).order_by(ChatMessage.created_at).limit(50).all()
    return jsonify([{
        'id': m.id, 'role': m.role, 'content': m.content,
        'model': m.model, 'created_at': m.created_at.isoformat()
    } for m in msgs])

@ai_bp.route('/clear', methods=['POST'])
@login_required
def clear_history():
    ChatMessage.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'History cleared'})

@ai_bp.route('/file-intel', methods=['POST'])
@login_required
def file_intel():
    path = request.json.get('path', '')
    model = request.json.get('model', 'llama3.2:1b')
    full = os.path.abspath(os.path.join(STORAGE_BASE, path.lstrip('/')))
    if not full.startswith(STORAGE_BASE) or not os.path.isfile(full):
        return jsonify({'error': 'File not found'}), 404
    try:
        with open(full, 'r', errors='replace') as f:
            content = f.read(5000)
        prompt = f"Analyze this file and summarize what it contains:\n\nFilename: {os.path.basename(full)}\n\nContent:\n{content}"
        r = requests.post(f'{Config.OLLAMA_URL}/api/generate', json={'model': model, 'prompt': prompt, 'stream': False}, timeout=120)
        if r.status_code == 200:
            analysis = r.json().get('response', '')
            return jsonify({'analysis': analysis, 'filename': os.path.basename(full)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Analysis failed'}), 500

@ai_bp.route('/system-assistant', methods=['POST'])
@login_required
def system_assistant():
    query = request.json.get('query', '')
    model = request.json.get('model', 'llama3.2:1b')
    import psutil, platform, datetime
    uptime_seconds = int(datetime.datetime.now().timestamp() - psutil.boot_time())
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    sys_info = f"""System: {platform.platform()}
Hostname: {platform.node()}
CPU: {psutil.cpu_percent()}% used, {psutil.cpu_count()} cores
Memory: {psutil.virtual_memory().percent}% used
Disk: {psutil.disk_usage('/').percent}% used
Uptime: {days}d {hours}h
Temperature: {'N/A'}"""
    prompt = f"""You are ALPHA's system assistant. Here is the current system state:
{sys_info}

User query: {query}

Answer the user's question about the system."""
    try:
        r = requests.post(f'{Config.OLLAMA_URL}/api/generate', json={'model': model, 'prompt': prompt, 'stream': False}, timeout=120)
        if r.status_code == 200:
            return jsonify({'response': r.json().get('response', ''), 'system_info': sys_info})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'response': 'System assistant unavailable'})
