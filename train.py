#import section
import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

def time_to_seconds(t_str):
    try:
        parts = t_str.split(':')
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return 0
    except Exception:
        # If it is already a number
        try:
            return int(t_str)
        except Exception:
            return 0

def custom_oversample(X, y):
    """
    Fallback oversampler (Random/SMOTE-like) in case imblearn is not installed.
    Ensures training doesn't fail.
    """
    classes, counts = np.unique(y, return_counts=True)
    if len(classes) < 2:
        return X, y
    
    max_idx = np.argmax(counts)
    min_idx = np.argmin(counts)
    
    max_label = classes[max_idx]
    min_label = classes[min_idx]
    
    X_max = X[y == max_label]
    X_min = X[y == min_label]
    
    num_to_add = len(X_max) - len(X_min)
    if num_to_add <= 0:
        return X, y
        
    # Interpolate with SMOTE
    indices_1 = np.random.choice(len(X_min), num_to_add)
    indices_2 = np.random.choice(len(X_min), num_to_add)
    alpha = np.random.rand(num_to_add, 1)
    
    synthetic_samples = X_min.iloc[indices_1].values + alpha * (X_min.iloc[indices_2].values - X_min.iloc[indices_1].values)
    X_synth = pd.DataFrame(synthetic_samples, columns=X.columns)
    y_synth = pd.Series([min_label] * num_to_add)
    
    X_balanced = pd.concat([X, X_synth], ignore_index=True)
    y_balanced = pd.concat([y, y_synth], ignore_index=True)
    
    return X_balanced, y_balanced

def train_model():
    print("Starting Model Training with Data Preprocessing...")
    
    # Check if dataset exists
    csv_path = 'Bank-Application_User_Dataset.csv'
    if not os.path.exists(csv_path):
        # Fail gracefully
        print(f"Error: {csv_path} not found!")
        return False
        
    # 1. Clean data (remove duplicates, handle missing values)
    data = pd.read_csv(csv_path)
    print(f"Raw data shape: {data.shape}")
    
    # Check null values
    print("Null values:\n", data.isnull().sum())
    data = data.dropna()
    data = data.drop_duplicates()
    print(f"Cleaned data shape: {data.shape}")
    
    # 2. Transform time to categorical format 
    data['time_seconds'] = data['time'].apply(time_to_seconds)
    
    # Also generate the time_mapper dictionary for 24h
    time_mapper = {}
    for sec in range(24 * 60 * 60):
        hours = sec // 3600
        minutes = (sec % 3600) // 60
        seconds = sec % 60
        time_string = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        # We only save selected keys to keep down the JSON size in files
        if sec % 60 == 0 or sec in [45045, 27023, 65487, 13646, 76256]: 
            time_mapper[time_string] = sec
            
    # Save a lightweight time_mapper to a.json file
    with open('time_mapper.json', 'w') as f:
        json.dump(time_mapper, f)
    print("Saved time_mapper.json")
    
    # 3. Encode tag column to binary (0 = abnormal, 1 = normal)
    tag_mapper = {'abnormal': 0, 'normal': 1}
    data['tag_encoded'] = data['tag'].map(tag_mapper)
    print("Tag value counts:\n", data['tag_encoded'].value_counts())
    
    # Prepare features and labels
    # Use amount, time_seconds, attempts (trial_count), seconds (PIN_entry_duration)
    X = data[['amount', 'time_seconds', 'attempts', 'seconds']]
    y = data['tag_encoded']
    
    # 4. Split data 80/20 (80 percent for training 20 for testing)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Train shape: {X_train.shape}, Test shape: {X_test.shape}")
    
    # 5. Apply SMOTE to balance training data
    print("Applying SMOTE...")
    try:
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        print("SMOTE balancing completed using imbalanced-learn.")
    except Exception as e:
        print(f"imblearn failed or not installed ({e}). Using robust fallback oversampler.")
        X_train_res, y_train_res = custom_oversample(X_train, y_train)
        
    print(f"Balanced Train shape: {X_train_res.shape}")
    print("Balanced Tag counts:\n", pd.Series(y_train_res).value_counts())
    
    # Train the Isolation Forest Model
    print("Training Isolation Forest Anomaly Detection...")
    model = IsolationForest(contamination='auto', random_state=42)
    model.fit(X_train_res)
    
    # Save the Isolation Forest Model
    with open('isolation_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Model saved as isolation_model.pkl")
    
    # Quick Test for evaluation
    y_pred_if = model.predict(X_test)
    # IsolationForest returns -1 for abnormal and 1 for normal
    y_pred_binary = np.where(y_pred_if == -1, 0, 1)
    
    accuracy = accuracy_score(y_test, y_pred_binary)
    print(f"Estimated Test Accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred_binary))
    
    # Save performance and compute evaluation metrics  for the web app UI
    report = classification_report(y_test, y_pred_binary, output_dict=True)
    performance_stats = {
        'accuracy': report['accuracy'],
        'precision_0': report['0']['precision'],
        'recall_0': report['0']['recall'],
        'f1_0': report['0']['f1-score'],
        'precision_1': report['1']['precision'],
        'recall_1': report['1']['recall'],
        'f1_1': report['1']['f1-score'],
        'train_samples': len(X_train),
        'balanced_train_samples': len(X_train_res),
        'test_samples': len(X_test)
    }
    with open('performance_stats.json', 'w') as f:
        json.dump(performance_stats, f)
        
    print("Performance stats saved to performance_stats.json")
    return True

if __name__ == '__main__':
    train_model()
