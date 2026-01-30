# Deployment Guide: Auction System

This guide will walk you through deploying your Auction System:
- **Frontend** to [Vercel](https://vercel.com)
- **Backend** to [Render](https://render.com)
- **Database** using Render's Managed PostgreSQL

## Prerequisites

1.  **GitHub Account**: You need to push your code to a GitHub repository.
2.  **Vercel Account**: Sign up with GitHub.
3.  **Render Account**: Sign up with GitHub.
4.  **Cloudinary Account**: For image uploads (you should already have this).

---

## Step 1: Push Code to GitHub

Since you have Git installed and initialized locally:

1.  **Create a New Repository** on GitHub (e.g., `auction-system`). Do **not** initialize with README/gitignore.
2.  **Push your code**:
    Run the following commands in your terminal (replace `YOUR_USERNAME` and `REPO_NAME`):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
    git branch -M main
    git push -u origin main
    ```

---

## Step 2: Deploy Backend to Render

1.  **Create New Web Service**:
    - Go to Render Dashboard -> **New +** -> **Web Service**.
    - Connect your GitHub repository.

2.  **Configure Service**:
    - **Name**: `auction-backend` (or similar)
    - **Region**: Choose one close to you (e.g., Singapore, Frankfurt, Oregon).
    - **Root Directory**: `backend`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
    - **Instance Type**: Free

3.  **Create Database (PostgreSQL)**:
    - *Option A (Render Postgres)*:
        - Go to Dashboard -> **New +** -> **PostgreSQL**.
        - Name: `auction-db`.
        - Create using Free Tier (Note: Expires after 30 days usually).
        - Copy the **Internal Database URL** once created.
    - *Option B (Neon/Supabase)*:
        - Recommended for permanent free tier. Get the Connection String.

4.  **Environment Variables**:
    - Go to the **Environment** tab of your Web Service.
    - Add the following:
      - `NODE_ENV`: `production`
      - `DATABASE_URL`: (Paste your Postgres Connection String/Internal URL)
      - `JWT_SECRET`: (Generate a random string, e.g., using `openssl rand -hex 32` or just type a long secure password)
      - `CLOUDINARY_CLOUD_NAME`: (From your Cloudinary Dashboard)
      - `CLOUDINARY_API_KEY`: (From your Cloudinary Dashboard)
      - `CLOUDINARY_API_SECRET`: (From your Cloudinary Dashboard)
      - `FRONTEND_URL`: `*` (We will update this after deploying the frontend)

5.  **Deploy**: Click **Create Web Service**.
    - Wait for the build to finish.
    - Once live, copy your Backend URL (e.g., `https://auction-backend-xyz.onrender.com`).

---

## Step 3: Seed the Database (Admin User)

1.  Wait for the Backend to be "Live".
2.  Go to the **Shell** tab in your Render Web Service.
3.  Run the seeding script:
    ```bash
    node seed_admin.js
    ```
    - This creates the admin user: `admin@example.com` / `admin123`.

---

## Step 4: Deploy Frontend to Vercel

1.  **New Project**:
    - Go to Vercel Dashboard -> **Add New...** -> **Project**.
    - Import your GitHub repository.

2.  **Configure Project**:
    - **Framework Preset**: Vite (should be auto-detected).
    - **Root Directory**: Click "Edit" and select `frontend`.

3.  **Environment Variables**:
    - Expand "Environment Variables".
    - Add:
      - `VITE_API_URL`: `https://YOUR-BACKEND-URL.onrender.com/api` (Don't forget `/api`!)
      - `VITE_SOCKET_URL`: `https://YOUR-BACKEND-URL.onrender.com` (No `/api`)

4.  **Deploy**: Click **Deploy**.
    - Wait for build.
    - Copy your new Frontend URL (e.g., `https://auction-system.vercel.app`).

---

## Step 5: Final Security Update

1.  Go back to **Render Dashboard** -> Your Backend Service -> **Environment**.
2.  Update `FRONTEND_URL` from `*` to your actual Vercel URL (e.g., `https://auction-system.vercel.app`).
    - *Note: Remove any trailing slash `/` from the URL.*
3.  **Save Changes** (Render will auto-deploy).

---

## Troubleshooting

- **CORS Errors**: Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly (no trailing slash).
- **Database Connection**: Check `DATABASE_URL` in Render.
- **Socket Connection**: Ensure `VITE_SOCKET_URL` is correct.

You are now live! 🚀
