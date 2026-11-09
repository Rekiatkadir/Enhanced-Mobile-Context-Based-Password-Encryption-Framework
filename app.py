#!/usr/bin/env python3
import os
import json
import sqlite3
import pickle
import numpy as np
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify
from crypto_helper import convert_password_to_key, validate_password, context_encryption, context_dencryption

app = Flask(__name__)
app.secret_key = os.urandom(24)

DB_FILE = 'bank_app.db'
MODEL_FILE = 'isolation_model.pkl'

# Thresholds for the four unusual-activity checks (any one prompts Date of Birth)
UNUSUAL_AMOUNT = 200000       # 1. transfer amount above this is unusual
UNUSUAL_TRIAL_COUNT = 4       # 2. more than 4 PIN attempts (5 or more) is unusual
PIN_LOCK_FAILURES = 4         # wrong PINs in one transfer before the DOB page opens
UNUSUAL_NIGHT_START = 22      # 3. transfers from 22:00
UNUSUAL_NIGHT_END = 6         #    to 05:59 are unusual
UNUSUAL_ENTRY_SECONDS = 13    # 4. PIN entry duration above this is unusual

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt BLOB NOT NULL,
            dob TEXT NOT NULL, -- Format YYYY-MM-DD
            account_number TEXT UNIQUE NOT NULL,
            balance REAL NOT NULL DEFAULT 5000.0
        )
    ''')
    
    # Create Transactions table with encrypted context columns
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipient_name TEXT NOT NULL,
            recipient_account TEXT NOT NULL,
            enc_amount TEXT NOT NULL,
            enc_time TEXT NOT NULL,
            enc_trial_count TEXT NOT NULL,
            enc_password_session TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL, -- Approved, Pending DOB, Denied
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Check if a default user exists, if not create one
    cursor.execute("SELECT * FROM users WHERE email = 'user@bank.com'")
    if not cursor.fetchone():
        # Default user with: password 'password123', dob '1995-08-15', balance 50000.0
        salt, key = convert_password_to_key('password123')
        cursor.execute('''
            INSERT INTO users (email, full_name, password_hash, salt, dob, account_number, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            'user@bank.com',
            'Jane Doe',
            key.decode('utf-8'),
            salt,
            '1995-08-15',
            '4758219630',
            50000.0
        ))
        
    # Add transfer PIN columns to existing databases (safe to run repeatedly)
    existing = {row[1] for row in cursor.execute("PRAGMA table_info(users)").fetchall()}
    if 'pin_hash' not in existing:
        cursor.execute("ALTER TABLE users ADD COLUMN pin_hash TEXT")
    if 'pin_salt' not in existing:
        cursor.execute("ALTER TABLE users ADD COLUMN pin_salt BLOB")

    conn.commit()
    conn.close()

# Ensure model and db are initialized on startup
init_db()

def load_prediction_model():
    if os.path.exists(MODEL_FILE):
        with open(MODEL_FILE, 'rb') as f:
            return pickle.load(f)
    return None

def anomaly_reasons(context_data):
    """Applies the four CBIF thresholds and lists which ones were triggered."""
    reasons = []
    if context_data['amount'] > UNUSUAL_AMOUNT:
        reasons.append('Unusual transfer amount')
    if context_data['attempts'] > UNUSUAL_TRIAL_COUNT:
        reasons.append('Unusual PIN trial count')
    t = context_data['time_seconds']
    if t >= UNUSUAL_NIGHT_START * 3600 or t < UNUSUAL_NIGHT_END * 3600:
        reasons.append('Unusual timestamp')
    if context_data['seconds'] > UNUSUAL_ENTRY_SECONDS:
        reasons.append('Unusual PIN entry duration')
    return reasons

