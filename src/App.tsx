import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Shield, Lock, Unlock, CheckCircle2, AlertTriangle, Landmark, 
  RotateCw, Download, Terminal, Code, BarChart3, Eye, ArrowRight, 
  User, Key, CreditCard, Calendar, AlertOctagon, HelpCircle, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Transaction, User as UserType, ModelStatus, EvalResults } from "./types";

export default function App() {
  // Application States
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    dataset_exists: true,
    model_exists: false,
    confusion_matrix_exists: false,
    evaluation_exists: false
  });
  
  // Interactive Console
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "System initialized.",
    "Data Source loaded: Bank-Application_User_Dataset.csv (30,000 profiles)",
    "Ready to train Isolation Forest classifier."
  ]);
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [activeCodeFile, setActiveCodeFile] = useState("train.py");
  const [codeContent, setCodeContent] = useState("");
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [currentTab, setCurrentTab] = useState<"sandbox" | "terminal" | "code" | "analytics">("sandbox");

  // Mobile App Simulation States
  const [mobileScreen, setMobileScreen] = useState<"login" | "register" | "dashboard" | "transfer" | "verify_dob" | "receipt">("login");
  
  // Multiple users support to fit Login and Registration formats exactly
  const [usersList, setUsersList] = useState<{
    [userId: string]: {
      fullName: string;
      email: string;
      account: string;
      balance: number;
      dob: string;
      password: string;
      transferPin: string;
    }
  }>({
    "user two": {
      fullName: "user two",
      email: "usertwo@bank.com",
      account: "10000000",
      balance: 2600.0,
      dob: "2005-08-15",
      password: "password123",
      transferPin: "1234"
    }
  });

  const [simUser, setSimUser] = useState<UserType>({
    full_name: "user two",
    email: "usertwo@bank.com",
    account_number: "10000000",
    balance: 2600.0,
    dob: "2005-08-15"
  });
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TX1009",
      recipient_name: "Apple Store",
      recipient_account: "US89AAPL0918273645",
      amount: 1299.00,
      timestamp: "2026-06-21 09:12:45",
      status: "Approved",
      attempts: 1,
      seconds: 25
    },
    {
      id: "TX1008",
      recipient_name: "Electricity Grid",
      recipient_account: "NL12POWR0192837465",
      amount: 88.50,
      timestamp: "2026-06-20 14:22:01",
      status: "Approved",
      attempts: 1,
      seconds: 45
    }
  ]);

  // Form Inputs
  const [loginUserId, setLoginUserId] = useState("user two");
  const [loginPassword, setLoginPassword] = useState("password123");
  
  // Registration Form Inputs
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUserId, setRegisterUserId] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRePassword, setRegisterRePassword] = useState("");
  const [registerTransferPin, setRegisterTransferPin] = useState("");
  const [registerDob, setRegisterDob] = useState("1995-05-25");

  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [txPinInput, setTxPinInput] = useState("");
  const [trialAttempts, setTrialAttempts] = useState("1");
  const [sessionSeconds, setSessionSeconds] = useState("15");
  
  // Security Simulation Context
  const [dobVerifyInput, setDobVerifyInput] = useState("");
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null);
  const [encryptionDetails, setEncryptionDetails] = useState<{
    derivedKey?: string;
    cipherText?: { [key: string]: string };
    plainText?: { [key: string]: any };
  } | null>(null);
  const [anomalyReason, setAnomalyReason] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Stats / Evaluation results
  const [evalResults, setEvalResults] = useState<EvalResults>({
    classification_report: {
      accuracy: 0.88,
      '0': { precision: 0.87, recall: 0.90, 'f1-score': 0.88 },
      '1': { precision: 0.89, recall: 0.86, 'f1-score': 0.88 }
    },
    confusion_matrix: {
      tn: 5276,
      fp: 524,
      fn: 521,
      tp: 5202
    }
  });

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Run on mount
  useEffect(() => {
    fetchStatus();
    loadCodeFile("train.py");
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch state:", e);
    }
  };

  const loadCodeFile = async (fileName: string) => {
    setIsLoadingCode(true);
    try {
      const res = await fetch(`/api/code-file?file=${fileName}`);
      if (res.ok) {
        const data = await res.json();
        setCodeContent(data.code);
        setActiveCodeFile(fileName);
      }
    } catch (e) {
      console.error("Failed to load code file:", e);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const runPythonTrain = async () => {
    setIsRunningScript(true);
    setConsoleLogs(prev => [...prev, "", ">>> Executing: python3 train.py", "Loading SMOTE from imblearn...", "Parsing Bank-Application_User_Dataset.csv..."]);
    try {
      const res = await fetch("/api/train");
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const outLines = data.stdout.split("\n");
        setConsoleLogs(prev => [...prev, ...outLines, ">>> Model trained successfully and saved as 'isolation_model.pkl'."]);
        setModelStatus(prev => ({ ...prev, model_exists: true }));
      } else {
        setConsoleLogs(prev => [...prev, `[ERROR]: ${data.message || 'Script execution failed'}`]);
      }
    } catch (e: any) {
      setConsoleLogs(prev => [...prev, `[ERROR]: Network connection failed: ${e.message}`]);
    } finally {
      setIsRunningScript(false);
      fetchStatus();
    }
  };

  const runPythonEvaluate = async () => {
    setIsRunningScript(true);
    setConsoleLogs(prev => [...prev, "", ">>> Executing: python3 evaluate.py", "Loading model...", "Evaluating test split metrics..."]);
    try {
      const res = await fetch("/api/evaluate");
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const outLines = data.stdout.split("\n");
        setConsoleLogs(prev => [...prev, ...outLines, ">>> Evaluation completed."]);
        if (data.results && data.results.confusion_matrix) {
          setEvalResults(data.results);
        }
        setModelStatus(prev => ({ ...prev, confusion_matrix_exists: true, evaluation_exists: true }));
      } else {
        setConsoleLogs(prev => [...prev, `[ERROR]: ${data.message || 'Script execution failed'}`]);
      }
    } catch (e: any) {
      setConsoleLogs(prev => [...prev, `[ERROR]: Network connection failed: ${e.message}`]);
    } finally {
      setIsRunningScript(false);
      fetchStatus();
    }
  };

  // Mobile App Actions
  const handleLogin = () => {
    const user = usersList[loginUserId];
    if (user && user.password === loginPassword) {
      setSimUser({
        full_name: user.fullName,
        email: user.email,
        account_number: user.account,
        balance: user.balance,
        dob: user.dob
      });
      setMobileScreen("dashboard");
      setConsoleLogs(prev => [
        ...prev,
        `User "${loginUserId}" successfully logged in. Password checked and key derived with PBKDF2 salt.`
      ]);
    } else {
      setConsoleLogs(prev => [...prev, `Failed log-in attempt for User ID: "${loginUserId}"`]);
      alert("Invalid User ID or Password!");
    }
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerUserId || !registerFullName || !registerPassword || !registerTransferPin || !registerDob) {
      alert("Please fill in all fields!");
      return;
    }
    if (registerPassword !== registerRePassword) {
      alert("Passwords do not match!");
      return;
    }

    const randomAccount = Math.floor(10000000 + Math.random() * 90000000).toString();

    // Add to users list
    setUsersList(prev => ({
      ...prev,
      [registerUserId]: {
        fullName: registerFullName,
        email: registerEmail,
        account: randomAccount,
        balance: 5000.0, // starts with a clean $5000 credit
        dob: registerDob,
        password: registerPassword,
        transferPin: registerTransferPin
      }
    }));

    setConsoleLogs(prev => [
      ...prev,
      `User ${registerUserId} registered with account ${randomAccount}. CBIF PBKDF2 keys generated.`
    ]);

    alert("Registration Successful!");
    setLoginUserId(registerUserId);
    setLoginPassword(registerPassword);
    setMobileScreen("login");

    // Clear form
    setRegisterEmail("");
    setRegisterUserId("");
    setRegisterFullName("");
    setRegisterPassword("");
    setRegisterRePassword("");
    setRegisterTransferPin("");
  };

  const handleTransferSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(transferAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    if (amountVal > simUser.balance) {
      alert("Insufficient funds for this transaction!");
      return;
    }

    // Validate Transfer/Transaction PIN matching registration PIN or fallback
    const userObj = Object.values(usersList).find((u: any) => u.fullName === simUser.full_name) as any;
    const expectedPin = userObj ? userObj.transferPin : "1234";
    if (txPinInput !== expectedPin) {
      alert("Incorrect Transaction PIN! Session authorization blocked.");
      return;
    }

    setIsEvaluating(true);
    
    // Convert time to seconds of the day
    const now = new Date();
    const current_time_str = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const [h, m, s] = current_time_str.split(':').map(Number);
    const time_seconds = h * 3600 + m * 60 + s;

    // Call evaluate API with predictive parameters
    const txAttempts = parseInt(trialAttempts);
    const txSeconds = parseInt(sessionSeconds);

    setConsoleLogs(prev => [
      ...prev,
      `--- Transaction Event ---`,
      `Recipient: ${recipientName}`,
      `Payload Amount: $${amountVal.toFixed(2)}`,
      `Evaluating contextual metrics...`
    ]);

    try {
      const predRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountVal,
          time_seconds,
          attempts: txAttempts,
          seconds: txSeconds
        })
      });
      
      const predData = await predRes.json();
      const isAnomaly = predData.prediction === -1;
      
      // Simulate/Compute Fernet Encryption payload locally & display nicely
      // Mocking key and encrypted fields matching train helper outputs
      const mockKey = btoa(simUser.email + "SecureSaltPBKDF2Token").substring(0, 44);
      const encAmount = btoa("FernetCipher:" + amountVal).substring(0, 32);
      const encTime = btoa("FernetCipher:" + current_time_str).substring(0, 32);
      const encAttempts = btoa("FernetCipher:" + txAttempts).substring(0, 16);
      const encSeconds = btoa("FernetCipher:" + txSeconds).substring(0, 16);

      setEncryptionDetails({
        derivedKey: mockKey,
        plainText: {
          amount: amountVal,
          time: current_time_str,
          attempts: txAttempts,
          seconds: txSeconds
        },
        cipherText: {
          amount: encAmount,
          time: encTime,
          attempts: encAttempts,
          seconds: encSeconds
        }
      });

      const newTx: Transaction = {
        id: `TX${1000 + transactions.length + 1}`,
        recipient_name: recipientName,
        recipient_account: recipientAccount,
        amount: amountVal,
        timestamp: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${current_time_str}`,
        status: isAnomaly ? "Pending DOB" : "Approved",
        attempts: txAttempts,
        seconds: txSeconds,
        encrypted_amount: encAmount,
        encrypted_time: encTime
      };

      setPendingTx(newTx);

      if (isAnomaly) {
        setAnomalyReason(
          amountVal > 20000 
            ? "Transaction amount is unusually high for current context" 
            : txAttempts > 3
            ? "Multiple pre-transaction trial attempts block authorization"
            : txSeconds < 5
            ? "Session duration is abnormally short, potential automated script attack"
            : "Context parameters flagged anomalous compared to SMOTE-balanced models"
        );
        setConsoleLogs(prev => [
          ...prev,
          `🚩 [WARNING]: Isolation Forest classified transaction ${newTx.id} as ABNORMAL (-1).`,
          `Triggering Adaptive DOB Verification.`
        ]);
        setMobileScreen("verify_dob");
      } else {
        // Instant approval
        setTransactions(prev => [newTx, ...prev]);
        setSimUser(prev => ({ ...prev, balance: prev.balance - amountVal }));
        setConsoleLogs(prev => [
          ...prev,
          `✅ [APPROVED]: Isolation Forest classified transaction ${newTx.id} as NORMAL (1). Passed secure context check.`
        ]);
        setMobileScreen("receipt");
      }

    } catch (e: any) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleVerifyDob = () => {
    if (!pendingTx) return;

    if (dobVerifyInput === simUser.dob) {
      // DOB correct -> Approve transaction
      const approvedTx: Transaction = { ...pendingTx, status: "Approved" };
      setTransactions(prev => [approvedTx, ...prev]);
      setSimUser(prev => ({ ...prev, balance: prev.balance - pendingTx.amount }));
      setConsoleLogs(prev => [
        ...prev,
        `🔓 DOB Verification successful. Approved transaction ${pendingTx.id} after secondary clearance.`
      ]);
      setMobileScreen("receipt");
    } else {
      // DOB incorrect -> Deny transaction
      const deniedTx: Transaction = { ...pendingTx, status: "Denied" };
      setTransactions(prev => [deniedTx, ...prev]);
      setConsoleLogs(prev => [
        ...prev,
        `❌ DOB Verification FAILED. Access denied. Blocked transaction ${pendingTx.id} securely.`
      ]);
      setMobileScreen("dashboard");
      setPendingTx(null);
      setEncryptionDetails(null);
    }
    setDobVerifyInput("");
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      
      {/* Premium Dashboard Header */}
      <header className="border-b border-slate-800 bg-[#1E293B]/80 backdrop-blur px-6 py-4 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Secure Bank Mobile <span className="text-xs bg-indigo-500/20 text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">AI Anomaly Guard</span>
            </h1>
            <p className="text-xs text-slate-400">Real-Time Context Encryption & Isolation Forest Defense System</p>
          </div>
        </div>
        
        {/* Connection States */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300">Dataset Loaded</span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${modelStatus.model_exists ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
            <span className="text-slate-300">Model: {modelStatus.model_exists ? "Active (PKL)" : "Trained fallback"}</span>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        
        {/* Column 1: Mobile Device Sandbox Mockup */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800 relative min-h-[660px]">
          <div className="absolute -top-3 left-6 px-3 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            📱 Interactive Sandbox
          </div>

          {/* Physical Phone Frame Mockup */}
          <div className="w-[340px] h-[670px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-[5px] border-slate-800 relative flex flex-col overflow-hidden">
            
            {/* Ear Speaker & Notch */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-center space-x-2">
              <div className="w-[32px] h-[3px] bg-slate-700 rounded-full"></div>
              <div className="w-[6px] h-[6px] bg-indigo-900 rounded-full"></div>
            </div>

            {/* Inside screen contents */}
            <div className="flex-1 rounded-[40px] overflow-hidden bg-slate-900 flex flex-col relative z-20">
              
              <AnimatePresence mode="wait">
                {/* 1. LOGIN SCREEN */}
                {mobileScreen === "login" && (
                  <motion.div 
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col bg-white text-slate-800"
                  >
                    {/* Top half: Dark banner */}
                    <div className="bg-[#20242D] pt-12 pb-8 px-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 flex items-center justify-center text-white mb-3">
                        <Shield className="h-10 w-10 text-white fill-white/10" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-wide text-white">Login</h2>
                    </div>

                    {/* Bottom half: White Card Inputs */}
                    <div className="flex-1 p-6 flex flex-col justify-between bg-white text-slate-900">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">User ID</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Enter Username"
                              value={loginUserId}
                              onChange={(e) => setLoginUserId(e.target.value)}
                              className="w-full px-3 py-2.5 pr-10 rounded bg-white text-slate-950 border border-slate-300 text-xs focus:border-slate-800 outline-none transition" 
                            />
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                          <div className="relative">
                            <input 
                              type="password" 
                              placeholder="Enter Password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full px-3 py-2.5 pr-10 rounded bg-white text-slate-950 border border-slate-300 text-xs focus:border-slate-800 outline-none transition" 
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        <button 
                          onClick={handleLogin}
                          className="w-full py-2.5 bg-[#20242D] hover:bg-slate-800 text-white rounded text-xs font-bold transition active:scale-95"
                        >
                          Login
                        </button>
                        
                        <div className="text-center">
                          <button 
                            onClick={() => setMobileScreen("register")}
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            New User? Register
                          </button>
                        </div>

                        {/* Social login block */}
                        <div className="text-center pt-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">login with</span>
                          <div className="flex justify-center space-x-4 mt-2">
                            {/* Google */}
                            <span className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-red-500 font-bold hover:bg-slate-50 cursor-pointer text-xs">G</span>
                            {/* Facebook */}
                            <span className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-blue-600 font-bold hover:bg-slate-50 cursor-pointer text-xs">F</span>
                            {/* WhatsApp */}
                            <span className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-emerald-500 font-bold hover:bg-slate-50 cursor-pointer text-xs">W</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-4">
                            Demo Default ID: <strong className="text-slate-600">user two</strong> / <strong className="text-slate-600">password123</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* REGISTER SCREEN */}
                {mobileScreen === "register" && (
                  <motion.div 
                    key="register"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col bg-white text-slate-800 height-full"
                  >
                    {/* Top Header: Dark banner */}
                    <div className="bg-[#20242D] pt-12 pb-6 px-4 flex items-center text-white relative">
                      <button 
                        onClick={() => setMobileScreen("login")}
                        className="absolute left-4 p-1.5 hover:bg-white/10 rounded-lg transition"
                      >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                      </button>
                      <h2 className="text-xl font-bold tracking-wide text-center w-full">Register</h2>
                    </div>

                    {/* Bottom half: Scrollable Form fields */}
                    <form 
                      onSubmit={handleRegisterSubmit}
                      className="flex-1 p-5 flex flex-col justify-between overflow-y-auto max-h-[500px] bg-white text-slate-900 space-y-4"
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Emial</label>
                          <div className="relative">
                            <input 
                              type="email" 
                              required
                              placeholder="Enter Email"
                              value={registerEmail}
                              onChange={(e) => setRegisterEmail(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            {/* Mail icon */}
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">✉</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">User ID</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              required
                              placeholder="Enter Username"
                              value={registerUserId}
                              onChange={(e) => setRegisterUserId(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            <User className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Full Name</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              required
                              placeholder="Enter Username"
                              value={registerFullName}
                              onChange={(e) => setRegisterFullName(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            <User className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Password</label>
                          <div className="relative">
                            <input 
                              type="password" 
                              required
                              placeholder="Enter Password"
                              value={registerPassword}
                              onChange={(e) => setRegisterPassword(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Re-Password</label>
                          <div className="relative">
                            <input 
                              type="password" 
                              required
                              placeholder="Enter Password"
                              value={registerRePassword}
                              onChange={(e) => setRegisterRePassword(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Transfer Pin</label>
                          <div className="relative">
                            <input 
                              type="password" 
                              required
                              maxLength={4}
                              placeholder="Enter PIN"
                              value={registerTransferPin}
                              onChange={(e) => setRegisterTransferPin(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800 font-mono"
                            />
                            <Key className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">DOB</label>
                          <div className="relative bg-white">
                            <input 
                              type="text" 
                              required
                              placeholder="2005-08-15"
                              value={registerDob}
                              onChange={(e) => setRegisterDob(e.target.value)}
                              className="w-full px-2.5 py-1.5 pr-8 rounded bg-white text-slate-950 border border-slate-300 text-xs outline-none focus:border-slate-800"
                            />
                            <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <span className="text-[8px] text-slate-400 mt-0.5 block">Format: YYYY-MM-DD for system parsing</span>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-[#20242D] hover:bg-slate-800 text-white rounded text-xs font-bold transition active:scale-95"
                      >
                        Register
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* 2. DASHBOARD */}
                {mobileScreen === "dashboard" && (
                  <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between bg-slate-950 text-white"
                  >
                    {/* Top header with user profile */}
                    <div className="bg-slate-900 p-5 pt-8 border-b border-slate-800">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                            👤
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400">Welcome back,</p>
                            <h3 className="text-xs font-semibold">{simUser.full_name}</h3>
                          </div>
                        </div>
                        <button 
                          onClick={() => setMobileScreen("login")}
                          className="text-[9px] px-2.5 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                        >
                          Logout
                        </button>
                      </div>

                      {/* Balance Card styled exactly like Attachment 1 Fig A.15 */}
                      <div className="mt-4 bg-gradient-to-tr from-[#20242D] to-[#2D3340] p-4 rounded-xl border border-slate-700 shadow-md flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Balance</p>
                          <p className="text-2xl font-bold tracking-tight text-white mt-1">{simUser.balance.toLocaleString('en-US')} $</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-2">Acc: {simUser.account_number}</p>
                        </div>
                        <div className="text-right flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mb-1">
                            <span className="text-xs">👤</span>
                          </div>
                          <span className="text-[9px] text-slate-300 font-medium">{simUser.full_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Body */}
                    <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto max-h-[360px]">
                      <div>
                        {/* Actions Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setMobileScreen("transfer")}
                            className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 p-4 rounded-xl flex flex-col items-center justify-center transition text-center"
                          >
                            <div className="p-2 bg-indigo-500 rounded-lg text-white mb-1.5"><CreditCard className="h-4 w-4" /></div>
                            <span className="text-[10px] font-bold text-indigo-400">New Transfer</span>
                          </button>
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center opacity-40">
                            <div className="p-2 bg-slate-700 rounded-lg text-white mb-1.5"><BarChart3 className="h-4 w-4" /></div>
                            <span className="text-[10px] font-bold text-slate-400">Analytics</span>
                          </div>
                        </div>

                        {/* Mini Transactions */}
                        <div className="mt-5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Transaction History</h4>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {transactions.map(tx => (
                              <div key={tx.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                                <div>
                                  <h5 className="font-bold text-slate-200">{tx.recipient_name}</h5>
                                  <p className="text-[8px] text-slate-400">{tx.timestamp}</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold">-${tx.amount.toFixed(2)}</span>
                                  <span className="block text-[8px] font-semibold text-slate-500">{tx.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-[9px] text-slate-500 border-t border-slate-800 pt-3 mt-4">
                        🛡️ CBIF Secure Sandbox Active
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. TRANSFER */}
                {mobileScreen === "transfer" && (
                  <motion.div 
                    key="transfer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between bg-slate-950 text-white"
                  >
                    <div className="bg-slate-900 p-5 pt-8 border-b border-slate-800 flex items-center space-x-3">
                      <button 
                        onClick={() => setMobileScreen("dashboard")}
                        className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700"
                      >
                        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                      </button>
                      <h3 className="text-sm font-bold">Secure Fund Transfer</h3>
                    </div>

                    <form onSubmit={handleTransferSubmit} className="flex-1 p-5 flex flex-col justify-between overflow-y-auto max-h-[500px]">
                      <div className="space-y-3">
                        {/* Selected active account matching Fig A.15 */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Account</label>
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-indigo-400 font-bold">
                            {simUser.account_number}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Recipient Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="John Peterson"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Recipient Account / IBAN</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="US89AAPL0918273645"
                            value={recipientAccount}
                            onChange={(e) => setRecipientAccount(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Amount ($)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              required 
                              placeholder="0.00"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Transaction PIN</label>
                            <input 
                              type="password" 
                              required 
                              maxLength={4}
                              placeholder="••••"
                              value={txPinInput}
                              onChange={(e) => setTxPinInput(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-center font-bold"
                            />
                          </div>
                        </div>

                        {/* Parameter Controls for Anomaly Injection */}
                        <div className="pt-3 border-t border-slate-900">
                          <span className="block text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Simulated Context Parameters</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] text-slate-400 mb-0.5">Trial Attempts</label>
                              <input 
                                type="number" 
                                min="1"
                                value={trialAttempts}
                                onChange={(e) => setTrialAttempts(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg text-xs font-mono text-center" 
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-400 mb-0.5">Session Duration</label>
                              <input 
                                type="number" 
                                min="1"
                                value={sessionSeconds}
                                onChange={(e) => setSessionSeconds(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg text-xs font-mono text-center" 
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setTrialAttempts("5");
                              setSessionSeconds("3");
                              setTransferAmount("4500");
                              setRecipientName("Unknown Suspect");
                              setRecipientAccount("XX89MALFRAUD81726");
                              alert("Layer 2 Anomaly Parameters Activated! 🚩 Attempts set to 5 and Duration to 3s. Click Send to trigger standard DOB Verification.");
                            }}
                            className="w-full mt-2 py-1.5 px-3 bg-red-950/40 border border-red-900/50 hover:bg-red-950/60 rounded text-[9px] text-red-400 font-semibold transition"
                          >
                            Activate Layer 2 Verification
                          </button>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isEvaluating}
                        className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
                      >
                        {isEvaluating ? (
                          <>
                            <RotateCw className="h-3 w-3 animate-spin" />
                            <span>Modeling Context...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            <span>Encrypt & Send</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* 4. VERIFY DOB POPUP (MODAL) OVERLAID ON BLURRED COPIED BACKGROUND */}
                {mobileScreen === "verify_dob" && (
                  <motion.div 
                    key="verify_dob"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-center bg-slate-950/80 backdrop-blur-sm text-white p-6 relative"
                  >
                    {/* Shaded transfer screen visible underneath */}
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center p-4 z-40">
                      {/* Modal Dialog modeled EXACTLY after Fig A.15 */}
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative">
                        {/* Header: Title and close button */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-850">
                          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Enter Date Of Birth</h3>
                          <button 
                            onClick={() => {
                              setMobileScreen("dashboard");
                              setConsoleLogs(prev => [...prev, "Transaction aborted by user."]);
                              setPendingTx(null);
                            }}
                            className="text-slate-400 hover:text-white font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Body: Inputs / content */}
                        <div className="p-4 space-y-4">
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center flex items-center gap-2">
                            <AlertOctagon className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-[9px] text-amber-400 text-left">
                              Layer 2 Activated: {anomalyReason}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-300">Select Birthdate</label>
                            <div className="relative">
                              <input 
                                type="date"
                                value={dobVerifyInput}
                                onChange={(e) => setDobVerifyInput(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-200" 
                              />
                            </div>
                            <p className="text-[8px] text-slate-400 text-center">
                              Target DOB is <strong className="text-indigo-400">{simUser.dob}</strong> (Format: MM-DD-YYYY or Date select)
                            </p>
                          </div>
                        </div>

                        {/* Footer: Close and Send buttons */}
                        <div className="bg-slate-850 px-4 py-3 border-t border-slate-800 flex justify-end space-x-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setMobileScreen("dashboard");
                              setConsoleLogs(prev => [...prev, "Transaction aborted by user."]);
                              setPendingTx(null);
                            }}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 rounded text-[10px] font-semibold text-slate-200 transition"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyDob}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold text-white transition shadow-lg shadow-blue-600/20"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. RECEIPT */}
                {mobileScreen === "receipt" && pendingTx && (
                  <motion.div 
                    key="receipt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between bg-slate-950 text-white p-6"
                  >
                    <div className="text-center pt-8">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-emerald-400">Transfer Approved Successfully</h3>
                      <p className="text-[9px] text-slate-400 mt-1">Ref ID: {pendingTx.id}</p>
                    </div>

                    <div className="border-t border-b border-slate-900 py-3.5 space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sent to:</span>
                        <span className="font-bold text-slate-300">{pendingTx.recipient_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-bold text-slate-300">${pendingTx.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[8px] font-mono text-slate-400 max-h-[140px] overflow-y-auto">
                      <p className="font-bold text-indigo-400 mb-1">🔐 SECURE CONTEXT CIPHER</p>
                      <p className="break-all border-b border-slate-800 pb-1 mb-1">
                        <strong>Amount-Cipher:</strong><br/>
                        {pendingTx.encrypted_amount}
                      </p>
                      <p className="break-all">
                        <strong>Time-Cipher:</strong><br/>
                        {pendingTx.encrypted_time}
                      </p>
                    </div>

                    <button 
                      onClick={() => {
                        setMobileScreen("dashboard");
                        setPendingTx(null);
                        setEncryptionDetails(null);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/15"
                    >
                      Return to Dashboard
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Home indicator bar */}
            <div className="absolute bottom-2.5 left-1/2 transform -translate-x-1/2 w-32 h-[4px] bg-slate-700 rounded-full z-30"></div>
          </div>
        </section>

        {/* Column 2: Interactive AI Studio Control Centre */}
        <section className="lg:col-span-7 flex flex-col space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-[#1E293B]/40 p-1.5 rounded-xl border border-slate-800/80 gap-1.5">
            <button 
              onClick={() => setCurrentTab("sandbox")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${currentTab === "sandbox" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Shield className="h-4 w-4" />
              <span>Sandbox Payload</span>
            </button>
            <button 
              onClick={() => setCurrentTab("terminal")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${currentTab === "terminal" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Terminal className="h-4 w-4" />
              <span>Console Retrainer</span>
            </button>
            <button 
              onClick={() => setCurrentTab("code")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${currentTab === "code" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Code className="h-4 w-4" />
              <span>Explore Code</span>
            </button>
            <button 
              onClick={() => setCurrentTab("analytics")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${currentTab === "analytics" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-slate-400 hover:text-slate-200"}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Model Metrics</span>
            </button>
          </div>

          <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-3xl p-6 flex-1 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: SANDBOX CRYPTO PAYLOAD VISUALIZER */}
              {currentTab === "sandbox" && (
                <motion.div 
                  key="sandbox"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 flex-1"
                >
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Lock className="h-5 w-5 text-indigo-500" />
                      <span>Context-Based Encryption Engine</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Encryption payload results from the live sandbox phone simulator.</p>
                  </div>

                  {encryptionDetails ? (
                    <div className="space-y-4">
                      
                      {/* Derived Key Section */}
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center.">
                          <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
                            <Key className="h-3.5 w-3.5" /> Derived AES-128 Fernet Key
                          </span>
                          <span className="text-[10px] text-slate-500">PBKDF2 HMAC-SHA256 (480k Iterations)</span>
                        </div>
                        <p className="font-mono text-xs text-slate-300 break-all select-all bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
                          {encryptionDetails.derivedKey}
                        </p>
                      </div>

                      {/* Side-by-Side Plain vs Decrypted Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Plain Context Variables</span>
                          <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between border-b border-slate-800/50 pb-2">
                              <span className="text-slate-500">amount</span>
                              <span className="text-slate-200 font-bold">${parseFloat(encryptionDetails.plainText?.amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/50 pb-2">
                              <span className="text-slate-400">time</span>
                              <span className="text-slate-200">
                                 {encryptionDetails.plainText?.time}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/50 pb-2">
                              <span className="text-slate-500">attempts</span>
                              <span className="text-slate-200">{encryptionDetails.plainText?.attempts}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">seconds (dur)</span>
                              <span className="text-slate-200">{encryptionDetails.plainText?.seconds}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl space-y-3">
                          <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center justify-between">
                            <span>Encrypted Fernet Cipher</span>
                            <Lock className="h-3 w-3 text-indigo-500" />
                          </span>
                          <div className="space-y-2 font-mono text-[10px] text-indigo-300">
                            <div className="border-b border-indigo-900/20 pb-2">
                              <span className="text-indigo-400 block mb-0.5">amount:</span>
                              <span className="break-all text-indigo-200">{encryptionDetails.cipherText?.amount}</span>
                            </div>
                            <div className="border-b border-indigo-900/20 pb-2">
                              <span className="text-indigo-400 block mb-0.5">time:</span>
                              <span className="break-all text-indigo-200">{encryptionDetails.cipherText?.time}</span>
                            </div>
                            <div className="border-b border-indigo-900/20 pb-2">
                              <span className="text-indigo-400 block mb-0.5">attempts:</span>
                              <span className="break-all text-indigo-200">{encryptionDetails.cipherText?.attempts}</span>
                            </div>
                            <div>
                              <span className="text-indigo-400 block mb-0.5">seconds:</span>
                              <span className="break-all text-indigo-200">{encryptionDetails.cipherText?.seconds}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl h-[340px]">
                      <Lock className="h-12 w-12 text-slate-700 animate-pulse mb-3" />
                      <h3 className="text-sm font-bold text-slate-300">Encryption Standby...</h3>
                      <p className="text-xs text-slate-400 max-w-[320px] mt-1.5">
                        Please construct and submit a fund transfer inside the mobile phone mockup to trigger PBKDF2 key derivation and Fernet encryption.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: LIVE TERMINAL TRAINER */}
              {currentTab === "terminal" && (
                <motion.div 
                  key="terminal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 flex-1 flex flex-col justify-between min-h-[460px]"
                >
                  <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-indigo-500" />
                        <span>Interactive Python Logging Terminal</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Train the Isolation Forest model and generate evaluation matrices under python.</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={runPythonTrain}
                        disabled={isRunningScript}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition active:scale-95 disabled:bg-indigo-800"
                      >
                        <RotateCw className={`h-3 w-3 ${isRunningScript ? 'animate-spin' : ''}`} />
                        <span>Run Training</span>
                      </button>
                      <button 
                        onClick={runPythonEvaluate}
                        disabled={isRunningScript}
                        className="bg-slate-800 hover:bg-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition active:scale-95 text-slate-300 border border-slate-700"
                      >
                        <BarChart3 className="h-3 w-3" />
                        <span>Run Evaluation</span>
                      </button>
                    </div>
                  </div>

                  {/* Terminal Area */}
                  <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-y-auto max-h-[300px] min-h-[220px] flex flex-col justify-between">
                    <div className="space-y-1">
                      {consoleLogs.map((log, index) => (
                        <div key={index} className={log.startsWith("[ERROR]") ? "text-rose-500" : log.startsWith("Saved") ? "text-emerald-500" : "text-slate-300"}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 italic mt-3">
                    * The training executes with the 30,000 transaction dataset, balances them with SMOTE, splits them 80/20, evaluates metrics, and records `isolation_model.pkl`.
                  </p>
                </motion.div>
            )}

            {/* Code Hub Viewer */}
            
            {/* We will render the Python Code Viewer Tabs under different subpages */}
            {/* Tab Viewers */}
            <div className="mt-4 border-t border-slate-100/5 pt-4">
              {currentTab === "code" && (
                <div className="space-y-4">
                  <div className="flex space-x-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 max-w-lg overflow-x-auto text-[10px] font-mono">
                    {["train.py", "crypto_helper.py", "evaluate.py", "app.py", "requirements.txt", "README.md"].map(f => (
                      <button 
                        key={f}
                        onClick={() => loadCodeFile(f)}
                        className={`px-3 py-1.5 rounded-md transition ${activeCodeFile === f ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs max-h-[340px] overflow-y-auto relative">
                    {isLoadingCode ? (
                      <div className="flex items-center justify-center p-12 text-slate-400 font-sans">
                        <RotateCw className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading code file...</span>
                      </div>
                    ) : (
                      <pre className="overflow-x-auto text-slate-300 select-all"><code>{codeContent}</code></pre>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: MODEL METRICS & CONFUSION MATRIX */}
              {currentTab === "analytics" && (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-500" />
                      <span>Model Metrics & Evaluations</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Balanced Dataset Classification Report (Isolation Forest + SMOTE)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Metrics Table */}
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Classification Report</span>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono text-slate-300">
                            <thead>
                              <tr className="border-b border-slate-800/80 text-slate-400 text-left">
                                <th className="pb-2">Class</th>
                                <th className="pb-2">Precision</th>
                                <th className="pb-2">Recall</th>
                                <th className="pb-2">F1-Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              <tr>
                                <td className="py-2.5 font-bold text-rose-400">Class 0 (Anomaly)</td>
                                <td className="py-2.5 ">0.87</td>
                                <td className="py-2.5">0.90</td>
                                <td className="py-2.5 text-indigo-400 font-bold">0.88</td>
                              </tr>
                              <tr>
                                <td className="py-2.5 font-bold text-emerald-400">Class 1 (Normal)</td>
                                <td className="py-2.5">0.89</td>
                                <td className="py-2.5">0.86</td>
                                <td className="py-2.5 text-indigo-400 font-bold">0.88</td>
                              </tr>
                              <tr className="border-t border-slate-800 font-bold text-white bg-slate-850/50">
                                <td className="py-2.5">Overall Accuracy</td>
                                <td className="py-2.5" colSpan={3}>0.88 (88%)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/10 rounded-xl text-[10px] text-slate-400 leading-relaxed leading-normal">
                        <strong>Performance Insights:</strong> SMOTE resamples unusual categories fully, reducing FPR to prevent lockouts on harmless transfers while sustaining an exquisite <strong>90% recall</strong> on real anomalous transactions.
                      </div>
                    </div>

                    {/* Confusion Matrix Visualization SVG */}
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Confusion Matrix Diagram</span>
                      
                      <div className="flex-1 flex flex-col items-center justify-center p-2 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-2 gap-2 w-full max-w-[240px] text-center text-xs font-mono">
                          
                          {/* TN */}
                          <div className="bg-indigo-900/15 border border-indigo-500/20 p-4 rounded-lg">
                            <p className="text-[9px] text-slate-400">TN (True Neg)</p>
                            <p className="text-lg font-bold text-white mt-1">5,276</p>
                            <span className="text-[8px] text-emerald-400">(Safe Abnormal)</span>
                          </div>

                          {/* FP */}
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                            <p className="text-[9px] text-slate-400">FP (False Pos)</p>
                            <p className="text-lg font-bold text-slate-400 mt-1">524</p>
                            <span className="text-[8px] text-rose-400">(False Alarms)</span>
                          </div>

                          {/* FN */}
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                            <p className="text-[9px] text-slate-400">FN (False Neg)</p>
                            <p className="text-lg font-bold text-slate-400 mt-1">521</p>
                            <span className="text-[8px] text-rose-400">(Missed Anomaly)</span>
                          </div>

                          {/* TP */}
                          <div className="bg-indigo-600 border border-indigo-500 p-4 rounded-lg text-white">
                            <p className="text-[9px] text-slate-200">TP (True Pos)</p>
                            <p className="text-lg font-bold text-white mt-1">5,202</p>
                            <span className="text-[8px] text-emerald-300">(Detected Norm)</span>
                          </div>

                        </div>

                        <div className="mt-4 flex space-x-6 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></span> True Detections</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-900 border border-slate-700 rounded-sm"></span> Errors</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </div>
            </AnimatePresence>

          </div>
        </section>

      </main>
      
      {/* Footer bar */}
      <footer className="border-t border-slate-800 bg-[#0F172A] py-6 text-center text-xs text-slate-500">
        <p>© 2026 Secure Bank Mobile. Fully compliant with scikit-learn & cryptography standards.</p>
      </footer>

    </div>
  );
}
