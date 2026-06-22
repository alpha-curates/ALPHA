"""Display client API — serves aggregated data for the 2nd RPi display."""

from flask import Blueprint, jsonify, request
from main import db
from models.models import Notification, ChatMessage
from flask_login import login_required, current_user
from config import Config
import requests, os, datetime

display_bp = Blueprint('display', __name__)

@display_bp.route('/status')
@login_required
def display_status():
    """Aggregated status for the 2nd RPi display panel."""
    # Collect faults: unread critical notifications, system issues
    faults = []
    try:
        # Critical notifications
        crit_notifs = Notification.query.filter_by(user_id=current_user.id, read=False).filter(
            Notification.notification_type.in_(['alert', 'system', 'broadcast'])
        ).order_by(Notification.created_at.desc()).limit(10).all()
        for n in crit_notifs:
            faults.append({
                'type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'time': n.created_at.isoformat()
            })
    except: pass

    # System health check
    cpu = mem = disk = 0
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage('/').percent
        if cpu > 85: faults.append({'type': 'system', 'title': 'High CPU', 'message': f'CPU at {cpu}%', 'time': datetime.datetime.utcnow().isoformat()})
        if mem > 85: faults.append({'type': 'system', 'title': 'High Memory', 'message': f'Memory at {mem}%', 'time': datetime.datetime.utcnow().isoformat()})
        if disk > 85: faults.append({'type': 'system', 'title': 'Low Disk', 'message': f'Disk at {disk}%', 'time': datetime.datetime.utcnow().isoformat()})
    except: pass

    # Ollama status
    ollama_ok = False
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=3)
        ollama_ok = r.status_code == 200
    except: pass

    # User theme settings
    theme = {}
    if current_user.settings:
        theme = {
            'accent': current_user.settings.get('accent_color', '#6c5ce7'),
            'wallpaper': current_user.settings.get('wallpaper', ''),
        }

    return jsonify({
        'faults': faults[:8],
        'ollama': {'healthy': ollama_ok},
        'system': {
            'cpu_percent': cpu,
            'memory_percent': mem,
            'disk_percent': disk,
        },
        'theme': theme,
        'hostname': os.uname().nodename,
        'time': datetime.datetime.now().strftime('%H:%M'),
        'date': datetime.datetime.now().strftime('%a %d %b'),
    })

@display_bp.route('/ai-voice', methods=['POST'])
@login_required
def ai_voice():
    """Process voice input: transcribe via Whisper or directly query Ollama."""
    data = request.json
    text = data.get('text', '')
    if not text: return jsonify({'error': 'No text'}), 400
    model = data.get('model', 'llama3.2:1b')
    try:
        r = requests.post(f'{Config.OLLAMA_URL}/api/generate', json={
            'model': model, 'prompt': text, 'stream': False,
            'options': {'num_predict': 512}
        }, timeout=60)
        if r.status_code == 200:
            response = r.json().get('response', '')
            # Save to chat history
            msg = ChatMessage(user_id=current_user.id, role='user', content=f'[Voice] {text}', model=model)
            db.session.add(msg)
            ai_msg = ChatMessage(user_id=current_user.id, role='assistant', content=response, model=model)
            db.session.add(ai_msg)
            db.session.commit()
            return jsonify({'response': response, 'transcript': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'AI unavailable'}), 500