def isolation_forest_predict(context_data):
    """CBIF Isolation Forest decision using the four thresholds.
    Returns 1 when no anomaly is detected, 0 when an anomaly is detected
    (Algorithm 1: 1 = data transmitted, 0 = input DOB)."""
    return 0 if anomaly_reasons(context_data) else 1

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()
        
        if user and validate_password(password, user['salt'], user['password_hash']):
            session['user_id'] = user['id']
            session['user_name'] = user['full_name']
            session['user_key'] = user['password_hash'] # Using our derived b64 password key as transaction key
            flash('Logged in successfully!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'error')
            
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    user_id = session['user_id']
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    
    cursor.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC", (user_id,))
    encrypted_transactions = cursor.fetchall()
    
    # Decrypt transaction context on-the-fly for show in table
    user_key = session['user_key']
    transactions = []
    
    for tx in encrypted_transactions:
        try:
            enc_dict = {
                'amount': tx['enc_amount'],
                'time': tx['enc_time'],
                'trial_count': tx['enc_trial_count'],
                'password_session': tx['enc_password_session']
            }
            decrypted = context_dencryption(enc_dict, user_key)
            transactions.append({
                'id': tx['id'],
                'recipient_name': tx['recipient_name'],
                'recipient_account': tx['recipient_account'],
                'amount': decrypted['amount'],
                'timestamp': tx['timestamp'],
                'status': tx['status']
            })
        except Exception as e:
            print(f"Error decrypting transaction {tx['id']}: {e}")
            transactions.append({
                'id': tx['id'],
                'recipient_name': tx['recipient_name'],
                'recipient_account': tx['recipient_account'],
                'amount': 'Error (Decryption Failed)',
                'timestamp': tx['timestamp'],
                'status': 'Error'
            })
            
    conn.close()
    return render_template('dashboard.html', user=user, transactions=transactions)

@app.route('/lookup_account')
def lookup_account():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    account = (request.args.get('account') or '').strip()
    if not (len(account) == 10 and account.isdigit()):
        return jsonify({'error': 'Account number must be 10 digits.'}), 400
    conn = get_db()
    row = conn.execute("SELECT full_name FROM users WHERE account_number = ?", (account,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'No account found with this number.'}), 404
    return jsonify({'name': row['full_name']})

@app.route('/transfer', methods=['GET', 'POST'])
def transfer():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        # The PIN pop-up submits with this header, so it can receive JSON errors
        def is_ajax():
            return request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        def fail(message):
            if is_ajax():
                return jsonify({'error': message}), 400
            flash(message, 'error')
            return redirect(url_for('transfer'))

        # A transfer locked by 4 wrong PINs must finish on the DOB page first
        if session.get('pin_lock'):
            return fail('Complete the Date of Birth verification for your pending transfer first.')

        recipient_account = (request.form.get('recipient_account') or '').strip()
        if not (len(recipient_account) == 10 and recipient_account.isdigit()):
            return fail('Receiver account number must be exactly 10 digits.')
        # The recipient name always comes from the account, not from the typed text
        conn = get_db()
        found = conn.execute("SELECT full_name FROM users WHERE account_number = ?", (recipient_account,)).fetchone()
        conn.close()
        if not found:
            return fail('No account found with this receiver account number.')
        recipient_name = found['full_name']
        amount = float(request.form.get('amount'))
        pin = (request.form.get('pin') or '').strip()
        if not (len(pin) == 4 and pin.isdigit()):
            return fail('Transfer PIN must be exactly 4 digits.')
        # Check the transfer PIN against the sender's stored PIN hash
        conn = get_db()
        sender = conn.execute("SELECT pin_hash, pin_salt, password_hash FROM users WHERE id = ?", (session['user_id'],)).fetchone()
        conn.close()
        # Context key check (Algorithm 1): the session key must match the stored key
        if not sender or session.get('user_key') != sender['password_hash']:
            return fail('Invalid context key. Please log in again.')
        if not sender['pin_hash'] or not validate_password(pin, sender['pin_salt'], sender['pin_hash']):
            # Server-side attempt count: each wrong PIN in this session is counted
            session['pin_failures'] = session.get('pin_failures', 0) + 1
            if session['pin_failures'] >= PIN_LOCK_FAILURES:
                # 4th wrong PIN: record the transfer as Pending DOB and open the DOB page.
                # The correct PIN is still required after DOB (pin_lock).
                failures = session.pop('pin_failures')
                try:
                    pe = float(request.form.get('pin_entry_seconds') or 0)
                except ValueError:
                    pe = 0.0
                ts_now = datetime.now()
                enc = context_encryption(amount, ts_now.strftime("%H:%M:%S"), failures,
                                         int(round(pe)), session['user_key'])
                conn = get_db()
                cur = conn.cursor()
                cur.execute('''
                    INSERT INTO transactions (user_id, recipient_name, recipient_account,
                                              enc_amount, enc_time, enc_trial_count, enc_password_session,
                                              timestamp, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (session['user_id'], recipient_name, recipient_account,
                      enc['amount'], enc['time'], enc['trial_count'], enc['password_session'],
                      ts_now.strftime("%Y-%m-%d %H:%M:%S"), 'Pending DOB'))
                tx_id = cur.lastrowid
                conn.commit()
                conn.close()
                session['pending_tx_id'] = tx_id
                session['anomaly_reasons'] = ['Unusual PIN trial count']
                session['pin_lock'] = True
                if is_ajax():
                    return jsonify({'redirect': url_for('verify_dob')})
                return redirect(url_for('verify_dob'))
            return fail('Incorrect PIN. Please try again.')
        # Trial attempts = wrong PINs before this correct one, plus this one (set by the server, not the user)
        attempts = session.pop('pin_failures', 0) + 1
        try:
            pin_entry_seconds = float(request.form.get('pin_entry_seconds') or 0)
        except ValueError:
            pin_entry_seconds = 0.0
        # PIN entry duration replaces the old session-duration input (same model feature slot)
        seconds = int(round(pin_entry_seconds))
        
        user_id = session['user_id']
        user_key = session['user_key']
        now = datetime.now()
        current_time_str = now.strftime("%H:%M:%S")
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
        
        # Determine time in seconds for model prediction
        parts = current_time_str.split(':')
        time_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        
        # Context data feeds the Isolation Forest decision (Algorithm 1)
        context_data = {
            'amount': amount,
            'time_seconds': time_seconds,
            'attempts': attempts,
            'seconds': seconds
        }
        prediction = isolation_forest_predict(context_data)  # 1 = normal, 0 = anomaly
        is_anomaly = (prediction == 0)
        reasons = anomaly_reasons(context_data) if is_anomaly else []
                
        # Context-based Encryption using the Derived Password Key
        enc_context = context_encryption(amount, current_time_str, attempts, seconds, user_key)
        
        # Save transaction in Pending or Approved State
        status = 'Pending DOB' if is_anomaly else 'Approved'
        
        conn = get_db()
        cursor = conn.cursor()
        
        if not is_anomaly:
            # Dedust the user's balance
            cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
            current_balance = cursor.fetchone()['balance']
            if current_balance < amount:
                conn.close()
                return fail('Insufficient funds for this transfer.')
                
            cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user_id))
            # Credit the receiver's account
            cursor.execute("UPDATE users SET balance = balance + ? WHERE account_number = ?", (amount, recipient_account))
            
        cursor.execute('''
            INSERT INTO transactions (user_id, recipient_name, recipient_account, 
                                      enc_amount, enc_time, enc_trial_count, enc_password_session, 
                                      timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, recipient_name, recipient_account, 
              enc_context['amount'], enc_context['time'], enc_context['trial_count'], enc_context['password_session'],
              timestamp_str, status))
              
        tx_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        if is_anomaly:
            # Route to Date of Birth verifier (DOB alone is enough here; PIN was already correct)
            session['pending_tx_id'] = tx_id
            session['anomaly_reasons'] = reasons
            session.pop('pin_lock', None)
            if is_ajax():
                return jsonify({'redirect': url_for('verify_dob')})
            return redirect(url_for('verify_dob'))
        else:
            flash(f"Transfer of ${amount:.2f} to {recipient_name} was approved instantly!", "success")
            if is_ajax():
                return jsonify({'redirect': url_for('result', tx_id=tx_id)})
            return redirect(url_for('result', tx_id=tx_id))
            
    return render_template('transfer.html')

@app.route('/verify_dob', methods=['GET', 'POST'])
def verify_dob():
    if 'user_id' not in session or 'pending_tx_id' not in session:
        return redirect(url_for('dashboard'))
        
    tx_id = session['pending_tx_id']
    user_id = session['user_id']
    
    if request.method == 'POST':
        dob_input = request.form.get('dob')
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT dob FROM users WHERE id = ?", (user_id,))
        actual_dob = cursor.fetchone()['dob']
        
        if dob_input == actual_dob and session.get('pin_lock'):
            # After 4 wrong PINs the correct transfer PIN is also required
            pin_input = (request.form.get('pin') or '').strip()
            cursor.execute("SELECT pin_hash, pin_salt FROM users WHERE id = ?", (user_id,))
            p = cursor.fetchone()
            pin_ok = (len(pin_input) == 4 and pin_input.isdigit() and p['pin_hash']
                      and validate_password(pin_input, p['pin_salt'], p['pin_hash']))
            if not pin_ok:
                conn.close()
                flash('DOB verified. Now enter your correct transfer PIN to complete the transfer.', 'error')
                return redirect(url_for('verify_dob'))

        if dob_input == actual_dob:
            # Correct DOB -> Approve transaction & Deduct Funds
            session.pop('pin_lock', None)
            cursor.execute("SELECT enc_amount, enc_time, enc_trial_count, enc_password_session, recipient_account FROM transactions WHERE id = ?", (tx_id,))
            tx = cursor.fetchone()
            
            # Decrypt amount (all encrypted fields are required by the decryptor)
            user_key = session['user_key']
            enc_dict = {
                'amount': tx['enc_amount'],
                'time': tx['enc_time'],
                'trial_count': tx['enc_trial_count'],
                'password_session': tx['enc_password_session']
            }
            try:
                decrypted = context_dencryption(enc_dict, user_key)
                amount = float(decrypted['amount'])
            except Exception:
                amount = 0.0 # Fallback
                
            cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
            current_balance = cursor.fetchone()['balance']
            
            if current_balance >= amount:
                cursor.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user_id))
                # Credit the receiver's account
                cursor.execute("UPDATE users SET balance = balance + ? WHERE account_number = ?", (amount, tx['recipient_account']))
                cursor.execute("UPDATE transactions SET status = 'Approved' WHERE id = ?", (tx_id,))
                conn.commit()
                flash('DOB Verified successfully! Transaction approved.', 'success')
                session.pop('pending_tx_id', None)
                conn.close()
                return redirect(url_for('result', tx_id=tx_id))
            else:
                flash('Insufficient funds to complete transaction after approval.', 'error')
                session.pop('pin_lock', None)
                cursor.execute("UPDATE transactions SET status = 'Denied' WHERE id = ?", (tx_id,))
                conn.commit()
                session.pop('pending_tx_id', None)
                conn.close()
                return redirect(url_for('dashboard'))
        else:
            # Incorrect DOB -> Deny access
            session.pop('pin_lock', None)
            cursor.execute("UPDATE transactions SET status = 'Denied' WHERE id = ?", (tx_id,))
            conn.commit()
            conn.close()
            flash('Incorrect Date of Birth entered. Access denied and transaction blocked.', 'error')
            session.pop('pending_tx_id', None)
            return redirect(url_for('dashboard'))
            
    return render_template('verify_dob.html', reasons=session.get('anomaly_reasons', []),
                          pin_required=bool(session.get('pin_lock')))

@app.route('/result/<int:tx_id>')
def result(tx_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    tx = cursor.fetchone()
    conn.close()
    
    if not tx or tx['user_id'] != session['user_id']:
        return redirect(url_for('dashboard'))
        
    return render_template('result.html', tx=tx)

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
