from flask import Blueprint, jsonify, request
from main import db
from models.models import User
from flask_login import login_required, current_user

permissions_bp = Blueprint('permissions', __name__)

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin required'}), 403
        return f(*args, **kwargs)
    return wrapper

DEFAULT_PERMISSIONS = {
    "pages": {
        "dashboard": {"view": True},
        "storage": {"view": True, "upload": True, "delete": True, "createPool": False, "format": False},
        "aiStudio": {"view": True, "chat": True, "imageGen": True, "manageProviders": False},
        "devices": {"view": True, "add": True, "remove": False, "scan": False},
        "extensions": {"view": True, "install": False, "remove": False, "configure": False},
        "apps": {"view": True, "install": False, "launch": True},
        "systemTools": {"view": False, "processes": False, "services": False, "docker": False, "firewall": False},
        "downloads": {"view": True, "create": True, "cancel": True},
        "tools": {"view": True, "notes": True, "todos": True, "terminal": False},
        "shares": {"view": True, "create": True, "delete": True},
        "trash": {"view": True, "restore": True, "empty": False},
        "notifications": {"view": True, "send": False, "popup": False},
        "settings": {"view": True, "changeTheme": True, "changePassword": True},
        "users": {"view": False, "create": False, "edit": False, "delete": False, "managePermissions": False}
    },
    "features": {
        "aiWidgets": True,
        "customization": True,
        "fileEncryption": False,
        "backups": False,
        "networkScan": False,
        "popupCreator": False,
        "exportData": True,
        "importData": True
    },
    "limits": {
        "storageQuotaMb": 0,
        "maxDevices": 0,
        "maxShares": 50,
        "maxNotifications": 200
    }
}

ADMIN_PERMISSIONS = {
    "pages": {k: {sk: True for sk in v} for k, v in DEFAULT_PERMISSIONS["pages"].items()},
    "features": {k: True for k in DEFAULT_PERMISSIONS["features"]},
    "limits": {"storageQuotaMb": 0, "maxDevices": 0, "maxShares": 9999, "maxNotifications": 9999}
}

def check_permission(page, action='view'):
    from functools import wraps
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                perms = current_user.permissions or {}
            except Exception:
                perms = {}
            pages = perms.get('pages', {})
            page_perms = pages.get(page, {})
            if not page_perms.get(action, False):
                return jsonify({'error': 'Permission denied'}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

def get_merged_permissions(user):
    if user.role == 'admin':
        return ADMIN_PERMISSIONS
    try:
        stored = user.permissions or {}
    except Exception:
        stored = {}
    merged = DEFAULT_PERMISSIONS.copy()
    for section in merged:
        if section in stored:
            if isinstance(merged[section], dict):
                merged[section].update(stored[section])
    return merged

@permissions_bp.route('/default', methods=['GET'])
def get_default_permissions():
    return jsonify(DEFAULT_PERMISSIONS)

@permissions_bp.route('/me', methods=['GET'])
@login_required
def get_my_permissions():
    return jsonify(get_merged_permissions(current_user))

@permissions_bp.route('/<user_id>', methods=['GET'])
@login_required
@admin_required
def get_user_permissions(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(get_merged_permissions(user))

@permissions_bp.route('/<user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user_permissions(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    data = request.json
    user.permissions = data
    db.session.commit()
    return jsonify({'message': 'Permissions updated', 'permissions': get_merged_permissions(user)})
