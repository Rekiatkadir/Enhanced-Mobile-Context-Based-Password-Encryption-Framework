import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def convert_password_to_key(password):
    """
    Derives a 32-byte key from a password using PBKDF2HMAC with 480,000 iterations.
    """
    byte_password = password.encode('utf-8')
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(byte_password))
    return salt, key

def validate_password(password, salt, stored_key):
    """
    Verifies if a password matches a stored key given its salt.
    """
    try:
        if isinstance(salt, str):
            # Try to decode from hex or base64 if it's stored as string
            try:
                salt = base64.b64decode(salt)
            except Exception:
                try:
                    salt = bytes.fromhex(salt)
                except Exception:
                    salt = salt.encode('utf-8')
                    
        if isinstance(stored_key, str):
            stored_key = stored_key.encode('utf-8')
            
        byte_password = password.encode('utf-8')
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(byte_password))
        auth = (derived_key == stored_key)
        return auth
    except Exception as e:
        print(f"Error during validation: {e}")
        return False

def context_encryption(amount, time, trial_count, password_session, key):
    """
    Fernet encrypts the transaction context fields individually.
    """
    if isinstance(key, str):
        key = key.encode('utf-8')
    cipher_suite = Fernet(key)
    
    context_raw = {
        'amount': str(amount),
        'time': str(time),
        'trial_count': str(trial_count),
        'password_session': str(password_session)
    }
    
    context_encript = {
        'amount': '',
        'time': '',
        'trial_count': '',
        'password_session': ''
    }
    
    for k, val in context_raw.items():
        byte_value = val.encode('utf-8')
        # Fernet returns bytes, let's keep it as string (latin-1 or base64) to store nicely in DB/JSON
        enc_bytes = cipher_suite.encrypt(byte_value)
        context_encript[k] = enc_bytes.decode('latin-1')
        
    return context_encript

def context_dencryption(encrypt_diction, key):
    """
    Decrypts the transaction context back to cleartext.
    Supports 'context_dencryption' as per project typo guidelines.
    """
    if isinstance(key, str):
        key = key.encode('utf-8')
    cipher_suite = Fernet(key)
    
    context_dencript = {
        'amount': '',
        'time': '',
        'trial_count': '',
        'password_session': ''
    }
    
    for k, val in encrypt_diction.items():
        if isinstance(val, str):
            val = val.encode('latin-1')
        dec_val = cipher_suite.decrypt(val)
        context_dencript[k] = dec_val.decode('utf-8')
        
    return context_dencript
