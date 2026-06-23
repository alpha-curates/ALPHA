from flask import Blueprint, jsonify, request
from main import db
from models.models import Device, Notification
from flask_login import login_required, current_user
from datetime import datetime
import subprocess
import re
import socket

devices_bp = Blueprint('devices', __name__)

@devices_bp.route('/')
@login_required
def list_devices():
    devices = Device.query.order_by(Device.last_seen.desc()).all()
    return jsonify([{
        'id': d.id, 'name': d.name, 'type': d.device_type,
        'ip': d.ip_address, 'mac': d.mac_address,
        'status': d.status, 'last_seen': d.last_seen.isoformat() if d.last_seen else None
    } for d in devices])

@devices_bp.route('/add', methods=['POST'])
@login_required
def add_device():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    device = Device(
        name=name,
        device_type=data.get('type', 'unknown'),
        ip_address=data.get('ip', ''),
        mac_address=data.get('mac', ''),
        status='approved',
        last_seen=datetime.utcnow()
    )
    db.session.add(device)
    db.session.commit()
    return jsonify({'message': 'Device added', 'id': device.id}), 201

@devices_bp.route('/scan', methods=['POST'])
@login_required
def scan_devices():
    discovered = 0
    try:
        result = subprocess.run(['arp', '-a'], capture_output=True, text=True, timeout=10)
        for line in result.stdout.split('\n'):
            match = re.search(r'\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]+)', line, re.I)
            if match:
                ip, mac = match.groups()
                if not Device.query.filter_by(mac_address=mac).first():
                    try:
                        host = socket.gethostbyaddr(ip)[0]
                    except:
                        host = f'Device-{ip}'
                    device_type = 'unknown'
                    if 'raspberry' in host.lower() or 'pi' in host.lower():
                        device_type = 'raspberry-pi'
                    elif 'esp' in host.lower():
                        device_type = 'esp32'
                    elif 'phone' in host.lower() or 'iphone' in host.lower() or 'android' in host.lower():
                        device_type = 'phone'
                    device = Device(
                        name=host, device_type=device_type,
                        ip_address=ip, mac_address=mac,
                        status='pending', last_seen=datetime.utcnow()
                    )
                    db.session.add(device)
                    discovered += 1
        db.session.commit()
        if discovered > 0:
            admin_notif = Notification(
                user_id=current_user.id, title='New Devices Discovered',
                message=f'{discovered} new device(s) found. Review and approve them.',
                notification_type='system'
            )
            db.session.add(admin_notif)
            db.session.commit()
    except:
        pass
    return jsonify({'message': 'Scan complete', 'discovered': discovered})

@devices_bp.route('/<device_id>/approve', methods=['POST'])
@login_required
def approve_device(device_id):
    device = Device.query.get(device_id)
    if device:
        device.status = 'approved'
        db.session.commit()
    return jsonify({'message': 'Device approved'})

@devices_bp.route('/<device_id>/deny', methods=['POST'])
@login_required
def deny_device(device_id):
    device = Device.query.get(device_id)
    if device:
        device.status = 'denied'
        db.session.commit()
    return jsonify({'message': 'Device denied'})

@devices_bp.route('/<device_id>/rename', methods=['PUT'])
@login_required
def rename_device(device_id):
    device = Device.query.get(device_id)
    if device:
        device.name = request.json.get('name', device.name)
        db.session.commit()
    return jsonify({'message': 'Device renamed'})

@devices_bp.route('/<device_id>', methods=['DELETE'])
@login_required
def delete_device(device_id):
    device = Device.query.get(device_id)
    if device:
        db.session.delete(device)
        db.session.commit()
    return jsonify({'message': 'Device removed'})

@devices_bp.route('/<device_id>/remove', methods=['DELETE'])
@login_required
def remove_device(device_id):
    device = Device.query.get(device_id)
    if device:
        db.session.delete(device)
        db.session.commit()
    return jsonify({'message': 'Device removed'})

@devices_bp.route('/pending')
@login_required
def pending_devices():
    devices = Device.query.filter_by(status='pending').all()
    return jsonify([{
        'id': d.id, 'name': d.name, 'type': d.device_type,
        'ip': d.ip_address, 'mac': d.mac_address,
        'last_seen': d.last_seen.isoformat() if d.last_seen else None
    } for d in devices])
