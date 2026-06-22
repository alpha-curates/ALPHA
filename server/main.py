from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config
import jwt

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app)
    socketio.init_app(app)
    login_manager.init_app(app)

    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        from models.models import User
        return User.query.get(user_id)

    @login_manager.request_loader
    def load_user_from_request(req):
        from models.models import User
        auth = req.headers.get('Authorization', '').replace('Bearer ', '')
        if not auth:
            return None
        try:
            data = jwt.decode(auth, Config.JWT_SECRET, algorithms=['HS256'])
            return User.query.get(data.get('user_id'))
        except:
            return None

    from api.auth import auth_bp
    from api.storage import storage_bp
    from api.devices import devices_bp
    from api.ai import ai_bp
    from api.extensions import extensions_bp
    from api.system import system_bp
    from api.notifications import notifications_bp
    from api.users import users_bp
    from api.remote import remote_bp
    from api.apps import apps_bp
    from api.popups import popups_bp
    from api.shares import shares_bp
    from api.trash import trash_bp
    from api.recent import recent_bp
    from api.tools import tools_bp
    from api.system_tools import sys_tools_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(storage_bp, url_prefix='/api/storage')
    app.register_blueprint(devices_bp, url_prefix='/api/devices')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(extensions_bp, url_prefix='/api/extensions')
    app.register_blueprint(system_bp, url_prefix='/api/system')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(remote_bp, url_prefix='/api/remote')
    app.register_blueprint(apps_bp, url_prefix='/api/apps')
    app.register_blueprint(popups_bp, url_prefix='/api/popups')
    app.register_blueprint(shares_bp, url_prefix='/api/shares')
    app.register_blueprint(trash_bp, url_prefix='/api/trash')
    app.register_blueprint(recent_bp, url_prefix='/api')
    app.register_blueprint(tools_bp, url_prefix='/api/tools')
    app.register_blueprint(sys_tools_bp, url_prefix='/api/system')

    @app.route('/api/status')
    def status():
        return jsonify({'status': 'online', 'name': 'ALPHA', 'version': '1.0.0'})

    with app.app_context():
        db.create_all()

    return app
