export interface Transaction {
  id: string;
  recipient_name: string;
  recipient_account: string;
  amount: number;
  timestamp: string;
  status: 'Approved' | 'Pending DOB' | 'Denied';
  attempts: number;
  seconds: number;
  encrypted_amount?: string;
  encrypted_time?: string;
}

export interface User {
  full_name: string;
  email: string;
  account_number: string;
  balance: number;
  dob: string;
}

export interface ModelStatus {
  dataset_exists: boolean;
  model_exists: boolean;
  confusion_matrix_exists: boolean;
  evaluation_exists: boolean;
}

export interface EvalResults {
  classification_report?: {
    accuracy: number;
    '0': { precision: number; recall: number; 'f1-score': number };
    '1': { precision: number; recall: number; 'f1-score': number };
  };
  confusion_matrix?: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}
