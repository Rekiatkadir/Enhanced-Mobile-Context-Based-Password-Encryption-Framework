# Paper Tittle : Enhanced Mobile Context Based Password Encryption Framework
#Authors  :Rekiat Shola Kadir, Rasheed Gbenga Jimoh,Abdulrauf Gidado

This is a robust, production-ready implementation of a mobile banking application that models user transaction behaviors dynamically. It integrates context-based encryption with an unsupervised machine learning model (**scikit-learn's Isolation Forest**) to predict and restrict suspicious or anomalous transaction patterns instantly.

---

## Technical Features

1. **Synthetic Minority Over-sampling Technique (SMOTE)**: Solves the dataset imbalance completely by upsampling minority (unusual) categories, improving Isolation Forest discrimination.
2. **Context-Based Cryptography**: Performs secure PBKDF2 double key derivation (using SHA256 with 480,000 iterations) from passwords to secure individualized Fernet (AES-128) context-level encryptions. Sensitive fields (`amount`, `time`, `attempts`, `seconds`) are stored as ciphertexts.
3. **Adaptive Authentication (Anomaly Detection With Isolation Forest**:
   - Evaluates context signatures in real-time.
   - If marked safe (Normal), the transaction closes instantly.
   - If flagged as suspicious (Abnormal), prompt-triggered adaptive Date of Birth (DOB) authentication is invoked to authenticate and clear the transaction safely.
   
## Consideration for suspicious Activities

1. The four threshold rules that now decide the Date of Birth prompt, and the 22:00 to 05:59 night window.
2. The 4-digit transfer PIN, the PIN pop-up, and the wrong-PIN lockout after 4 attempts.
3. The account lookup that fills in the recipient name.
4. The 10-digit account numbers and the 400 added users.

---

## Directory Structure

```text
├── Bank-Application_User_Dataset.csv   # Target transaction profile dataset
├── app.py                             # Secure Flask core web server
├── train.py                           # Data balancing & Isolation Forest training
├── evaluate.py                        # Model evaluation & confusion matrix generator
├── crypto_helper.py                   # Cryptographic double PBKDF2/Fernet routines
├── requirements.txt                   # Stable python packages dependencies
└── templates/                         # Frontend dashboard, authentication, & results views
    ├── login.html
    ├── dashboard.html
    ├── transfer.html
    ├── verify_dob.html
    └── result.html
```

---

## Installation & Running Instructions

### 1. Prerequisite Installations
Ensure that you have **Python 3.10+** installed on your workstation. Install all dependencies:

```bash
pip install -r requirements.txt
```

### 2. Train the Model & Generate Analytics
Train the Isolation Forest model using the SMOTE-balanced transaction dataset and generate the necessary mappings and metrics:

```bash
python train.py
```

To run detailed performance evaluation and output the classification matrix image, run:

```bash
python evaluate.py
```

### 3. Run the Flask Web Application
Once the model is successfully trained, start the bank mobile web server:

```bash
python app.py
```

Access the app in your browser at:
**[http://localhost:5000](http://localhost:5000)**

#### Sandbox Login Credentials
- **Email:** `user@bank.com`
- **Password:** `password123`
- **Verification Date of Birth:** `1995-08-15`




cd "/home/l2e/Desktop/rekiat files/CBIF-Code-2-main"
source venv/bin/activate
python app.py
# Enhanced-Mobile-Context-Based-Password-Encryption-Framework
# Enhanced-Mobile-Context-Based-Password-Encryption-Framework
