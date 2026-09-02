import logging
import random
import secrets
import string
import re
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone

try:
    # pyrefly: ignore [missing-import]
    from pymongo import MongoClient, DESCENDING
    # pyrefly: ignore [missing-import]
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
except ImportError:
    MongoClient = None
    DESCENDING = -1

logger = logging.getLogger(__name__)

_mongo_client = None


def get_mongo_client():
    """
    Returns a singleton MongoClient connected to settings.MONGODB_URI.
    """
    global _mongo_client
    if MongoClient is None:
        logger.warning("PyMongo is not installed. Please run: pip install pymongo")
        return None

    if _mongo_client is None:
        uri = getattr(settings, 'MONGODB_URI', 'mongodb://localhost:27017/')
        try:
            _mongo_client = MongoClient(
                uri,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
                socketTimeoutMS=3000
            )
        except Exception as e:
            logger.error(f"Failed to create MongoClient for {uri}: {e}")
            return None

    return _mongo_client


_indexes_created = False

def get_mongo_db():
    """
    Returns the MongoDB database instance for settings.MONGODB_NAME ('certificate').
    Ensures unique index on cert_id in certificates collection.
    """
    global _indexes_created
    client = get_mongo_client()
    if client is None:
        return None

    db_name = getattr(settings, 'MONGODB_NAME', 'certificate')
    db = client[db_name]

    if not _indexes_created:
        try:
            db.certificates.create_index("cert_id", unique=True)
            db.certificates.create_index([("created_at", -1)])
            db.certificates.create_index("cert_type")
            db.certificates.create_index("status")
            _indexes_created = True
        except Exception as e:
            logger.warning(f"Could not create index in MongoDB: {e}")

    return db


def ping_mongodb():
    """
    Pings the MongoDB server to verify connection health.
    """
    client = get_mongo_client()
    if client is None:
        return False, "PyMongo module missing or client uninitialized."

    try:
        client.admin.command('ping')
        db_name = getattr(settings, 'MONGODB_NAME', 'certificate')
        db = client[db_name]
        collections = db.list_collection_names()
        return True, {
            "status": "connected",
            "uri": getattr(settings, 'MONGODB_URI', 'mongodb://localhost:27017/'),
            "database": db_name,
            "collections": collections
        }
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"MongoDB connection failed: {e}")
        return False, f"Could not connect to MongoDB: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected MongoDB error: {e}")
        return False, str(e)


def generate_unique_cert_id_mongo():
    """Generates a unique Certificate ID in format: HAD-<YEAR>-<RANDOM6> checking MongoDB"""
    year = timezone.now().year
    db = get_mongo_db()
    while True:
        random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        cert_id = f"HAD-{year}-{random_code}"
        if db is None or db.certificates.find_one({'cert_id': cert_id}) is None:
            return cert_id


def check_cert_id_exists_in_mongo(cert_id: str) -> bool:
    """Returns True if a certificate ID already exists in MongoDB Atlas, else False."""
    try:
        db = get_mongo_db()
        if db is not None:
            return db.certificates.find_one({'cert_id': cert_id.strip().upper()}) is not None
    except Exception as e:
        logger.warning(f"Error checking cert_id existence in MongoDB: {e}")
    return False


def save_certificate_to_mongo(cert_data: dict):
    """
    Saves or updates a certificate document in MongoDB 'certificates' collection.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return None

        cert_id = cert_data.get('cert_id')
        if not cert_id:
            return None

        now_str = timezone.now().isoformat()
        cert_data.setdefault('updated_at', now_str)
        if 'created_at' not in cert_data or not cert_data['created_at']:
            cert_data['created_at'] = now_str

        result = db.certificates.update_one(
            {'cert_id': cert_id},
            {'$set': cert_data},
            upsert=True
        )
        logger.info(f"Persisted certificate {cert_id} to MongoDB")
        return cert_data
    except Exception as e:
        logger.error(f"Failed to save certificate {cert_data.get('cert_id')} to MongoDB: {e}")
        return None


def bulk_save_certificates_to_mongo(cert_docs: list):
    """
    Saves a list of certificate documents to MongoDB in a single bulk_write operation.
    """
    if not cert_docs:
        return None
    db = get_mongo_db()
    if db is None:
        return None
    try:
        from pymongo import UpdateOne
        operations = []
        now_str = timezone.now().isoformat()
        for doc in cert_docs:
            if not doc.get('cert_id'):
                continue
            doc.setdefault('updated_at', now_str)
            if 'created_at' not in doc or not doc['created_at']:
                doc['created_at'] = now_str
            operations.append(
                UpdateOne({'cert_id': doc['cert_id']}, {'$set': doc}, upsert=True)
            )
        if operations:
            db.certificates.bulk_write(operations, ordered=False)
            logger.info(f"Bulk persisted {len(operations)} certificates to MongoDB")
        return cert_docs
    except Exception as e:
        logger.error(f"Failed bulk saving certificates to MongoDB: {e}")
        return None



def get_certificate_from_mongo(cert_id: str):
    """
    Retrieves a certificate document from MongoDB by cert_id.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return None

        return db.certificates.find_one({'cert_id': cert_id}, {'_id': 0})
    except Exception as e:
        logger.error(f"Failed to retrieve certificate {cert_id} from MongoDB: {e}")
        return None


