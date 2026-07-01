from flask import Blueprint, jsonify, request, Response, stream_with_context
from main import db
from models.models import AIModel, ChatMessage, ChatAttachment, AiProvider, GithubRepo, Conversation
from flask_login import login_required, current_user
from config import Config
from api.ai_providers import get_provider, get_provider_from_db, OllamaProvider
from api.ai_models import OPENCODE_MODELS, KEYLESSAI_MODELS, GROQ_MODELS, HUGGINGFACE_MODELS, CLOUDFLARE_MODELS, POLLINATIONS_MODELS
import requests, json, os, uuid, datetime, io, base64
try: import subprocess, platform, psutil
except: pass

ai_bp = Blueprint('ai', __name__)
STORAGE_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage')

def get_provider_for_user(provider_id=None, data=None):
    """Get the active provider for the current user"""
    if provider_id:
        # Virtual provider (not in DB)
        if provider_id == '__opencode__':
            from .ai_providers import OpenAICompatibleProvider
            d = data or {}
            return OpenAICompatibleProvider({
                'api_key': d.get('provider_api_key', ''),
                'api_url': d.get('provider_api_url', 'https://opencode.ai/zen'),
                'default_model': d.get('model', 'deepseek-v4-flash-free')
            }), OPENCODE_MODELS
        if provider_id == '__keylessai__':
            from .ai_providers import OpenAICompatibleProvider
            return OpenAICompatibleProvider({
                'api_key': 'not-needed',
                'api_url': 'https://keylessai.thryx.workers.dev/v1',
                'default_model': 'openai-fast'
            }), KEYLESSAI_MODELS
        if provider_id == '__pollinations__':
            from .ai_providers import OpenAICompatibleProvider
            return OpenAICompatibleProvider({
                'api_key': '',
                'api_url': 'https://text.pollinations.ai/openai',
                'default_model': 'openai'
            }), POLLINATIONS_MODELS
        if provider_id == '__ollama__':
            return OllamaProvider(), []
        dp = AiProvider.query.filter_by(id=provider_id, user_id=current_user.id, enabled=True).first()
        if dp: return get_provider_from_db(dp)
    # Check if user has any enabled provider
    dp = AiProvider.query.filter_by(user_id=current_user.id, enabled=True).first()
    if dp: return get_provider_from_db(dp)
    # Default to Ollama
    return OllamaProvider(), []

@ai_bp.route('/status')
@login_required
def status():
    result = {'ollama': False, 'providers': [], 'active_provider': None}
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=3)
        if r.status_code == 200: result['ollama'] = True
        else: print(f'AI STATUS: Ollama returned {r.status_code}', flush=True)
    except Exception as e:
        print(f'AI STATUS: Ollama error: {e}', flush=True)
    providers = AiProvider.query.filter_by(user_id=current_user.id, enabled=True).all()
    for p in providers:
        provider, models = get_provider_from_db(p)
        available = []
        try: available = provider.list_models()
        except: pass
        result['providers'].append({
            'id': p.id, 'name': p.name, 'type': p.provider_type,
            'default_model': p.default_model, 'models': available[:20]
        })
    active = AiProvider.query.filter_by(user_id=current_user.id, enabled=True).first()
    if active:
        result['active_provider'] = {'id': active.id, 'name': active.name, 'type': active.provider_type, 'model': active.default_model}
    elif not result['providers']:
        result['providers'].append({
            'id': '__opencode__', 'name': 'OpenCode Zen', 'type': 'openai',
            'api_url': 'https://opencode.ai/zen/v1', 'api_key': '',
            'default_model': 'deepseek-v4-flash-free',
            'models': OPENCODE_MODELS
        })
        result['providers'].append({
            'id': '__keylessai__', 'name': 'KeylessAI (free)', 'type': 'openai',
            'api_url': 'https://keylessai.thryx.workers.dev/v1', 'api_key': 'not-needed',
            'default_model': 'openai-fast',
            'models': KEYLESSAI_MODELS
        })
        result['providers'].append({
            'id': '__pollinations__', 'name': 'Pollinations.ai', 'type': 'openai',
            'api_url': 'https://text.pollinations.ai/openai', 'api_key': '',
            'default_model': 'openai',
            'models': POLLINATIONS_MODELS
        })
        result['active_provider'] = {'id': '__opencode__', 'name': 'OpenCode Zen', 'type': 'openai', 'model': 'deepseek-v4-flash-free'}
    return jsonify(result)

