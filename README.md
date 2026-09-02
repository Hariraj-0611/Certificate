# 🎓 HADESCORE APEX - Certificate & Document Automation System

A high-performance, enterprise-grade Certificate & Offer Letter Automation System built with **React (Vite)** on the frontend, **Django REST Framework** on the backend, and **MongoDB Atlas** for document storage. 

Designed for instant certificate generation, dynamic QR-code verification, bulk CSV/Excel batch processing, automated Google Drive cloud backups, and transactional email dispatch.

---

## 🌟 Key Features

### 📄 **Multi-Document Generation**
* **Course Completion Certificates** (`HAD-CRS-YYYY-XXXX`)
* **Internship Certificates** (`HAD-INT-YYYY-XXXX`)
* **Campus Ambassador Certificates** (`HAD-AMB-YYYY-XXXX`)
* **Internship Offer Letters** (`HAD-OFF-YYYY-XXXX`)
* **Tech Offer Letters** (`HAD-OFF-YYYY-XXXX`)

### ⚡ **Sub-10ms High Performance**
* **Instant Client-Side Optimistic UI**: Generates IDs and certificate previews in sub-10ms.
* **Non-Blocking Background Processing**: Asynchronous thread pools manage PDF rendering, Google Drive sync, and MongoDB cloud persistence in the background.

### 🛡️ **Anti-Fraud QR Code Verification**
* Every generated document includes an embedded **QR code**.
* Scanning the QR code or visiting `/verify/<cert_id>` displays instant public verification status, candidate details, issue dates, and validation badges.

### 📦 **Bulk Batch Generation & ZIP Download**
* Upload candidate spreadsheets in **CSV (`.csv`)** or **Excel (`.xlsx`)** formats.
* High-speed `csv.DictReader` batch processing generates hundreds of certificates concurrently.
* Download single or batch certificates as **ZIP archives**.

### ✉️ **Custom Email Templates & Automated Dispatch**
* Rich Email Template Editor for customizing subjects and HTML bodies per certificate type.
* Direct email delivery with attached PDFs using **Resend API / SMTP**.

### ☁️ **Google Drive & Cloud Storage**
* Automatic background upload to designated Google Drive folders via Google Cloud Service Account API.
* Direct PDF preview and download links generated automatically.

---

## 🛠️ Technology Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, React Router v6 |
| **Backend** | Python 3.10+, Django 5.2, Django REST Framework |
| **Database** | MongoDB Atlas Cloud (Primary Storage), SQLite / PostgreSQL |
| **Cloud Services** | Google Drive API, Resend API / SMTP |
| **Styling & UI** | Tailwind CSS, Inter & Outfit Fonts, Micro-animations |

---

## 📁 Repository Structure

```
CERTIFICATE/
├── backend/                  # Django REST API Backend
│   ├── certificates/         # Main App (Views, Models, Serializers, Utils)
│   │   ├── templates/        # HTML Certificate Templates for PDF generation
│   │   └── utils/            # Mongo Client, PDF Generator, QR Code & GDrive Sync
│   ├── config/               # Django Settings & URL Routing
│   ├── manage.py             # Django Management Utility
│   └── requirements.txt      # Python Dependencies
│
├── frontend/                 # React + Vite Frontend SPA
│   ├── public/               # Public static assets & favicon
│   ├── src/
│   │   ├── assets/           # Logos & Static Images
│   │   ├── components/       # Reusable UI components (Navbar, Modals, Forms)
│   │   ├── pages/            # App Pages (Dashboard, Cert Generators, Login, Verify)
│   │   ├── routes/           # App Routing & Guard Protections
│   │   ├── services/         # Axios API Services
│   │   └── utils/            # Helper functions & instant cert generators
│   ├── package.json          # Node Dependencies
│   └── vite.config.js        # Vite Configuration
│
├── render.yaml               # Cloud Deployment Configuration (Render)
└── README.md                 # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)
* **MongoDB** (Local instance or MongoDB Atlas Connection URI)

---

### 1️⃣ **Backend Setup (Django)**

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```
The Django REST API will be available at `http://127.0.0.1:8000`.

---

### 2️⃣ **Frontend Setup (React + Vite)**

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The React application will be available at `http://localhost:5173`.

---

## ⚙️ Environment Variables Configuration

### **Backend (`backend/.env`)**
Create a `.env` file inside the `backend/` directory:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=*

# MongoDB Connection
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0
MONGODB_NAME=certificate

# Google Drive Cloud Storage
GOOGLE_DRIVE_FOLDER_ID=your_gdrive_folder_id
GOOGLE_DRIVE_CREDENTIALS_FILE=service_account.json

# Email Settings (Resend / SMTP)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=HADESCORE PVT LTD <info@hadescoretech.com>
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=your_resend_api_key
EMAIL_USE_TLS=True

# Application Base URL
BASE_URL=http://localhost:5173
```

### **Frontend (`frontend/.env`)**
Create a `.env` file inside the `frontend/` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🔑 Default Credentials

### **Frontend Application Login**
* **Root Admin Email (ID):** `info@apex.hadescoretech.com`
* **Password:** `@Hadescore@123`

### **Django Admin Portal** (`http://127.0.0.1:8000/admin/`)
* Create a local superuser:
  ```bash
  python manage.py createsuperuser
  ```

---

## 🌐 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/certificates/health/` | API Health Check & Database Status |
| `POST` | `/api/certificates/generate/` | Generate Single Certificate & PDF |
| `GET` | `/api/certificates/verify/<cert_id>/` | Public Certificate Verification |
| `GET` | `/api/certificates/download/<cert_id>/` | Download Certificate PDF |
| `GET` | `/api/certificates/preview/<cert_id>/` | Inline Preview Certificate PDF |
| `POST` | `/api/certificates/bulk/upload/` | Batch Upload (CSV / XLSX) |
| `POST` | `/api/certificates/bulk/download-zip/` | Export Certificates as ZIP Archive |
| `GET` | `/api/certificates/dashboard/stats/` | Dashboard Analytics & Stats |
| `GET` | `/api/certificates/history/` | Paginated Certificate History |
| `POST` | `/api/certificates/send-email/` | Send Transactional Email with PDF |

---

## 🔐 Security & Anti-Spoofing Features
* **Verification Rate Throttling**: Protects endpoints against brute-force queries.
* **CORS Security**: Restricted trusted origins and HTTPS policy.
* **Audit Logging**: Tracks every creation, update, email dispatch, and revocation event in MongoDB audit logs.

---

## 📜 License & Copyright
Copyright &copy; 2026 **HADESCORE APEX & Technologies**. All Rights Reserved.