def get_dashboard_stats_mongo(cert_type='', status_filter='', search=''):
    """
    Computes dashboard metrics directly from MongoDB. Gracefully handles connection timeouts.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return {'total_certificates': 0, 'today_count': 0, 'week_count': 0, 'by_type': [], 'by_status': []}

        query = {}
        if cert_type:
            query['cert_type'] = cert_type
        if status_filter:
            query['status'] = status_filter
        if search:
            search_regex = re.compile(re.escape(search), re.IGNORECASE)
            query['$or'] = [
                {'cert_id': search_regex},
                {'name': search_regex},
                {'email': search_regex}
            ]

        total_certificates = db.certificates.count_documents(query)

        # Time boundaries
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        week_ago = (now - timedelta(days=7)).isoformat()

        today_query = {**query, 'created_at': {'$gte': today_start}}
        week_query = {**query, 'created_at': {'$gte': week_ago}}

        today_count = db.certificates.count_documents(today_query)
        week_count = db.certificates.count_documents(week_query)

        # Aggregations
        by_type_pipeline = [
            {'$match': query},
            {'$group': {'_id': '$cert_type', 'count': {'$sum': 1}}}
        ]
        by_type_res = [{'cert_type': item['_id'], 'count': item['count']} for item in db.certificates.aggregate(by_type_pipeline)]

        by_status_pipeline = [
            {'$match': query},
            {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
        ]
        by_status_res = [{'status': item['_id'], 'count': item['count']} for item in db.certificates.aggregate(by_status_pipeline)]

        return {
            'total_certificates': total_certificates,
            'today_count': today_count,
            'week_count': week_count,
            'by_type': by_type_res,
            'by_status': by_status_res,
        }
    except Exception as e:
        logger.warning(f"MongoDB connection notice in get_dashboard_stats_mongo: {e}")
        return {'total_certificates': 0, 'today_count': 0, 'week_count': 0, 'by_type': [], 'by_status': []}


def get_certificate_history_mongo(page=1, limit=20, cert_type='', status_filter='', search=''):
    """
    Fetches paginated certificate list from MongoDB. Gracefully handles connection timeouts.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return {'success': True, 'total': 0, 'page': page, 'limit': limit, 'total_pages': 0, 'certificates': []}

        query = {}
        if cert_type:
            query['cert_type'] = cert_type
        if status_filter:
            query['status'] = status_filter
        if search:
            search_regex = re.compile(re.escape(search), re.IGNORECASE)
            query['$or'] = [
                {'cert_id': search_regex},
                {'name': search_regex},
                {'email': search_regex}
            ]

        total_count = db.certificates.count_documents(query)
        start = (page - 1) * limit

        cursor = db.certificates.find(query, {'_id': 0}).sort('created_at', DESCENDING).skip(start).limit(limit)
        certificates = list(cursor)

        for cert in certificates:
            if not cert.get('cert_id'):
                cert['cert_id'] = generate_unique_cert_id_mongo()

        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1

        return {
            'success': True,
            'total': total_count,
            'page': page,
            'limit': limit,
            'total_pages': total_pages,
            'certificates': certificates
        }
    except Exception as e:
        logger.warning(f"MongoDB connection notice in get_certificate_history_mongo: {e}")
        return {'success': True, 'total': 0, 'page': page, 'limit': limit, 'total_pages': 0, 'certificates': []}


def delete_certificate_mongo(cert_id: str):
    """
    Deletes a certificate and its audit logs from MongoDB.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return False

        db.certificates.delete_one({'cert_id': cert_id})
        db.audit_logs.delete_many({'cert_id': cert_id})
        return True
    except Exception as e:
        logger.error(f"Error deleting certificate {cert_id} from MongoDB: {e}")
        return False


def delete_all_certificates_mongo():
    """
    Deletes all certificate and audit log records from MongoDB.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return 0

        total_count = db.certificates.count_documents({})
        db.certificates.delete_many({})
        db.audit_logs.delete_many({})
        return total_count
    except Exception as e:
        logger.error(f"Error deleting all certificates from MongoDB: {e}")
        return 0


def save_audit_log_to_mongo(log_data: dict):
    """
    Saves an audit log document into MongoDB 'audit_logs' collection.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return None

        log_data.setdefault('timestamp', timezone.now().isoformat())
        result = db.audit_logs.insert_one(log_data)
        logger.info(f"Persisted audit log for {log_data.get('cert_id')} to MongoDB")
        return result
    except Exception as e:
        logger.error(f"Failed to save audit log to MongoDB: {e}")
        return None


def get_audit_logs_mongo(limit=50):
    """
    Retrieves recent audit log entries directly from MongoDB.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return []

        cursor = db.audit_logs.find({}, {'_id': 0}).sort('timestamp', DESCENDING).limit(limit)
        return list(cursor)
    except Exception as e:
        logger.error(f"Failed to retrieve audit logs from MongoDB: {e}")
        return []