@ai_bp.route('/models')
@login_required
def models():
    local = AIModel.query.all()
    remote = []
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=5)
        if r.status_code == 200: remote = r.json().get('models', [])
    except: pass
    user_providers = []
    for p in AiProvider.query.filter_by(user_id=current_user.id, enabled=True).all():
        provider, _ = get_provider_from_db(p)
        try:
            mods = provider.list_models()
            user_providers.append({'id': p.id, 'name': p.name, 'type': p.provider_type, 'models': mods[:30]})
        except:
            user_providers.append({'id': p.id, 'name': p.name, 'type': p.provider_type, 'models': []})
    return jsonify({
        'local': [{'id': m.id, 'name': m.name, 'model_id': m.model_id, 'size': m.size, 'downloaded': m.downloaded} for m in local],
        'remote': remote,
        'providers': user_providers
    })

@ai_bp.route('/providers', methods=['GET', 'POST'])
@login_required
def handle_providers():
    if request.method == 'GET':
        providers = AiProvider.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'id': p.id, 'name': p.name, 'type': p.provider_type, 'api_url': p.api_url,
            'has_key': bool(p.api_key), 'default_model': p.default_model,
            'enabled': p.enabled, 'models': json.loads(p.models) if p.models else []
        } for p in providers])
    data = request.json
    existing = AiProvider.query.filter_by(user_id=current_user.id, provider_type=data['type']).first()
    if existing and not data.get('force'):
        return jsonify({'error': 'Provider already exists', 'id': existing.id}), 409
    if existing and data.get('force'):
        existing.name = data.get('name', existing.name)
        if data.get('api_key'): existing.api_key = data['api_key']
        if data.get('api_url'): existing.api_url = data['api_url']
        existing.default_model = data.get('default_model', existing.default_model)
        existing.models = json.dumps(data.get('models', []))
        existing.enabled = data.get('enabled', True)
    else:
        p = AiProvider(
            user_id=current_user.id, name=data.get('name', data['type']),
            provider_type=data['type'], api_key=data.get('api_key', ''),
            api_url=data.get('api_url', ''), default_model=data.get('default_model', ''),
            models=json.dumps(data.get('models', [])), enabled=data.get('enabled', True)
        )
        db.session.add(p)
    db.session.commit()
    return jsonify({'message': 'Provider saved'})

