# Quick Start Guide

## Prerequisites
Make sure you have the following installed and running:
1. **Node.js** (v16+) & **npm**
2. **MongoDB** (Ensure your local MongoDB instance is started, e.g. `brew services start mongodb-community` on Mac, or run mongod)

---

## Step-by-Step Commands to Run

Run the following commands in order from the root directory (`brainstorm-arena-simple/`):

### 1. Setup & Start Server
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server (runs on port 5001)
npm run dev
```

### 2. Setup & Start Client
*(Open a new terminal window/tab at the root directory)*
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the React dev server (runs on port 3000)
npm run dev
```
