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
    storage_path = db.Column(db.String(256), default='')
    is_external = db.Column(db.Boolean, default=False)
    uuid = db.Column(db.String(80), default='')

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
    conversation_id = db.Column(db.String(64), db.ForeignKey('conversation.id'), nullable=True)
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

class Popup(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    popup_type = db.Column(db.String(40), default='info')
    created_by = db.Column(db.String(64), db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    active = db.Column(db.Boolean, default=True)

class PopupView(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    popup_id = db.Column(db.String(64), db.ForeignKey('popup.id'))
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)

class TrashItem(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    original_path = db.Column(db.String(1024), nullable=False)
    storage_path = db.Column(db.String(1024), nullable=False)
    file_name = db.Column(db.String(256), nullable=False)
    file_size = db.Column(db.BigInteger, default=0)
    deleted_by = db.Column(db.String(64), db.ForeignKey('user.id'))
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

class ShareLink(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    file_path = db.Column(db.String(1024), nullable=False)
    file_name = db.Column(db.String(256))
    token = db.Column(db.String(128), unique=True, nullable=False)
    password = db.Column(db.String(256))
    expires_at = db.Column(db.DateTime)
    max_downloads = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    created_by = db.Column(db.String(64), db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    active = db.Column(db.Boolean, default=True)

class RecentFile(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    file_path = db.Column(db.String(1024), nullable=False)
    file_name = db.Column(db.String(256))
    file_type = db.Column(db.String(40))
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)

class Favorite(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    file_path = db.Column(db.String(1024), nullable=False)
    file_name = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Note(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    title = db.Column(db.String(256), default='Untitled')
    content = db.Column(db.Text, default='')
    category = db.Column(db.String(40), default='personal')
    pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Todo(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    title = db.Column(db.String(512), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='medium')
    due_date = db.Column(db.DateTime)
    category = db.Column(db.String(40), default='general')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Bookmark(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    title = db.Column(db.String(256))
    url = db.Column(db.String(1024), nullable=False)
    favicon = db.Column(db.String(1024))
    folder = db.Column(db.String(80), default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AiProvider(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    name = db.Column(db.String(80), nullable=False)
    provider_type = db.Column(db.String(40), nullable=False)
    api_key = db.Column(db.String(256), default='')
    api_url = db.Column(db.String(256), default='')
    models = db.Column(db.Text, default='[]')
    default_model = db.Column(db.String(120), default='')
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatAttachment(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    message_id = db.Column(db.String(64), db.ForeignKey('chat_message.id'))
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    file_name = db.Column(db.String(256))
    file_path = db.Column(db.String(1024))
    file_type = db.Column(db.String(80))
    file_size = db.Column(db.BigInteger, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GithubRepo(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    repo_full = db.Column(db.String(256), nullable=False)
    repo_name = db.Column(db.String(120))
    repo_owner = db.Column(db.String(120))
    branch = db.Column(db.String(120), default='main')
    access_token = db.Column(db.String(256), default='')
    connected_at = db.Column(db.DateTime, default=datetime.utcnow)

class BackupJob(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    name = db.Column(db.String(256), nullable=False)
    source_path = db.Column(db.String(1024), nullable=False)
    dest_path = db.Column(db.String(1024), nullable=False)
    schedule = db.Column(db.String(40), default='manual')
    enabled = db.Column(db.Boolean, default=True)
    include_patterns = db.Column(db.Text, default='*')
    exclude_patterns = db.Column(db.Text, default='')
    last_run = db.Column(db.DateTime)
    last_status = db.Column(db.String(20), default='never')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Download(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'))
    url = db.Column(db.String(2048), nullable=False)
    filename = db.Column(db.String(256))
    status = db.Column(db.String(20), default='downloading')
    total_bytes = db.Column(db.BigInteger, default=0)
    downloaded_bytes = db.Column(db.BigInteger, default=0)
    speed = db.Column(db.Float, default=0)
    error = db.Column(db.Text)
    file_path = db.Column(db.String(1024))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

class Metric(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    cpu_percent = db.Column(db.Float)
    memory_percent = db.Column(db.Float)
    memory_used = db.Column(db.BigInteger)
    memory_total = db.Column(db.BigInteger)
    disk_percent = db.Column(db.Float)
    disk_used = db.Column(db.BigInteger)
    disk_total = db.Column(db.BigInteger)
    net_sent = db.Column(db.BigInteger, default=0)
    net_recv = db.Column(db.BigInteger, default=0)

class BackupArchive(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    filename = db.Column(db.String(256), nullable=False)
    filepath = db.Column(db.String(1024), nullable=False)
    size_bytes = db.Column(db.BigInteger, default=0)
    includes_storage = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.String(64), db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Conversation(db.Model):
    id = db.Column(db.String(64), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(64), db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(256), default='New Chat')
    system_prompt = db.Column(db.Text, default='')
    provider_id = db.Column(db.String(64), db.ForeignKey('ai_provider.id'), nullable=True)
    model = db.Column(db.String(120), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
