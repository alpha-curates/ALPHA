from main import db, socketio
from models.models import User, Device, StorageDrive, StoragePool, Extension, AIModel, ChatMessage, Notification, AppModule
from flask import jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import psutil
import os
import platform
import subprocess
import json
import requests
import uuid
from datetime import datetime
