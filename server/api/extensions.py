from flask import Blueprint, jsonify, request
from main import db
from models.models import Extension
from flask_login import login_required
import requests
import json

extensions_bp = Blueprint('extensions', __name__)
REGISTRY = 'https://api.github.com/repos/TheC03L/Alpha-Extensions/contents'

@extensions_bp.route('/')
@login_required
def list_extensions():
    exts = Extension.query.all()
    return jsonify([{
        'id': e.id, 'name': e.name, 'display_name': e.display_name,
        'description': e.description, 'version': e.version, 'author': e.author,
        'installed': e.installed, 'enabled': e.enabled, 'permissions': e.permissions,
        'settings': e.settings
    } for e in exts])

@extensions_bp.route('/available')
@login_required
def available():
    try:
        r = requests.get(f'{REGISTRY}/extensions.json', timeout=10)
        if r.status_code == 200:
            return jsonify(r.json())
    except:
        pass
    return jsonify([
        {'name': 'media-server', 'display_name': 'Media Server', 'description': 'Stream movies, music, and photos', 'version': '1.0.0', 'author': 'ALPHA', 'permissions': ['storage:read', 'network']},
        {'name': 'notes', 'display_name': 'Notes', 'description': 'Simple note-taking app', 'version': '1.0.0', 'author': 'ALPHA', 'permissions': ['storage:read', 'storage:write']},
        {'name': 'calendar', 'display_name': 'Calendar', 'description': 'Family calendar and events', 'version': '1.0.0', 'author': 'ALPHA', 'permissions': []},
        {'name': 'monitoring', 'display_name': 'Monitoring', 'description': 'Advanced system monitoring charts', 'version': '1.0.0', 'author': 'ALPHA', 'permissions': ['system:read']},
        {'name': 'automation', 'display_name': 'Automation', 'description': 'Smart home automation engine', 'version': '1.0.0', 'author': 'ALPHA', 'permissions': ['devices:control', 'network']},
    ])

@extensions_bp.route('/install', methods=['POST'])
@login_required
def install():
    data = request.json
    ext = Extension.query.filter_by(name=data.get('name')).first()
    if not ext:
        ext = Extension(
            name=data['name'],
            display_name=data.get('display_name', data['name']),
            description=data.get('description', ''),
            version=data.get('version', '1.0.0'),
            author=data.get('author', 'unknown'),
            installed=True,
            permissions=data.get('permissions', [])
        )
        db.session.add(ext)
    else:
        ext.installed = True
        ext.enabled = True
    db.session.commit()
    return jsonify({'message': f'{ext.display_name} installed', 'id': ext.id})

@extensions_bp.route('/uninstall', methods=['POST'])
@login_required
def uninstall():
    ext = Extension.query.get(request.json.get('id'))
    if ext:
        ext.installed = False
        ext.enabled = False
        db.session.commit()
    return jsonify({'message': 'Extension removed'})

@extensions_bp.route('/<ext_id>/toggle', methods=['POST'])
@login_required
def toggle(ext_id):
    ext = Extension.query.get(ext_id)
    if ext:
        ext.enabled = not ext.enabled
        db.session.commit()
    return jsonify({'enabled': ext.enabled if ext else False})

@extensions_bp.route('/<ext_id>/settings', methods=['PUT'])
@login_required
def update_settings(ext_id):
    ext = Extension.query.get(ext_id)
    if ext:
        ext.settings = {**ext.settings, **request.json.get('settings', {})}
        db.session.commit()
    return jsonify({'message': 'Settings updated'})
