from main import db
from flask_login import UserMixin
from datetime import datetime
import uuid

def gen_id():
    return str(uuid.uuid4())

class User(UserMixin, db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    avatar = db.Column(db.String(256), default='')
    settings = db.Column(db.JSON, default={})

class StoragePool(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    name = db.Column(db.String(80), default='ALPHA Pool')
    total_size = db.Column(db.BigInteger, default=0)
    used_size = db.Column(db.BigInteger, default=0)
    health = db.Column(db.String(20), default='healthy')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StorageDrive(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    device = db.Column(db.String(80))
    name = db.Column(db.String(120))
    size = db.Column(db.BigInteger, default=0)
    used = db.Column(db.BigInteger, default=0)
    mount_point = db.Column(db.String(256))
    health = db.Column(db.String(20), default='healthy')
    pool_id = db.Column(db.String(64), db.ForeignKey('storage_pool.id'), nullable=True)
    pool = db.relationship('StoragePool', backref=db.backref('drives', lazy=True))

class Device(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    name = db.Column(db.String(120))
    device_type = db.Column(db.String(40))
    ip_address = db.Column(db.String(45))
    mac_address = db.Column(db.String(17))
    status = db.Column(db.String(20), default='offline')
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    paired_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'), nullable=True)

class Extension(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    name = db.Column(db.String(120), unique=True)
    display_name = db.Column(db.String(120))
    description = db.Column(db.Text)
    version = db.Column(db.String(20))
    author = db.Column(db.String(80))
    installed = db.Column(db.Boolean, default=False)
    enabled = db.Column(db.Boolean, default=True)
    permissions = db.Column(db.JSON, default=[])
    settings = db.Column(db.JSON, default={})
    installed_at = db.Column(db.DateTime, default=datetime.utcnow)

class AIModel(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    name = db.Column(db.String(120))
    model_id = db.Column(db.String(120))
    size = db.Column(db.String(20))
    downloaded = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=False)

class ChatMessage(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    role = db.Column(db.String(20))
    content = db.Column(db.Text)
    model = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    title = db.Column(db.String(200))
    message = db.Column(db.Text)
    notification_type = db.Column(db.String(40))
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AppModule(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    name = db.Column(db.String(120), unique=True)
    display_name = db.Column(db.String(120))
    icon = db.Column(db.String(40), default='app')
    description = db.Column(db.Text)
    route = db.Column(db.String(80))
    installed = db.Column(db.Boolean, default=False)
    built_in = db.Column(db.Boolean, default=False)
