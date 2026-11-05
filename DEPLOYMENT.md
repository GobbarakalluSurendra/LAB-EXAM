# SmartLab Cloud Deployment Guide

This guide details the complete step-by-step process to deploy **SmartLab – Digital Lab Examination Management System** to the cloud with a **permanent, free public URL** (`https://smartlab.onrender.com`) and a managed cloud database.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              Render / Railway                │
                      │   (Node.js Express + Built React Frontend)   │
                      │       URL: https://smartlab.onrender.com     │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │      MongoDB Atlas Cloud      │
                             │       (Free M0 Cluster)       │
                             └───────────────────────────────┘
```

The codebase is configured as a monolithic full-stack app:
* **Build Command**: `npm run build` (builds React Vite assets into `client/dist/`)
* **Start Command**: `node server/server.js` (Express serves both the REST API and the React frontend on a single port with automatic routing)

---

## Step 1: Push Code to GitHub

Your local workspace is already an initialized Git repository with all deployment files (`package.json`, `render.yaml`, `Dockerfile`, `.gitignore`) committed.

1. Open **[GitHub](https://github.com/new)** and create a new repository:
   * **Repository Name**: `smartlab-exam-system`
   * **Visibility**: Public or Private
   * *Do NOT check "Add a README" or ".gitignore" (these already exist).*
2. In your terminal (in this project folder), run:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/smartlab-exam-system.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Get a Free Cloud Database (MongoDB Atlas)

Render and other free hosts do not store local disk databases persistently across redeploys, so a cloud database is recommended:

1. Sign up or log in to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)** (100% Free, no credit card required).
2. Click **Create Deployment** $\rightarrow$ select the **M0 Free** cluster tier $\rightarrow$ click **Create**.
3. **Security Quickstart**:
   * **Username & Password**: Choose a username (e.g., `smartlab_admin`) and a password (e.g., `SecureLabPass2026!`). Click **Create User**.
   * **IP Access List**: Select **Allow Access from Anywhere** (`0.0.0.0/0`) $\rightarrow$ Click **Finish and Close**.
4. **Get Connection String**:
   * On your cluster overview, click **Connect** $\rightarrow$ select **Drivers (Node.js)**.
   * Copy the connection string:
     ```
     mongodb+srv://smartlab_admin:<password>@cluster0.xxxxx.mongodb.net/smartlab?retryWrites=true&w=majority
     ```
   * Replace `<password>` with the password you set in step 3.

---

## Step 3: Deploy on Render (Recommended Free Option)

1. Go to **[Render.com](https://dashboard.render.com/)** and log in with your GitHub account.
2. Click **New +** $\rightarrow$ select **Web Service**.
3. Under **Connect a repository**, choose `smartlab-exam-system`.
4. Configure the service:
   * **Name**: `smartlab` (or your preferred name, e.g. `smartlab-college`)
   * **Region**: Choose closest to you (e.g., *Singapore* or *Frankfurt*)
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: `Free`
5. Click **Advanced** $\rightarrow$ **Add Environment Variable**:

   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGODB_URI` | *Your MongoDB Atlas connection string from Step 2* |
   | `JWT_SECRET` | `smartlab_production_faculty_jwt_secret_key_2026!` |
   | `STUDENT_JWT_SECRET` | `smartlab_production_student_session_secret_key_2026!` |

6. Click **Create Web Service**.
7. Render will automatically install dependencies, build the React frontend, and boot up the Express server.
8. Once finished, you will receive your permanent public URL (e.g., **`https://smartlab.onrender.com`**).

---

## Alternative: 1-Click Deployment via Railway

If you prefer **Railway** (which can provision both Node.js and MongoDB inside one project):

1. Go to **[Railway.app](https://railway.app/)** $\rightarrow$ log in with GitHub.
2. Click **New Project** $\rightarrow$ **Provision MongoDB**.
3. Click **New** $\rightarrow$ **GitHub Repo** $\rightarrow$ select `smartlab-exam-system`.
4. Under the repository's **Variables** tab, set:
   * `MONGODB_URI`: `${{Mongo.MONGO_URL}}` (automatically links to your provisioned MongoDB)
   * `JWT_SECRET`: `smartlab_production_faculty_jwt_secret_key_2026!`
   * `STUDENT_JWT_SECRET`: `smartlab_production_student_session_secret_key_2026!`
   * `PORT`: `5000`
5. Go to **Settings** $\rightarrow$ click **Generate Domain**. Your permanent URL will be generated instantly.

---

## Alternative: Self-Hosted Docker Deployment (Local Lab Server / Linux VPS)

To deploy on a physical college server or a Linux VPS:

```bash
# Clone the repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/smartlab-exam-system.git
cd smartlab-exam-system

# Start full stack (MongoDB + Express + React) in detached mode
docker compose up -d --build
```
The application will be live at `http://<server-ip>:5000`.
