import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON body parsed payload
  app.use(express.json());

  // API router configurations
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Train model via python train.py
  app.get("/api/train", (req, res) => {
    console.log("Triggering model training...");
    exec("python3 train.py", (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ 
          status: "error", 
          message: err.message, 
          stdout, 
          stderr 
        });
      }
      res.json({ 
        status: "success", 
        stdout, 
        stderr 
      });
    });
  });

  // API: Trigger evaluate.py to compute confusion matrix and reports
  app.get("/api/evaluate", (req, res) => {
    console.log("Triggering model evaluation...");
    exec("python3 evaluate.py", (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ 
          status: "error", 
          message: err.message, 
          stdout, 
          stderr 
        });
      }
      
      let results = {};
      try {
        if (fs.existsSync("evaluation_results.json")) {
          results = JSON.parse(fs.readFileSync("evaluation_results.json", "utf-8"));
        }
      } catch (e) {
        console.error("Failed to parse evaluation results:", e);
      }

      res.json({ 
        status: "success", 
        stdout, 
        stderr,
        results
      });
    });
  });

  // API: Predict transaction anomaly using trained pkl model
  app.post("/api/predict", (req, res) => {
    const { amount, time_seconds, attempts, seconds } = req.body;
    
    // Check if model file exists
    if (!fs.existsSync("isolation_model.pkl")) {
      // Heuristic fallback warning if model has not been trained yet
      const isAnomaly = amount > 10000 || attempts > 3 || seconds < 5;
      return res.json({ 
        prediction: isAnomaly ? -1 : 1, 
        fallback: true,
        message: "Model not trained yet, utilizing quick heuristic protection." 
      });
    }

    // Call python snippet on the fly to evaluate with pickle loading
    const cmd = `python3 -c "import pickle; m=pickle.load(open('isolation_model.pkl','rb')); print(m.predict([[${parseFloat(amount)}, ${parseInt(time_seconds)}, ${parseInt(attempts)}, ${parseInt(seconds)}]])[0])"`;
    
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("Python prediction failed:", err, stderr);
        // Fault tolerant rule-base fallback
        const isAnomaly = amount > 10000 || attempts > 3 || seconds < 5;
        return res.json({ 
          prediction: isAnomaly ? -1 : 1, 
          fallback: true, 
          message: "Internal evaluation fallback triggered." 
        });
      }
      const val = parseInt(stdout.trim());
      res.json({ 
        prediction: isNaN(val) ? 1 : val, 
        fallback: false 
      });
    });
  });

  // API: Check files presence status
  app.get("/api/status", (req, res) => {
    res.json({
      dataset_exists: fs.existsSync("Bank-Application_User_Dataset.csv"),
      model_exists: fs.existsSync("isolation_model.pkl"),
      confusion_matrix_exists: fs.existsSync("public/confusion_matrix.png") || fs.existsSync("confusion_matrix.png"),
      evaluation_exists: fs.existsSync("evaluation_results.json")
    });
  });

  // API: Fetch code helper definitions to display on code tabs
  app.get("/api/code-file", (req, res) => {
    const file = req.query.file as string;
    const allowed = ["train.py", "app.py", "crypto_helper.py", "evaluate.py", "requirements.txt", "README.md"];
    if (!file || !allowed.includes(file)) {
      return res.status(403).json({ error: "Access prohibited." });
    }
    try {
      const code = fs.readFileSync(file, "utf-8");
      res.json({ code });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite development middleware or static production routing fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening at http://localhost:${PORT}`);
  });
}

startServer();