@ai_bp.route('/providers/<provider_id>', methods=['PUT', 'DELETE'])
@login_required
def modify_provider(provider_id):
    p = AiProvider.query.filter_by(id=provider_id, user_id=current_user.id).first()
    if not p: return jsonify({'error': 'Not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(p)
        db.session.commit()
        return jsonify({'message': 'Deleted'})
    data = request.json
    if 'name' in data: p.name = data['name']
    if 'api_key' in data: p.api_key = data['api_key']
    if 'api_url' in data: p.api_url = data['api_url']
    if 'default_model' in data: p.default_model = data['default_model']
    if 'enabled' in data: p.enabled = data['enabled']
    db.session.commit()
    return jsonify({'message': 'Updated'})

@ai_bp.route('/providers/test', methods=['POST'])
@login_required
def test_provider():
    data = request.json
    provider = get_provider(data.get('type', 'openai'), {
        'api_key': data.get('api_key', ''), 'api_url': data.get('api_url', ''),
        'default_model': data.get('default_model', '')
    })
    try:
        r = provider.chat([{'role': 'user', 'content': 'Reply with just: OK'}], data.get('default_model', ''))
        return jsonify({'success': bool(r and 'OK' in r), 'response': r})
    except Exception as e: return jsonify({'success': False, 'error': str(e)})

@ai_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    message = data.get('message', '')
    model = data.get('model', '')
    provider_id = data.get('provider_id', '')
    conversation_id = data.get('conversation_id', '')
    attachment_ids = data.get('attachments', [])

    provider, _ = get_provider_for_user(provider_id, data)
    if not model: model = provider.model or 'llama3.2:1b'

    context = message
    if attachment_ids:
        files = ChatAttachment.query.filter(ChatAttachment.id.in_(attachment_ids), ChatAttachment.user_id == current_user.id).all()
        for f in files:
            fp = f.file_path
            if os.path.isfile(fp):
                try:
                    with open(fp, 'r', errors='replace') as fh:
                        content = fh.read(3000)
                    context = f"[Attached file: {f.file_name}]\n```\n{content}\n```\n\n{message}"
                except: pass

    user_msg = ChatMessage(user_id=current_user.id, role='user', content=context, model=model, conversation_id=conversation_id or None)
    db.session.add(user_msg)
    db.session.flush()

    for aid in attachment_ids:
        att = ChatAttachment.query.get(aid)
        if att:
            att.message_id = user_msg.id

    try:
        history = ChatMessage.query.filter_by(user_id=current_user.id, conversation_id=conversation_id or None).order_by(ChatMessage.created_at.desc()).limit(20).all()
        history.reverse()
        msgs = [{'role': m.role, 'content': m.content} for m in history[:-1]]
        msgs.append({'role': 'user', 'content': context})
        # Prepend system prompt if conversation has one
        if conversation_id:
            conv = db.session.get(Conversation, conversation_id)
            if conv and conv.system_prompt:
                msgs.insert(0, {'role': 'system', 'content': conv.system_prompt})
        response = provider.chat(msgs, model)
        if not response: response = 'No response from AI'
        ai_msg = ChatMessage(user_id=current_user.id, role='assistant', content=response, model=model, conversation_id=conversation_id or None)
        db.session.add(ai_msg)
        db.session.commit()
        if conversation_id:
            conv = db.session.get(Conversation, conversation_id)
            if conv and conv.title == 'New Chat':
                conv.title = (message[:50] + '...') if len(message) > 50 else message
                db.session.commit()
        return jsonify({'response': response, 'id': ai_msg.id, 'provider': provider.name})
    except Exception as e:
        db.session.commit()
        return jsonify({'response': f'AI error: {str(e)}', 'provider': provider.name})

SYSTEM_COMMANDS = {
    'help': 'Show this help message',
    'system': 'CPU, memory, and system status',
    'memory': 'RAM usage details',
    'storage': 'Disk usage',
    'temperature': 'CPU temperature',
    'processes': 'Top processes by CPU',
    'uptime': 'How long the server has been running',
    'restart': 'Restart the AlphaNAS server',
    'clear': 'Clear the current conversation',
}

def _run_cmd(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout or r.stderr or 'N/A'
    except:
        return 'N/A'

def _exec_system_cmd(cmd_name):
    cmd_name = cmd_name.lstrip('#').lower().strip()
    if cmd_name == 'help':
        lines = ['**Available #commands:**\n']
        for k, v in SYSTEM_COMMANDS.items():
            lines.append(f'- `#{k}` — {v}')
        return '\n'.join(lines)
    if cmd_name == 'system':
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        return (
            f'**CPU:** {cpu}% ({psutil.cpu_count()} cores)\n'
            f'**Memory:** {mem.percent}% ({mem.used//1024**3}.{mem.used%1024**3//1024**2:.0f} GB / {mem.total//1024**3}.{mem.total%1024**3//1024**2:.0f} GB)\n'
            f'**Platform:** {platform.platform()}\n'
            f'**Host:** {platform.node()}'
        )
    if cmd_name == 'memory':
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return (
            f'**RAM:** {mem.percent}% used\n'
            f'  Total: {mem.total//1024**3}.{mem.total%1024**3//1024**2:.0f} GB\n'
            f'  Used: {mem.used//1024**3}.{mem.used%1024**3//1024**2:.0f} GB\n'
            f'  Free: {mem.free//1024**3}.{mem.free%1024**3//1024**2:.0f} GB\n'
            f'**Swap:** {swap.percent}% used ({swap.total//1024**3} GB)'
        )
    if cmd_name == 'storage':
        usage = psutil.disk_usage('/')
        return (
            f'**Disk:** {usage.percent}% used\n'
            f'  Total: {usage.total//1024**3}.{usage.total%1024**3//1024**2:.0f} GB\n'
            f'  Used: {usage.used//1024**3}.{usage.used%1024**3//1024**2:.0f} GB\n'
            f'  Free: {usage.free//1024**3}.{usage.free%1024**3//1024**2:.0f} GB'
        )
    if cmd_name == 'temperature':
        temp = 'N/A'
        try:
            if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
                with open('/sys/class/thermal/thermal_zone0/temp') as f:
                    raw = round(int(f.read().strip()) / 1000, 1)
                    if raw > 0: temp = f'{raw}°C'
        except: pass
        return f'**CPU Temperature:** {temp}'
    if cmd_name == 'processes':
        procs = sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']), key=lambda p: p.info.get('cpu_percent', 0) or 0, reverse=True)[:10]
        lines = ['**Top Processes (by CPU):**\n']
        for p in procs:
            lines.append(f'  {p.info["pid"]:>6}  {p.info["name"] or "?":<20}  CPU {p.info.get("cpu_percent", 0):>5.1f}%  MEM {p.info.get("memory_percent", 0):>5.1f}%')
        return '\n'.join(lines)
    if cmd_name == 'uptime':
        try:
            sec = int(datetime.datetime.now().timestamp() - psutil.Process().create_time())
        except:
            sec = 0
        d, r = divmod(sec, 86400); h, r = divmod(r, 3600); m, s = divmod(r, 60)
        return f'**Uptime:** {d}d {h}h {m}m {s}s'
    if cmd_name == 'restart':
        subprocess.Popen(['sudo', 'systemctl', 'restart', 'alpha.service'], start_new_session=True)
        return '**Restarting server...**'
    if cmd_name == 'clear':
        return '#CLEAR'
    return f'Unknown command `#{cmd_name}`. Type `#help` to see available commands.'

@ai_bp.route('/chat/stream', methods=['POST'])
@login_required
def chat_stream():
    data = request.json
    message = data.get('message', '')
    model = data.get('model', '')
    provider_id = data.get('provider_id', '')
    conversation_id = data.get('conversation_id', '')

    provider, _ = get_provider_for_user(provider_id, data)
    if not model: model = provider.model or 'llama3.2:1b'

    user_msg = ChatMessage(user_id=current_user.id, role='user', content=message, model=model, conversation_id=conversation_id or None)
    db.session.add(user_msg)
    db.session.flush()

    history = ChatMessage.query.filter_by(user_id=current_user.id, conversation_id=conversation_id or None).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history.reverse()
    msgs = [{'role': m.role, 'content': m.content} for m in history[:-1]]
    msgs.append({'role': 'user', 'content': message})
    if conversation_id:
        conv = db.session.get(Conversation, conversation_id)
        if conv and conv.system_prompt:
            msgs.insert(0, {'role': 'system', 'content': conv.system_prompt})

    def generate():
        full_response = ''
        try:
            # Check for #commands
            stripped = message.strip()
            if stripped.startswith('#'):
                cmd_result = _exec_system_cmd(stripped)
                if cmd_result == '#CLEAR':
                    yield f"data: {json.dumps({'token': '🧹 Conversation cleared'})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'clear': True})}\n\n"
                    return
                for token in cmd_result:
                    pass
                yield f"data: {json.dumps({'token': cmd_result})}\n\n"
                ai_msg = ChatMessage(user_id=current_user.id, role='assistant', content=cmd_result, model='#command', conversation_id=conversation_id or None)
                db.session.add(ai_msg)
                if conversation_id:
                    conv = db.session.get(Conversation, conversation_id)
                    if conv and conv.title == 'New Chat' and message:
                        conv.title = (message[:50] + '...') if len(message) > 50 else message
                db.session.commit()
                yield f"data: {json.dumps({'done': True, 'id': ai_msg.id, 'provider': '#command'})}\n\n"
                return

            for token in provider.chat_stream(msgs, model):
                full_response += token
                yield f"data: {json.dumps({'token': token})}\n\n"
            ai_msg = ChatMessage(user_id=current_user.id, role='assistant', content=full_response, model=model, conversation_id=conversation_id or None)
            db.session.add(ai_msg)
            if conversation_id:
                conv = db.session.get(Conversation, conversation_id)
                if conv and conv.title == 'New Chat' and message:
                    conv.title = (message[:50] + '...') if len(message) > 50 else message
            db.session.commit()
            yield f"data: {json.dumps({'done': True, 'id': ai_msg.id, 'provider': provider.name})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

@ai_bp.route('/history')
@login_required
def history():
    conversation_id = request.args.get('conversation_id', '')
    query = ChatMessage.query.filter_by(user_id=current_user.id)
    if conversation_id:
        query = query.filter_by(conversation_id=conversation_id)
    else:
        query = query.filter_by(conversation_id=None)
    msgs = query.order_by(ChatMessage.created_at).limit(50).all()
    return jsonify([{
        'id': m.id, 'role': m.role, 'content': m.content,
        'model': m.model, 'created_at': m.created_at.isoformat()
    } for m in msgs])

@ai_bp.route('/clear', methods=['POST'])
@login_required
def clear_history():
    ChatMessage.query.filter_by(user_id=current_user.id).delete()
    ChatAttachment.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'History cleared'})

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
    except Exception as e: return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Failed to pull model'}), 500

@ai_bp.route('/models/remove', methods=['POST'])
@login_required
def remove_model():
    model_id = request.json.get('model_id', '')
    try:
        r = requests.delete(f'{Config.OLLAMA_URL}/api/delete', json={'name': model_id}, timeout=30)
        m = AIModel.query.filter_by(model_id=model_id).first()
        if m: db.session.delete(m); db.session.commit()
        return jsonify({'message': f'Model {model_id} removed'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@ai_bp.route('/generate-zip', methods=['POST'])
@login_required
def generate_zip():
    data = request.json
    prompt = data.get('prompt', '')
    model = data.get('model', '')
    provider_id = data.get('provider_id', '')
    if not prompt: return jsonify({'error': 'No prompt'}), 400
    provider, _ = get_provider_for_user(provider_id, data)
    if not model: model = provider.model or 'llama3.2:1b'

    plan_prompt = "You are a project generator. Based on the user request, decide which files to create.\n"
    plan_prompt += "Return ONLY a JSON array of objects with 'filename' and 'description' fields.\n"
    plan_prompt += 'Example: [{"filename": "index.html", "description": "Main HTML page"}, {"filename": "style.css", "description": "Stylesheet"}]\n'
    plan_prompt += "User request: " + prompt
    try:
        plan_resp = provider.chat([{'role': 'user', 'content': plan_prompt}], model)
        import re, json as jmod
        plan_json = re.search(r'\[.*?\]', plan_resp or '', re.DOTALL)
        if not plan_json: return jsonify({'error': 'Could not plan project files'}), 500
        files = jmod.loads(plan_json.group())

        import io, zipfile, datetime as dt
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for fdef in files:
                fname = fdef.get('filename', 'file.txt')
                desc = fdef.get('description', '')
                gen_prompt = "Generate the content for " + fname + ". " + desc + "\n"
                gen_prompt += "User request: " + prompt + "\nOutput only the file content."
                content = provider.chat([{'role': 'user', 'content': gen_prompt}], model) or ''
                zf.writestr(fname, content)

        b64 = __import__('base64').b64encode(buf.getvalue()).decode()
        return jsonify({'zip': b64, 'files': files, 'filename': 'project_' + dt.datetime.now().strftime("%Y%m%d_%H%M%S") + '.zip'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@ai_bp.route('/file-intel', methods=['POST'])
@login_required
def file_intel():
    path = request.json.get('path', '')
    model = request.json.get('model', '')
    provider_id = request.json.get('provider_id', '')
    provider, _ = get_provider_for_user(provider_id, request.json)
    if not model: model = provider.model or 'llama3.2:1b'
    full = os.path.abspath(os.path.join(STORAGE_BASE, path.lstrip('/')))
    if not full.startswith(STORAGE_BASE) or not os.path.isfile(full):
        return jsonify({'error': 'File not found'}), 404
    try:
        with open(full, 'r', errors='replace') as f: content = f.read(5000)
        ext = os.path.splitext(full)[1].lower()
        prompt = f"Analyze this {ext} file and summarize:\n\nFilename: {os.path.basename(full)}\n\nContent:\n{content}"
        response = provider.chat([{'role': 'user', 'content': prompt}], model)
        if response: return jsonify({'analysis': response, 'filename': os.path.basename(full)})
    except Exception as e: return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Analysis failed'}), 500

@ai_bp.route('/system-assistant', methods=['POST'])
@login_required
def system_assistant():
    query = request.json.get('query', '')
    model = request.json.get('model', '')
    provider_id = request.json.get('provider_id', '')
    provider, _ = get_provider_for_user(provider_id, request.json)
    if not model: model = provider.model or 'llama3.2:1b'
    import psutil, platform as pf
    uptime_seconds = int(datetime.datetime.now().timestamp() - psutil.boot_time())
    days = uptime_seconds // 86400; hours = (uptime_seconds % 86400) // 3600
    sys_info = f"""System: {pf.platform()}
Hostname: {pf.node()}
CPU: {psutil.cpu_percent()}% used, {psutil.cpu_count()} cores
Memory: {psutil.virtual_memory().percent}% used
Disk: {psutil.disk_usage('/').percent}% used
Uptime: {days}d {hours}h
Processes: {len(psutil.pids())}"""
    prompt = f"""You are ALPHA's system assistant. Here is system state:
{sys_info}

User: {query}

Answer concisely about the system."""
    try:
        response = provider.chat([{'role': 'user', 'content': prompt}], model)
        if response: return jsonify({'response': response, 'system_info': sys_info})
    except Exception as e: return jsonify({'error': str(e)}), 500
    return jsonify({'response': 'System assistant unavailable'})

@ai_bp.route('/attach', methods=['POST'])
@login_required
def attach_file():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    f = request.files['file']
    if not f.filename: return jsonify({'error': 'No file'}), 400
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_name = f"{ts}_{uuid.uuid4().hex[:8]}_{f.filename}"
    chat_dir = os.path.join(STORAGE_BASE, '.chat_attachments')
    os.makedirs(chat_dir, exist_ok=True)
    fp = os.path.join(chat_dir, safe_name)
    f.save(fp)
    size = os.path.getsize(fp)
    ext = os.path.splitext(f.filename)[1].lower()
    att = ChatAttachment(
        user_id=current_user.id, file_name=f.filename,
        file_path=fp, file_type=ext, file_size=size
    )
    db.session.add(att)
    db.session.commit()
    return jsonify({
        'id': att.id, 'file_name': att.file_name, 'file_type': att.file_type,
        'file_size': att.file_size
    }), 201

@ai_bp.route('/attachments')
@login_required
def list_attachments():
    atts = ChatAttachment.query.filter_by(user_id=current_user.id, message_id=None).order_by(ChatAttachment.created_at.desc()).all()
    return jsonify([{
        'id': a.id, 'file_name': a.file_name, 'file_type': a.file_type,
        'file_size': a.file_size, 'created_at': a.created_at.isoformat()
    } for a in atts])

@ai_bp.route('/generate-file', methods=['POST'])
@login_required
def generate_file():
    data = request.json
    prompt = data.get('prompt', '')
    file_type = data.get('file_type', 'txt')
    model = data.get('model', '')
    provider_id = data.get('provider_id', '')
    save_path = data.get('save_path', '')
    if not prompt: return jsonify({'error': 'No prompt'}), 400
    provider, _ = get_provider_for_user(provider_id, data)
    if not model: model = provider.model or 'llama3.2:1b'

    type_prompts = {
        'txt': 'Write plain text content.',
        'html': 'Generate a complete HTML page with inline CSS.',
        'css': 'Generate CSS code only, no explanation.',
        'js': 'Generate JavaScript code only, no explanation.',
        'py': 'Generate Python code only, no explanation.',
        'json': 'Generate valid JSON only, no explanation.',
        'md': 'Generate markdown content.',
        'sh': 'Generate a bash script.',
        'yaml': 'Generate YAML content.',
        'sql': 'Generate SQL queries.',
        'svg': 'Generate SVG image code only. Output ONLY valid SVG markup wrapped in ```svg...``` or raw <svg>...</svg>.',
    }
    sys_prompt = type_prompts.get(file_type, 'Generate the requested content.')
    full_prompt = f"{sys_prompt}\nUser request: {prompt}\n\nOutput only the content, no extra text."

    try:
        content = provider.chat([{'role': 'user', 'content': full_prompt}], model)
        if not content: return jsonify({'error': 'Generation failed'}), 500
        ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        fname = f"ai_generated_{ts}.{file_type}"
        if save_path:
            save_full = os.path.normpath(os.path.join(STORAGE_BASE, save_path.lstrip('/')))
            if save_full.startswith(STORAGE_BASE):
                os.makedirs(os.path.dirname(save_full), exist_ok=True)
                with open(save_full, 'w') as f: f.write(content)
                return jsonify({'message': 'File saved', 'path': os.path.relpath(save_full, STORAGE_BASE), 'content': content[:200]})
        # Return content for preview
        return jsonify({'content': content, 'filename': fname, 'file_type': file_type})
    except Exception as e: return jsonify({'error': str(e)}), 500

@ai_bp.route('/github/connect', methods=['POST'])
@login_required
def github_connect():
    data = request.json
    token = data.get('token', '')
    repo = data.get('repo', '')
    branch = data.get('branch', 'main')
    if not token or not repo: return jsonify({'error': 'Token and repo required'}), 400
    parts = repo.replace('https://github.com/', '').split('/')
    if len(parts) < 2: return jsonify({'error': 'Invalid repo format. Use owner/repo'}), 400
    owner, name = parts[0], parts[1].replace('.git', '')
    full = f'{owner}/{name}'
    existing = GithubRepo.query.filter_by(user_id=current_user.id, repo_full=full).first()
    if existing:
        existing.access_token = token; existing.branch = branch
    else:
        existing = GithubRepo(user_id=current_user.id, repo_full=full, repo_name=name, repo_owner=owner, branch=branch, access_token=token)
        db.session.add(existing)
    db.session.commit()
    return jsonify({'message': 'Connected', 'repo': full})

@ai_bp.route('/github/repos')
@login_required
def github_repos():
    repos = GithubRepo.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': r.id, 'repo': r.repo_full, 'name': r.repo_name,
        'owner': r.repo_owner, 'branch': r.branch, 'connected_at': r.connected_at.isoformat()
    } for r in repos])

@ai_bp.route('/github/<repo_id>/files')
@login_required
def github_files(repo_id):
    repo = GithubRepo.query.filter_by(id=repo_id, user_id=current_user.id).first()
    if not repo: return jsonify({'error': 'Not found'}), 404
    path = request.args.get('path', '')
    headers = {'Authorization': f'token {repo.access_token}', 'Accept': 'application/vnd.github.v3+json'}
    url = f'https://api.github.com/repos/{repo.repo_full}/contents/{path}?ref={repo.branch}'
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            return jsonify(r.json())
        return jsonify({'error': f'GitHub error: {r.status_code}', 'detail': r.text[:200]}), r.status_code
    except Exception as e: return jsonify({'error': str(e)}), 500

@ai_bp.route('/github/<repo_id>/analyze', methods=['POST'])
@login_required
def github_analyze(repo_id):
    repo = GithubRepo.query.filter_by(id=repo_id, user_id=current_user.id).first()
    if not repo: return jsonify({'error': 'Not found'}), 404
    file_path = request.json.get('path', '')
    provider, _ = get_provider_for_user(request.json.get('provider_id', ''), request.json)
    model = request.json.get('model', '') or provider.model or 'llama3.2:1b'
    headers = {'Authorization': f'token {repo.access_token}', 'Accept': 'application/vnd.github.v3+json'}
    url = f'https://api.github.com/repos/{repo.repo_full}/contents/{file_path}?ref={repo.branch}'
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code != 200: return jsonify({'error': 'File not found'}), 404
        data = r.json()
        content_b64 = data.get('content', '')
        try: content = base64.b64decode(content_b64).decode('utf-8', errors='replace')[:5000]
        except: content = 'Binary file'
        query = request.json.get('query', 'Analyze this code. What does it do?')
        prompt = f"File: {file_path}\n\n```\n{content}\n```\n\n{query}"
        response = provider.chat([{'role': 'user', 'content': prompt}], model)
        return jsonify({'analysis': response, 'file': file_path})
    except Exception as e: return jsonify({'error': str(e)}), 500

@ai_bp.route('/github/<repo_id>/disconnect', methods=['DELETE'])
@login_required
def github_disconnect(repo_id):
    repo = GithubRepo.query.filter_by(id=repo_id, user_id=current_user.id).first()
    if not repo: return jsonify({'error': 'Not found'}), 404
    db.session.delete(repo)
    db.session.commit()
    return jsonify({'message': 'Disconnected'})

# ===== Conversations =====
@ai_bp.route('/conversations')
@login_required
def list_conversations():
    convs = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.updated_at.desc()).all()
    result = []
    for c in convs:
        msg_count = ChatMessage.query.filter_by(conversation_id=c.id).count()
        result.append({
            'id': c.id, 'title': c.title, 'system_prompt': c.system_prompt,
            'provider_id': c.provider_id, 'model': c.model,
            'message_count': msg_count,
            'created_at': c.created_at.isoformat(), 'updated_at': c.updated_at.isoformat()
        })
    return jsonify(result)

@ai_bp.route('/conversations', methods=['POST'])
@login_required
def create_conversation():
    data = request.json
    conv = Conversation(
        user_id=current_user.id,
        title=data.get('title', 'New Chat'),
        system_prompt=data.get('system_prompt', ''),
        provider_id=data.get('provider_id'),
        model=data.get('model', '')
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify({'id': conv.id, 'title': conv.title, 'message': 'Created'}), 201

@ai_bp.route('/conversations/<conv_id>', methods=['PUT'])
@login_required
def update_conversation(conv_id):
    conv = db.session.get(Conversation, conv_id)
    if not conv or conv.user_id != current_user.id:
        return jsonify({'error': 'Not found'}), 404
    data = request.json
    if 'title' in data: conv.title = data['title']
    if 'system_prompt' in data: conv.system_prompt = data['system_prompt']
    if 'provider_id' in data: conv.provider_id = data['provider_id']
    if 'model' in data: conv.model = data['model']
    db.session.commit()
    return jsonify({'message': 'Updated'})

@ai_bp.route('/conversations/<conv_id>', methods=['DELETE'])
@login_required
def delete_conversation(conv_id):
    conv = db.session.get(Conversation, conv_id)
    if not conv or conv.user_id != current_user.id:
        return jsonify({'error': 'Not found'}), 404
    ChatMessage.query.filter_by(conversation_id=conv_id).delete()
    db.session.delete(conv)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@ai_bp.route('/conversations/<conv_id>/export')
@login_required
def export_conversation(conv_id):
    conv = db.session.get(Conversation, conv_id)
    if not conv or conv.user_id != current_user.id:
        return jsonify({'error': 'Not found'}), 404
    msgs = ChatMessage.query.filter_by(conversation_id=conv_id).order_by(ChatMessage.created_at).all()
    lines = [f"# {conv.title}", f"Model: {conv.model or 'default'}", f"Date: {conv.created_at.isoformat()}", '']
    if conv.system_prompt:
        lines.extend(['## System Prompt', conv.system_prompt, ''])
    for m in msgs:
        lines.append(f"**{m.role.capitalize()}**: {m.content}")
    fmt = request.args.get('format', 'text')
    if fmt == 'json':
        return jsonify({
            'title': conv.title, 'system_prompt': conv.system_prompt,
            'model': conv.model, 'created_at': conv.created_at.isoformat(),
            'messages': [{'role': m.role, 'content': m.content, 'created_at': m.created_at.isoformat()} for m in msgs]
        })
    return Response('\n\n'.join(lines), mimetype='text/plain', headers={'Content-Disposition': f'attachment; filename="{conv.title}.txt"'})

@ai_bp.route('/install-ollama', methods=['POST'])
@login_required
def install_ollama():
    import subprocess, shutil
    # Already installed and running?
    try:
        r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=3)
        if r.status_code == 200:
            return jsonify({'message': 'Ollama is already installed and running!'})
    except:
        pass
    # Already has binary but not running?
    if shutil.which('ollama'):
        subprocess.run(['sudo', 'systemctl', 'start', 'ollama'], capture_output=True, timeout=10)
        try:
            r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=5)
            if r.status_code == 200:
                return jsonify({'message': 'Ollama service started!'})
        except:
            pass
    try:
        # Download installer
        installer = None
        if shutil.which('wget'):
            dl = subprocess.run(['wget', '-qO-', 'https://ollama.com/install.sh'], capture_output=True, text=True, timeout=60)
            if dl.returncode == 0: installer = dl.stdout
        if installer is None:
            dl = subprocess.run(['curl', '-fsSL', 'https://ollama.com/install.sh'], capture_output=True, text=True, timeout=60)
            if dl.returncode == 0: installer = dl.stdout
        if installer is None:
            return jsonify({'error': 'Failed to download Ollama installer (try: sudo apt install curl wget)'}), 500
        # Run installer with sudo
        install_result = subprocess.run(
            ['sudo', 'sh'], input=installer, capture_output=True, text=True, timeout=600
        )
        if install_result.returncode != 0:
            return jsonify({'error': install_result.stderr or 'Install failed (check logs)'}), 500
        # Start Ollama service
        subprocess.run(['sudo', 'systemctl', 'enable', 'ollama'], capture_output=True, timeout=10)
        subprocess.run(['sudo', 'systemctl', 'start', 'ollama'], capture_output=True, timeout=10)
        # Wait for it to be ready
        import time as _time
        for _ in range(30):
            try:
                r = requests.get(f'{Config.OLLAMA_URL}/api/tags', timeout=2)
                if r.status_code == 200: break
            except: pass
            _time.sleep(2)
        # Pull model
        pull_result = subprocess.run(
            ['ollama', 'pull', 'llama3.2:1b'],
            capture_output=True, text=True, timeout=600
        )
        if pull_result.returncode == 0:
            return jsonify({'message': 'Ollama installed and llama3.2:1b model pulled!'})
        return jsonify({'message': 'Ollama installed. Model pull: ' + (pull_result.stderr or 'try again manually: ollama pull llama3.2:1b')})
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Installation timed out (Pi may need >10min). Run manually: curl -fsSL https://ollama.com/install.sh | sudo sh && ollama pull llama3.2:1b'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