def get_default_email_templates():
    return {
        'course_completion': {
            'subject': 'Official Course Completion Certificate | {name}',
            'body': 'Dear {name},\n\nGreetings from Hadescore Apex & Technologies.\n\nWe are pleased to issue your official Course Completion Certificate for successfully completing the program in {domain}.\n\nCERTIFICATE DETAILS:\n- Candidate Name: {name}\n- Certificate ID: {cert_id}\n- Specialization / Domain: {domain}\n- Date of Issue: {issue_date}\n\nATTACHMENT:\nYour official certificate document is attached to this email as a PDF file. You can download and save it directly for your professional records.\n\nWe wish you success in your future endeavors.\n\nSincerely,\nHadescore Apex & Technologies\nCertification & Credentials Authority\nwww.hadescoretech.com'
        },
        'internship': {
            'subject': 'Official Internship Completion Certificate | {name}',
            'body': 'Dear {name},\n\nCongratulations on the successful completion of your Internship Program in {domain} at Hadescore Apex & Technologies.\n\nWe are pleased to issue your official Internship Completion Certificate.\n\nINTERNSHIP DETAILS:\n- Intern Name: {name}\n- Certificate ID: {cert_id}\n- Internship Domain: {domain}\n- Date of Issue: {issue_date}\n\nATTACHMENT:\nYour official internship certificate is attached directly to this email as a PDF document.\n\nWe appreciate your hard work and dedication during your tenure with us and wish you success in your career.\n\nBest regards,\nHadescore Apex & Technologies\nHuman Resources & Training Team\nwww.hadescoretech.com'
        },
        'campus_ambassador': {
            'subject': 'Official Campus Ambassador Appointment Certificate | {name}',
            'body': 'Dear {name},\n\nGreetings from Hadescore Apex & Technologies.\n\nWe are pleased to formally present your official Campus Ambassador Appointment Certificate.\n\nAMBASSADOR DETAILS:\n- Ambassador Name: {name}\n- Reference ID: {cert_id}\n- Program: Campus Ambassador Program\n- Date of Issue: {issue_date}\n\nATTACHMENT:\nYour official appointment certificate is attached to this email as a PDF document.\n\nThank you for representing Hadescore Technologies. Welcome aboard.\n\nWarm regards,\nHadescore Community & Ambassador Program\nHadescore Apex & Technologies\nwww.hadescoretech.com'
        },
        'offer_letter': {
            'subject': 'Formal Offer of Internship | Hadescore Apex & Technologies - {name}',
            'body': 'Dear {name},\n\nWe are pleased to extend a formal Offer of Internship to you at Hadescore Apex & Technologies.\n\nOFFER DETAILS:\n- Candidate Name: {name}\n- Offer Reference ID: {cert_id}\n- Role / Domain: {domain}\n- Date of Issue: {issue_date}\n\nATTACHMENT:\nYour official Internship Offer Letter is attached directly to this email as a PDF document. Please review the document carefully.\n\nWe look forward to working with you.\n\nSincerely,\nTalent Acquisition Team\nHadescore Apex & Technologies\nwww.hadescoretech.com'
        },
        'tech_offer_letter': {
            'subject': 'Tech Internship Offer Letter | Hadescore Technologies - {name}',
            'body': 'Dear {name},\n\nWe are pleased to extend a formal Tech Internship Offer Letter to you at Hadescore Technologies.\n\nTECH OFFER DETAILS:\n- Candidate Name: {name}\n- Offer Reference ID: {cert_id}\n- Role / Domain: {domain}\n- Date of Issue: {issue_date}\n\nATTACHMENT:\nYour official Tech Internship Offer Letter is attached directly to this email as a PDF document.\n\nWe look forward to having you join our team.\n\nBest regards,\nHadescore Technologies\nHuman Resources Department\nwww.hadescoretech.com'
        }
    }


def get_email_templates_mongo():
    """
    Retrieves all email templates from MongoDB 'email_templates' collection.
    """
    defaults = get_default_email_templates()
    try:
        db = get_mongo_db()
        if db is None:
            return defaults

        cursor = db.email_templates.find({}, {'_id': 0})
        for item in cursor:
            cert_type = item.get('cert_type')
            if cert_type in defaults:
                subj = item.get('subject')
                body = item.get('body')
                if subj and subj.strip():
                    defaults[cert_type]['subject'] = subj
                if body and body.strip():
                    defaults[cert_type]['body'] = body
        return defaults
    except Exception as e:
        logger.error(f"Error fetching email templates from MongoDB: {e}")
        return defaults


def save_email_template_mongo(cert_type: str, subject: str, body: str):
    """
    Saves or updates an email template document in MongoDB.
    """
    try:
        db = get_mongo_db()
        if db is None:
            return False

        db.email_templates.update_one(
            {'cert_type': cert_type},
            {'$set': {'cert_type': cert_type, 'subject': subject, 'body': body, 'updated_at': timezone.now().isoformat()}},
            upsert=True
        )
        return True
    except Exception as e:
        logger.error(f"Error saving email template for {cert_type} to MongoDB: {e}")
        return False

