// Service to bridge Express API with the persistent Python RAG Worker
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const PYTHON_BIN = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
const RAG_SCRIPT = process.env.RAG_SCRIPT_PATH 
  ? path.resolve(process.env.RAG_SCRIPT_PATH)
  : path.resolve(__dirname, '../../rag/pipeline.py');

class PersistentRAGWorker {
  constructor() {
    this.worker = null;
    this.rl = null;
    this.isReady = false;
    this.queue = [];
    this.pendingRequests = [];
    this.startWorker();
  }

  startWorker() {
    if (this.worker) return;

    try {
      this.worker = spawn(PYTHON_BIN, ['-u', RAG_SCRIPT, '--stdio'], {
        cwd: path.dirname(RAG_SCRIPT),
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          TOKENIZERS_PARALLELISM: 'false',
          TRANSFORMERS_VERBOSITY: 'error',
          HF_HUB_DISABLE_SYMLINKS_WARNING: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.rl = readline.createInterface({
        input: this.worker.stdout,
        terminal: false
      });

      this.rl.on('line', (line) => {
        const text = line.trim();
        if (!text || !text.startsWith('{')) return;

        try {
          const parsed = JSON.parse(text);

          if (parsed.status === 'ready') {
            this.isReady = true;
            this.drainQueue();
            return;
          }

          if (this.pendingRequests.length > 0) {
            const { resolve, timer } = this.pendingRequests.shift();
            clearTimeout(timer);
            resolve(parsed);
          }
        } catch (e) {
          console.error('[RAGWorker stdout parse error]:', e.message);
        }
      });

      this.worker.stderr.on('data', (d) => {
        const msg = d.toString();
        // Ignore normal HuggingFace / PyTorch initialization progress
        if (!msg.includes('Loading weights') && !msg.includes('HF_TOKEN') && !msg.includes('Warning')) {
          console.warn('[RAGWorker stderr]:', msg.trim());
        }
      });

      this.worker.on('exit', (code, signal) => {
        console.warn(`[RAGWorker exited (code: ${code}, signal: ${signal})] — restarting worker...`);
        this.cleanup();
        setTimeout(() => this.startWorker(), 1500);
      });

      this.worker.on('error', (err) => {
        console.error('[RAGWorker process error]:', err.message);
        this.cleanup();
      });

    } catch (err) {
      console.error('[Failed to spawn RAG worker]:', err.message);
      this.cleanup();
    }
  }

  drainQueue() {
    while (this.queue.length > 0 && this.worker && this.worker.stdin && this.worker.stdin.writable) {
      const item = this.queue.shift();
      this.dispatch(item);
    }
  }

  dispatch(item) {
    this.pendingRequests.push(item);
    try {
      this.worker.stdin.write(JSON.stringify({ query: item.query }) + '\n');
    } catch (err) {
      const idx = this.pendingRequests.indexOf(item);
      if (idx !== -1) this.pendingRequests.splice(idx, 1);
      clearTimeout(item.timer);
      item.reject(err);
    }
  }

  cleanup() {
    this.isReady = false;
    if (this.worker) {
      try { this.worker.kill(); } catch (e) {}
      this.worker = null;
    }
    this.rl = null;

    // Fail pending requests so callers can use safe fallback
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      clearTimeout(item.timer);
      item.reject(new Error('RAG worker process restart'));
    }
    while (this.pendingRequests.length > 0) {
      const item = this.pendingRequests.shift();
      clearTimeout(item.timer);
      item.reject(new Error('RAG worker process restart'));
    }
  }

  async query(queryText, timeoutMs = 45000) {
    if (!this.worker) {
      this.startWorker();
    }

    const effectiveTimeout = this.isReady ? timeoutMs : Math.max(timeoutMs, 90000);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const qIdx = this.queue.findIndex(item => item.resolve === resolve);
        if (qIdx !== -1) this.queue.splice(qIdx, 1);

        const pIdx = this.pendingRequests.findIndex(item => item.resolve === resolve);
        if (pIdx !== -1) this.pendingRequests.splice(pIdx, 1);

        reject(new Error('RAG execution timed out'));
      }, effectiveTimeout);

      const requestItem = {
        query: queryText,
        timer,
        resolve,
        reject
      };

      if (!this.isReady) {
        this.queue.push(requestItem);
      } else {
        this.dispatch(requestItem);
      }
    });
  }
}

const ragWorker = new PersistentRAGWorker();

module.exports = {
  queryRAG: (queryText) => ragWorker.query(queryText)
};
