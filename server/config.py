import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'alpha-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///alpha.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'storage'))
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    JWT_SECRET = os.getenv('JWT_SECRET', 'alpha-jwt-secret-change-in-production-make-it-longer')
    CORE_PORT = int(os.getenv('CORE_PORT', 5000))
    UI_PORT = int(os.getenv('UI_PORT', 3000))
