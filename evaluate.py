#!/usr/bin/env python3
import os
import json
import numpy as np
import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report

def time_to_seconds(t_str):
    try:
        parts = t_str.split(':')
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return 0
    except Exception:
        try:
            return int(t_str)
        except Exception:
            return 0

def run_evaluation():
    print("Running Performance Evaluation on Bank Fraud Anomaly Detection...")
    
    csv_path = 'Bank-Application_User_Dataset.csv'
    model_path = 'isolation_model.pkl'
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found!")
        return
        
    # Read and clean data
    data = pd.read_csv(csv_path)
    data = data.dropna()
    data = data.drop_duplicates()
    
    # Preprocess
    data['time_seconds'] = data['time'].apply(time_to_seconds)
    tag_mapper = {'abnormal': 0, 'normal': 1}
    data['tag_encoded'] = data['tag'].map(tag_mapper)
    
    X = data[['amount', 'time_seconds', 'attempts', 'seconds']]
    y = data['tag_encoded']
    
    # 80/20 Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Load model
    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print("Loaded existing model from isolation_model.pkl")
    else:
        print("Model file not found! Training a new one first...")
        from sklearn.ensemble import IsolationForest
        try:
            from imblearn.over_sampling import SMOTE
            sm = SMOTE(random_state=42)
            X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        except ImportError:
            # Simple balancing
            from train import custom_oversample
            X_train_res, y_train_res = custom_oversample(X_train, y_train)
            
        model = IsolationForest(contamination='auto', random_state=42)
        model.fit(X_train_res)
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        print("Trained and saved new model.")
        
    # Predict on test set
    y_pred_raw = model.predict(X_test)
    y_pred = np.where(y_pred_raw == -1, 0, 1)
    
    # Generate report
    report = classification_report(y_test, y_pred, output_dict=True)
    print("Classification Report:\n", classification_report(y_test, y_pred))
    
    # Generate Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:\n", cm)
    
    # Save the evaluation results as a JSON
    eval_results = {
        'classification_report': report,
        'confusion_matrix': {
            'tn': int(cm[0][0]),
            'fp': int(cm[0][1]),
            'fn': int(cm[1][0]),
            'tp': int(cm[1][1])
        }
    }
    with open('evaluation_results.json', 'w') as f:
        json.dump(eval_results, f)
    print("Saved evaluation_results.json")
    
    # Generate Confusion Matrix PNG
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        plt.figure(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
                    xticklabels=['Abnormal (0)', 'Normal (1)'],
                    yticklabels=['Abnormal (0)', 'Normal (1)'])
        plt.ylabel('Actual Category')
        plt.xlabel('Predicted Category')
        plt.title('Confusion Matrix - Real-Time Fraud Detection')
        plt.tight_layout()
        
        # Ensure public/ directory exists
        os.makedirs('public', exist_ok=True)
        plt.savefig('public/confusion_matrix.png', dpi=150)
        plt.savefig('confusion_matrix.png', dpi=150)
        print("Saved confusion_matrix.png under public/ and root")
    except Exception as e:
        print(f"Skipped plotting confusion matrix png due to missing libraries: {e}")

if __name__ == '__main__':
    run_evaluation()
