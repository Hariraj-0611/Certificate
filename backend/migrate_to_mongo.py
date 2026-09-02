import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from certificates.models import CertificateRequest, CertificateAuditLog
from certificates.utils.mongo_client import get_mongo_db

def migrate_sqlite_to_mongodb():
    print("=" * 60)
    print("MIGRATING SQLITE DATA TO MONGODB")
    print("=" * 60)

    db = get_mongo_db()
    if db is None:
        print("Error: Could not connect to MongoDB. Make sure MongoDB service is running!")
        sys.exit(1)

    # 1. Migrate Certificates
    cert_count = 0
    certificates = CertificateRequest.objects.all()
    print(f"Found {certificates.count()} certificate records in SQLite...")

    for cert in certificates:
        doc = {
            'cert_id': cert.cert_id,
            'cert_type': cert.cert_type,
            'name': cert.name,
            'email': cert.email,
            'domain': cert.domain,
            'extra_field': cert.extra_field,
            'start_date': str(cert.start_date) if cert.start_date else None,
            'end_date': str(cert.end_date) if cert.end_date else None,
            'issue_date': str(cert.issue_date) if cert.issue_date else None,
            'pdf_url': cert.pdf_url,
            'status': cert.status,
            'email_status': cert.email_status,
            'email_sent_at': cert.email_sent_at.isoformat() if cert.email_sent_at else None,
            'email_attempts': cert.email_attempts,
            'email_error': cert.email_error,
            'created_at': cert.created_at.isoformat() if cert.created_at else None,
            'updated_at': cert.updated_at.isoformat() if cert.updated_at else None,
        }
        db.certificates.update_one({'cert_id': cert.cert_id}, {'$set': doc}, upsert=True)
        cert_count += 1

    print(f"Successfully migrated {cert_count} certificates to MongoDB ('certificates' collection).")

    # 2. Migrate Audit Logs
    audit_count = 0
    audit_logs = CertificateAuditLog.objects.all()
    print(f"\nFound {audit_logs.count()} audit log records in SQLite...")

    for log in audit_logs:
        doc = {
            'cert_id': log.certificate.cert_id if log.certificate else None,
            'action': log.action,
            'actor': log.actor,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None,
            'metadata': log.metadata,
        }
        db.audit_logs.update_one(
            {
                'cert_id': doc['cert_id'],
                'action': doc['action'],
                'timestamp': doc['timestamp']
            },
            {'$set': doc},
            upsert=True
        )
        audit_count += 1

    print(f"Successfully migrated {audit_count} audit logs to MongoDB ('audit_logs' collection).")
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    migrate_sqlite_to_mongodb()
