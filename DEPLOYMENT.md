# Deployment Guide

This document provides a comprehensive guide for deploying the DRGMC Player Auction System to production environments. The recommended stack for deployment is Render (Backend/Database) and Vercel (Frontend).

## 1. Database Provisioning

The system requires a PostgreSQL database. You can use services like Neon.tech, Supabase, or Render's Managed PostgreSQL.

1. Provision a new PostgreSQL instance.
2. Obtain the connection string (DATABASE_URL).
3. Ensure the database allows connections from your deployment platforms (Render/Vercel).

## 2. Media Storage Configuration (Cloudinary)

Player photos and team logos are stored on Cloudinary to ensure persistence.

1. Sign up for a Cloudinary account.
2. Navigate to the Dashboard to retrieve:
   - Cloud Name
   - API Key
   - API Secret
3. Create an upload preset if you wish to organize uploads into specific folders, though the default settings will work.

## 3. Backend Deployment (Render)

1. Create a new "Web Service" on Render.
2. Connect your GitHub repository.
3. Configure the following settings:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `backend`
4. Add Environment Variables in the "Env Vars" tab (refer to the Checklist below).

## 4. Frontend Deployment (Vercel)

1. Create a new Project on Vercel.
2. Connect your GitHub repository.
3. Configure the following settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `frontend`
4. Add Environment Variables (refer to the Checklist below).

## 5. Environment Variables Checklist

Ensure all variables are set correctly in their respective service dashboard.

### Backend (Render)

| Variable | Description |
| :--- | :--- |
| DATABASE_URL | Full PostgreSQL connection string |
| JWT_SECRET | A secure, random string for token signing |
| CLOUDINARY_CLOUD_NAME | Your Cloudinary cloud name |
| CLOUDINARY_API_KEY | Your Cloudinary API key |
| CLOUDINARY_API_SECRET | Your Cloudinary API secret |
| FRONTEND_URL | The URL of your deployed frontend (e.g., https://app.vercel.app) |
| PORT | Set to 10000 (standard for Render) |
| NODE_ENV | Set to production |

### Frontend (Vercel)

| Variable | Description |
| :--- | :--- |
| VITE_API_URL | The full URL of your deployed backend API (e.g., https://api.onrender.com/api) |
| VITE_SOCKET_URL | The full URL of your deployed backend (e.g., https://api.onrender.com) |

## 6. Post-Deployment Steps

1. Database Initialization: Once the backend is live, it will automatically create the necessary tables on first connection.
2. Admin User Creation: Access the backend terminal or use the provided `seed_admin.js` script to create the initial administrative account.
3. CORS Policy: Verify that the `FRONTEND_URL` in the backend matches the actual Vercel deployment URL to prevent cross-origin issues.
4. WebSocket Connection: Open the live site and check the developer console to ensure the Socket.io connection is established without errors.
