import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from certificates.utils.mongo_client import get_mongo_db, ping_mongodb

def check_mongodb_summary():
    sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 60)
    print("MONGODB DATABASE SUMMARY")
    print("=" * 60)

    is_ok, details = ping_mongodb()
    if not is_ok:
        print(f"Connection Error: {details}")
        return

    db = get_mongo_db()
    if db is None:
        print("Database instance not available.")
        return

    # Total certificates
    total_certs = db.certificates.count_documents({})
    print(f"\n[+] Total Certificates in MongoDB: {total_certs}")

    # Breakdown by type
    print("\n[-] Certificate Breakdown by Type:")
    type_pipeline = [
        {'$group': {'_id': '$cert_type', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    for item in db.certificates.aggregate(type_pipeline):
        cert_type = item['_id'] or 'Unknown'
        count = item['count']
        print(f"   * {cert_type}: {count}")

    # Breakdown by status
    print("\n[-] Certificate Breakdown by Status:")
    status_pipeline = [
        {'$group': {'_id': '$status', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    for item in db.certificates.aggregate(status_pipeline):
        status_val = item['_id'] or 'Unknown'
        count = item['count']
        print(f"   * {status_val}: {count}")

    # Recent certificates
    print("\n[-] Recent 10 Certificates in MongoDB:")
    recent_certs = list(db.certificates.find({}, {'_id': 0}).sort('created_at', -1).limit(10))
    for cert in recent_certs:
        cert_id = cert.get('cert_id', 'N/A')
        name = cert.get('name', 'N/A')
        c_type = cert.get('cert_type', 'N/A')
        created = cert.get('created_at', 'N/A')[:16]
        print(f"   * {cert_id} | {name} | {c_type} | {created}")

    # Audit logs count
    total_logs = db.audit_logs.count_documents({})
    print(f"\n[+] Total Audit Logs in MongoDB: {total_logs}")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    check_mongodb_summary()
