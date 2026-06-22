from flask import Blueprint, jsonify, request
from main import db
from models.models import AppModule
from flask_login import login_required

apps_bp = Blueprint('apps', __name__)

BUILTIN_APPS = [
    {'name': 'media-player', 'display_name': 'Media Player', 'icon': 'music', 'description': 'Play music and video files', 'route': '/apps/media-player'},
    {'name': 'notes', 'display_name': 'Notes', 'icon': 'file-text', 'description': 'Write and manage notes', 'route': '/apps/notes'},
    {'name': 'calendar', 'display_name': 'Calendar', 'icon': 'calendar', 'description': 'View and manage events', 'route': '/apps/calendar'},
    {'name': 'terminal', 'display_name': 'Terminal', 'icon': 'terminal', 'description': 'Web-based terminal', 'route': '/apps/terminal'},
    {'name': 'settings', 'display_name': 'Settings', 'icon': 'settings', 'description': 'System settings', 'route': '/settings'},
]

@apps_bp.route('/')
@login_required
def list_apps():
    apps = AppModule.query.all()
    installed = [{
        'id': a.id, 'name': a.name, 'display_name': a.display_name,
        'icon': a.icon, 'description': a.description,
        'route': a.route, 'built_in': a.built_in
    } for a in apps]
    return jsonify({'installed': installed, 'available': BUILTIN_APPS})

@apps_bp.route('/install', methods=['POST'])
@login_required
def install_app():
    data = request.json
    if AppModule.query.filter_by(name=data.get('name')).first():
        return jsonify({'message': 'Already installed'})
    app = AppModule(
        name=data['name'],
        display_name=data.get('display_name', data['name']),
        icon=data.get('icon', 'app'),
        description=data.get('description', ''),
        route=data.get('route', f'/apps/{data["name"]}'),
        installed=True,
        built_in=False
    )
    db.session.add(app)
    db.session.commit()
    return jsonify({'message': f'{app.display_name} installed', 'id': app.id})

@apps_bp.route('/uninstall', methods=['POST'])
@login_required
def uninstall_app():
    app = AppModule.query.get(request.json.get('id'))
    if app and not app.built_in:
        db.session.delete(app)
        db.session.commit()
    return jsonify({'message': 'App removed'})
