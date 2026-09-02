import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from certificates.utils.mongo_client import get_mongo_db

def clear_all_mongodb_data():
    print("=" * 60)
    print("CLEARING ALL DATA FROM MONGODB")
    print("=" * 60)

    db = get_mongo_db()
    if db is None:
        print("Error: Could not connect to MongoDB.")
        sys.exit(1)

    certs_deleted = db.certificates.delete_many({}).deleted_count
    logs_deleted = db.audit_logs.delete_many({}).deleted_count

    print(f"[-] Deleted {certs_deleted} documents from 'certificates' collection.")
    print(f"[-] Deleted {logs_deleted} documents from 'audit_logs' collection.")
    print("\n" + "=" * 60)
    print("DATABASE CLEARED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    clear_all_mongodb_data()
