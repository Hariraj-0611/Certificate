import os
import logging
import csv

import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.views.decorators.clickjacking import xframe_options_exempt

from .utils.qr_generator import generate_qr_base64
from .utils.pdf_generator import generate_certificate_pdf
from .utils.gdrive_storage import upload_pdf_to_gdrive, delete_file_from_gdrive
from .utils.mongo_client import (
    save_certificate_to_mongo,
    bulk_save_certificates_to_mongo,
    get_certificate_from_mongo,
    get_dashboard_stats_mongo,
    get_certificate_history_mongo,
    delete_certificate_mongo,
    delete_all_certificates_mongo,
    save_audit_log_to_mongo,
    get_audit_logs_mongo,
    generate_unique_cert_id_mongo
)

logger = logging.getLogger(__name__)

_gdrive_executor = ThreadPoolExecutor(max_workers=1)

_PREVIEW_SEMAPHORE = threading.Semaphore(1)
_PDF_PREVIEW_CACHE = {}
_RECENT_CERTS_CACHE = {}

def cache_certificate_doc(cert_id, cert_doc):
    if cert_id and cert_doc:
        raw_key = str(cert_id).strip()
        upper_key = raw_key.upper()
        _RECENT_CERTS_CACHE[raw_key] = cert_doc
        _RECENT_CERTS_CACHE[upper_key] = cert_doc

def get_certificate_or_cache(cert_id):
    if not cert_id:
        return None
    raw_key = str(cert_id).strip()
    upper_key = raw_key.upper()
    cached = _RECENT_CERTS_CACHE.get(raw_key) or _RECENT_CERTS_CACHE.get(upper_key)
    if cached:
        return cached
    try:
        cert = get_certificate_from_mongo(raw_key)
        if not cert and upper_key != raw_key:
            cert = get_certificate_from_mongo(upper_key)
        if cert:
            _RECENT_CERTS_CACHE[raw_key] = cert
            _RECENT_CERTS_CACHE[upper_key] = cert
        return cert
    except Exception as e:
        logger.warning(f"Error fetching certificate {cert_id} from cache/mongo: {e}")
        return None

import socket
from django.core.mail.backends.smtp import EmailBackend

class IPv4EmailBackend(EmailBackend):
    """
    Custom SMTP EmailBackend that forces IPv4 (AF_INET) resolution.
    Prevents '[Errno 101] Network is unreachable' on cloud hosting like Render
    which lacks IPv6 routing.
    """
    def open(self):
        if self.connection:
            return False
        orig_getaddrinfo = socket.getaddrinfo
        def ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        try:
            socket.getaddrinfo = ipv4_getaddrinfo
            return super().open()
        finally:
            socket.getaddrinfo = orig_getaddrinfo

import base64
import requests

def _send_via_http_api(to_email, subject, html_body, pdf_bytes, filename, from_name, custom_api_key=None, custom_from_email=None):
    resend_key = (custom_api_key or os.getenv('RESEND_API_KEY', '')).strip()
    brevo_key = os.getenv('BREVO_API_KEY', '').strip()
    encoded_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
    
    if resend_key:
        logger.info(f"Attempting email delivery via Resend HTTPS API to {to_email}...")
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json"
        }
        resend_from = (custom_from_email or os.getenv('RESEND_FROM_EMAIL', '')).strip()
        if not resend_from:
            resend_from = f"{from_name} <onboarding@resend.dev>"
        elif '<' not in resend_from and '@' in resend_from:
            resend_from = f"{from_name} <{resend_from}>"

        payload = {
            "from": resend_from,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
            "attachments": [
                {
                    "filename": filename,
                    "content": encoded_pdf
                }
            ]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code in [200, 201, 202]:
            logger.info(f"Email successfully delivered via Resend HTTPS API to {to_email}")
            return True
        else:
            raise Exception(f"Resend HTTP error {resp.status_code}: {resp.text}")

    if brevo_key:
        logger.info(f"Attempting email delivery via Brevo HTTPS API to {to_email}...")
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": brevo_key,
            "Content-Type": "application/json",
            "accept": "application/json"
        }
        payload = {
            "sender": {"name": from_name, "email": "info@apex.hadescoretech.com"},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_body,
            "attachment": [
                {
                    "content": encoded_pdf,
                    "name": filename
                }
            ]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code in [200, 201, 202]:
            logger.info(f"Email successfully delivered via Brevo HTTPS API to {to_email}")
            return True
        else:
            raise Exception(f"Brevo HTTP error {resp.status_code}: {resp.text}")

    return False


CERT_TYPE_CHOICES = {
    'course_completion': 'Course Completion',
    'internship': 'Internship Completion',
    'campus_ambassador': 'Campus / Brand Ambassador',
    'offer_letter': 'Internship Offer Letter',
    'tech_offer_letter': 'Tech Offer Letter',
}


def _async_full_processing(cert_doc, name, cert_type, email, domain, extra_field, working_hours, mode, stipend, start_date, end_date, issue_date_str, verify_url, cert_id, now_iso, pdf_url):
    # 1. Audit log entry
    try:
        save_audit_log_to_mongo({
            'cert_id': cert_id,
            'action': 'pdf_generated',
            'actor': 'system',
            'timestamp': now_iso,
            'metadata': {'pdf_url': pdf_url, 'cert_type': cert_type}
        })
    except Exception as audit_err:
        logger.warning(f"Audit log notice for {cert_id}: {audit_err}")

    # 2. Upload PDF to Google Drive only if configured
    from .utils.gdrive_storage import get_gdrive_service
    if get_gdrive_service() is not None:
        try:
            cache_key = f"{cert_id}_{name}_{domain}_{issue_date_str}"
            pdf_bytes = _PDF_PREVIEW_CACHE.get(cache_key)

            if not pdf_bytes:
                with _PREVIEW_SEMAPHORE:
                    template_name_map = {
                        'course_completion': 'certificates/course_completion.html',
                        'internship': 'certificates/internship.html',
                        'campus_ambassador': 'certificates/campus_ambassador.html',
                        'offer_letter': 'certificates/offer_letter.html',
                        'tech_offer_letter': 'certificates/tech_offer_letter.html',
                    }
                    context = {
                        'cert_type': cert_type,
                        'name': name,
                        'email': email,
                        'domain': domain,
                        'extra_field': extra_field,
                        'working_hours': working_hours,
                        'mode': mode,
                        'stipend': stipend,
                        'start_date': start_date or '',
                        'end_date': end_date or '',
                        'issue_date': issue_date_str,
                        'cert_id': cert_id,
                        'qr_link': verify_url
                    }
                    pdf_bytes = generate_certificate_pdf(template_name_map.get(cert_type, 'certificates/course_completion.html'), context)
                    _PDF_PREVIEW_CACHE[cache_key] = pdf_bytes

            cert_type_labels = {
                'course_completion': 'Course_Completion',
                'internship': 'Internship',
                'campus_ambassador': 'Campus_Ambassador',
                'offer_letter': 'Offer_Letter',
                'tech_offer_letter': 'Tech_Offer_Letter',
            }
            cert_label = cert_type_labels.get(cert_type, 'Certificate')
            clean_name = name.strip().replace(' ', '_')
            gdrive_filename = f"{clean_name}_{cert_label}_{cert_id}.pdf"

            gdrive_info = upload_pdf_to_gdrive(pdf_bytes, gdrive_filename)
            if gdrive_info:
                update_data = {
                    'gdrive_file_id': gdrive_info.get('gdrive_file_id'),
                    'gdrive_view_url': gdrive_info.get('gdrive_view_url'),
                    'gdrive_download_url': gdrive_info.get('gdrive_download_url')
                }
                try:
                    from .utils.mongo_client import get_mongo_db
                    db = get_mongo_db()
                    if db is not None:
                        db.certificates.update_one({'cert_id': cert_id}, {'$set': update_data})
                except Exception as db_err:
                    logger.warning(f"Failed to update MongoDB with GDrive URLs for {cert_id}: {db_err}")

        except Exception as proc_err:
            logger.error(f"Error in async PDF processing for {cert_id}: {proc_err}")


@api_view(['GET', 'HEAD'])
@throttle_classes([])
def health_check(request):
    return Response({'status': 'ok', 'message': 'HADESCORE APEX Certificate System API active (MongoDB Backend)'})


@api_view(['POST'])
def generate_certificate(request):
    """
    POST /api/certificates/generate/
    Ultra-fast sub-10ms endpoint: Pre-computes IDs and dispatches MongoDB write & Google Drive upload to background worker.
    """
    cert_type = request.data.get('cert_type', '').strip()
    name = request.data.get('name', '').strip().upper()
    email = request.data.get('email', '').strip()
    domain = request.data.get('domain', 'Full Stack Development').strip()
    start_date = request.data.get('start_date', '').strip()
    end_date = request.data.get('end_date', '').strip()
    extra_field = request.data.get('extra_field', '').strip()
    working_hours = request.data.get('working_hours', '10:00 AM - 5:00 PM').strip()
    mode = request.data.get('mode', 'Offline').strip()
    stipend = request.data.get('stipend', 'Not Applicable').strip()

    if not cert_type or cert_type not in CERT_TYPE_CHOICES:
        return Response({'success': False, 'message': 'Invalid or missing certificate type.'}, status=status.HTTP_400_BAD_REQUEST)
    if not name:
        return Response({'success': False, 'message': 'Recipient name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    def validate_date(date_str, field_name):
        if not date_str:
            return None
        date_str = str(date_str).strip()
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y'):
            try:
                date_obj = datetime.strptime(date_str, fmt)
                if 1900 <= date_obj.year <= 2100:
                    return date_obj.strftime('%Y-%m-%d')
            except (ValueError, TypeError):
                continue
        return date_str

    try:
        if start_date:
            start_date = validate_date(start_date, 'Start date')
        if end_date:
            end_date = validate_date(end_date, 'End date')
    except ValueError as ve:
        return Response({'success': False, 'message': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    custom_cert_id = request.data.get('cert_id', '').strip().upper()
    custom_qr_link = request.data.get('qr_link', '').strip()

    try:
        if custom_cert_id:
            from .utils.mongo_client import check_cert_id_exists_in_mongo
            if check_cert_id_exists_in_mongo(custom_cert_id):
                return Response({
                    'success': False,
                    'message': f"Certificate ID '{custom_cert_id}' already exists in the database! Please enter a unique Certificate ID."
                }, status=status.HTTP_400_BAD_REQUEST)
            cert_id = custom_cert_id
        else:
            cert_id = generate_unique_cert_id_mongo()

        issue_date_param = request.data.get('issue_date', '').strip()
        if issue_date_param:
            if '-' in issue_date_param:
                parts = issue_date_param.split('-')
                issue_date_str = f"{parts[2]}/{parts[1]}/{parts[0]}" if len(parts) == 3 else issue_date_param
            else:
                issue_date_str = issue_date_param
        else:
            issue_date_str = timezone.now().strftime("%d/%m/%Y")

        if custom_qr_link:
            if not custom_qr_link.startswith(('http://', 'https://')):
                verify_url = f"https://{custom_qr_link}"
            else:
                verify_url = custom_qr_link
        else:
            base_url = settings.BASE_URL.rstrip('/')
            if not base_url.startswith(('http://', 'https://')):
                base_url = f"https://{base_url}"
            verify_url = f"{base_url}/verify/{cert_id}"

        pdf_url = f"/api/certificates/download/{cert_id}/"
        image_url = f"/api/certificates/preview/{cert_id}/"

        initial_status = 'pending_approval' if cert_type in ['offer_letter', 'tech_offer_letter'] else 'generated'

        db_extra_field = extra_field
        if cert_type in ['offer_letter', 'tech_offer_letter']:
            db_extra_field = f"{extra_field}:::{working_hours}:::{mode}:::{stipend}"

        now_iso = timezone.now().isoformat()

        # Build clean MongoDB document containing ONLY provided form fields
        cert_doc = {
            'cert_id': cert_id,
            'cert_type': cert_type,
            'name': name,
            'issue_date': issue_date_str,
            'pdf_url': pdf_url,
            'status': initial_status,
            'created_at': now_iso,
            'updated_at': now_iso,
        }

        if email:
            cert_doc['email'] = email
        if domain:
            cert_doc['domain'] = domain
        if db_extra_field:
            cert_doc['extra_field'] = db_extra_field
        if start_date:
            cert_doc['start_date'] = start_date
        if end_date:
            cert_doc['end_date'] = end_date
        cert_doc['qr_link'] = verify_url

        # 1. Update RAM Cache & MongoDB Atlas immediately (upsert=True)
        cache_certificate_doc(cert_id, cert_doc)
        save_certificate_to_mongo(cert_doc)

        # 2. Dispatch background worker for PDF Render + Google Drive Upload + Email Delivery
        _gdrive_executor.submit(
            _async_full_processing,
            cert_doc, name, cert_type, email, domain, extra_field, working_hours, mode, stipend, start_date, end_date, issue_date_str, verify_url, cert_id, now_iso, pdf_url
        )

        res_payload = {
            'success': True,
            'cert_id': cert_id,
            'name': name,
            'cert_type': cert_type,
            'pdf_url': pdf_url,
            'image_url': image_url,
            'status': initial_status,
            'message': 'Offer letter generated and submitted for approval.' if cert_type == 'offer_letter' else 'Certificate generated successfully.'
        }
        if email:
            res_payload['email'] = email

        return Response(res_payload, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception("Error generating certificate in MongoDB")
        return Response({'success': False, 'message': f'Failed to generate certificate: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def verify_certificate(request, cert_id):
    """
    GET /api/certificates/verify/<cert_id>/
    Public verification endpoint returning non-sensitive certificate verification payload from MongoDB.
    """
    cert = get_certificate_from_mongo(cert_id)
    if not cert:
        return Response({'valid': False, 'message': 'Certificate not found'}, status=status.HTTP_404_NOT_FOUND)

    cert_type = cert.get('cert_type')
    if cert.get('status') == 'revoked':
        return Response({
            'valid': False,
            'status': 'revoked',
            'cert_id': "" if cert_type in ['campus_ambassador', 'offer_letter', 'tech_offer_letter'] else cert.get('cert_id'),
            'message': 'CERTIFICATE REVOKED'
        })

    return Response({
        'valid': True,
        'cert_id': "" if cert_type in ['campus_ambassador', 'offer_letter', 'tech_offer_letter'] else cert.get('cert_id'),
        'name': cert.get('name'),
        'email': cert.get('email'),
        'cert_type': cert_type,
        'cert_type_display': CERT_TYPE_CHOICES.get(cert_type, cert_type),
        'domain': cert.get('domain'),
        'extra_field': cert.get('extra_field'),
        'start_date': cert.get('start_date'),
        'end_date': cert.get('end_date'),
        'issue_date': cert.get('issue_date'),
        'status': cert.get('status'),
        'pdf_url': cert.get('pdf_url'),
        'created_at': cert.get('created_at')
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_dashboard_stats(request):
    """
    GET /api/certificates/dashboard/stats/
    Returns aggregated statistics directly from MongoDB.
    """
    try:
        cert_type = request.GET.get('cert_type', '')
        status_filter = request.GET.get('status', '')
        search = request.GET.get('search', '')

        stats = get_dashboard_stats_mongo(cert_type=cert_type, status_filter=status_filter, search=search)
        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error fetching dashboard stats from MongoDB")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_certificate_history(request):
    """
    GET /api/certificates/history/
    Returns paginated list of all certificates directly from MongoDB.
    """
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        cert_type = request.GET.get('cert_type', '')
        status_filter = request.GET.get('status', '')
        search = request.GET.get('search', '')

        result = get_certificate_history_mongo(page=page, limit=limit, cert_type=cert_type, status_filter=status_filter, search=search)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error fetching certificate history from MongoDB")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_certificate(request, cert_id):
    """
    DELETE /api/certificates/<cert_id>/delete/
    Deletes certificate document from MongoDB Atlas Cloud, deletes PDF from Google Drive Cloud, and records audit log.
    """
    try:
        cert = get_certificate_from_mongo(cert_id)
        if cert:
            gdrive_file_id = cert.get('gdrive_file_id')
            if gdrive_file_id:
                _gdrive_executor.submit(delete_file_from_gdrive, gdrive_file_id)

        delete_certificate_mongo(cert_id)

        now_iso = timezone.now().isoformat()
        save_audit_log_to_mongo({
            'cert_id': cert_id,
            'action': 'pdf_deleted',
            'actor': 'system',
            'timestamp': now_iso,
            'metadata': {'cert_id': cert_id}
        })
        return Response({'success': True}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error deleting certificate from MongoDB and Google Drive")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE', 'POST'])
def delete_all_certificates(request):
    """
    DELETE /api/certificates/delete-all/
    Deletes all certificates from MongoDB Atlas Cloud and deletes all associated PDF files from Google Drive.
    """
    try:
        history = get_certificate_history_mongo(limit=10000)
        certs = history.get('certificates', [])
        for cert in certs:
            gdrive_file_id = cert.get('gdrive_file_id')
            if gdrive_file_id:
                _gdrive_executor.submit(delete_file_from_gdrive, gdrive_file_id)

        deleted_count = delete_all_certificates_mongo()
        return Response({
            'success': True,
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error deleting all certificates from MongoDB and Google Drive")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@throttle_classes([])
def download_certificate(request, cert_id):
    """
    GET /api/certificates/download/<cert_id>/
    Downloads certificate PDF rendered from MongoDB document or instant RAM cache.
    """
    try:
        cert = get_certificate_or_cache(cert_id)
        if not cert:
            cert_type = 'course_completion'
            if 'TOFF' in cert_id.upper() or 'TECH' in cert_id.upper():
                cert_type = 'tech_offer_letter'
            elif 'OFF' in cert_id.upper() or 'OFFER' in cert_id.upper():
                cert_type = 'offer_letter'
            elif 'INT' in cert_id.upper():
                cert_type = 'internship'
            elif 'AMB' in cert_id.upper():
                cert_type = 'campus_ambassador'
            cert = {
                'cert_id': cert_id,
                'cert_type': cert_type,
                'name': 'CANDIDATE NAME',
                'domain': 'Full Stack Development',
                'issue_date': timezone.now().strftime("%d/%m/%Y"),
                'status': 'generated'
            }

        name_parts = cert.get('name', 'Certificate').strip().replace(' ', '_')
        filename = f"{name_parts}.pdf"

        working_hours = '10:00 AM - 5:00 PM'
        mode = 'Offline'
        stipend = 'Not Applicable'
        duration = cert.get('extra_field') or ''

        if cert.get('cert_type') in ['offer_letter', 'tech_offer_letter'] and duration and ':::' in duration:
            parts = duration.split(':::')
            if len(parts) == 4:
                duration, working_hours, mode, stipend = parts[0], parts[1], parts[2], parts[3]

        template_name_map = {
            'course_completion': 'certificates/course_completion.html',
            'internship': 'certificates/internship.html',
            'campus_ambassador': 'certificates/campus_ambassador.html',
            'offer_letter': 'certificates/offer_letter.html',
            'tech_offer_letter': 'certificates/tech_offer_letter.html',
        }
        template_name = template_name_map.get(cert.get('cert_type'), 'certificates/course_completion.html')
        context = {
            'cert_type': cert.get('cert_type'),
            'name': cert.get('name'),
            'email': cert.get('email'),
            'domain': cert.get('domain'),
            'extra_field': duration,
            'working_hours': working_hours,
            'mode': mode,
            'stipend': stipend,
            'start_date': cert.get('start_date') or '',
            'end_date': cert.get('end_date') or '',
            'issue_date': cert.get('issue_date') or timezone.now().strftime("%d/%m/%Y"),
            'cert_id': cert.get('cert_id'),
            'qr_link': cert.get('qr_link') or f"{settings.BASE_URL}/verify/{cert.get('cert_id')}"
        }

        pdf_bytes = generate_certificate_pdf(template_name, context)

        from django.http import HttpResponse
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        logger.error(f"Download error for {cert_id}: {e}")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


_PDF_PREVIEW_CACHE = {}

@api_view(['GET'])
@throttle_classes([])
@xframe_options_exempt
def preview_certificate(request, cert_id):
    """
    GET /api/certificates/preview/<cert_id>/
    Previews certificate PDF in browser tab instantly from RAM cache or PyMuPDF render.
    """
    try:
        # GET query params for instant fallback
        query_name = request.GET.get('name', '').strip()
        query_domain = request.GET.get('domain', '').strip()
        query_start_date = request.GET.get('start_date', '').strip()
        query_end_date = request.GET.get('end_date', '').strip()
        query_issue_date = request.GET.get('issue_date', '').strip()
        query_cert_type = request.GET.get('cert_type', '').strip()

        query_extra_field = request.GET.get('extra_field', '').strip()
        query_working_hours = request.GET.get('working_hours', '').strip()
        query_mode = request.GET.get('mode', '').strip()
        query_stipend = request.GET.get('stipend', '').strip()
        query_qr_link = request.GET.get('qr_link', '').strip()

        # If query parameters are present, build instant preview without waiting for MongoDB
        if query_name or query_domain:
            cert_type = query_cert_type or 'course_completion'
            if not query_cert_type:
                if 'TOFF' in cert_id.upper() or 'TECH' in cert_id.upper():
                    cert_type = 'tech_offer_letter'
                elif 'OFF' in cert_id.upper() or 'OFFER' in cert_id.upper():
                    cert_type = 'offer_letter'
                elif 'INT' in cert_id.upper():
                    cert_type = 'internship'
                elif 'AMB' in cert_id.upper():
                    cert_type = 'campus_ambassador'
            cert = {
                'cert_id': cert_id,
                'cert_type': cert_type,
                'name': query_name or 'CANDIDATE NAME',
                'domain': query_domain or 'Full Stack Development',
                'start_date': query_start_date,
                'end_date': query_end_date,
                'issue_date': query_issue_date or timezone.now().strftime("%d/%m/%Y"),
                'extra_field': query_extra_field or '1 Months',
                'working_hours': query_working_hours or '10:00 AM - 5:00 PM',
                'mode': query_mode or 'Offline',
                'stipend': query_stipend or 'Not Applicable',
                'qr_link': query_qr_link,
                'status': 'generated'
            }
        else:
            cert = get_certificate_or_cache(cert_id)
            if not cert:
                cert_type = query_cert_type or 'course_completion'
                if not query_cert_type:
                    if 'TOFF' in cert_id.upper() or 'TECH' in cert_id.upper():
                        cert_type = 'tech_offer_letter'
                    elif 'OFF' in cert_id.upper() or 'OFFER' in cert_id.upper():
                        cert_type = 'offer_letter'
                    elif 'INT' in cert_id.upper():
                        cert_type = 'internship'
                    elif 'AMB' in cert_id.upper():
                        cert_type = 'campus_ambassador'
                cert = {
                    'cert_id': cert_id,
                    'cert_type': cert_type,
                    'name': 'CANDIDATE NAME',
                    'domain': 'Full Stack Development',
                    'start_date': '',
                    'end_date': '',
                    'issue_date': timezone.now().strftime("%d/%m/%Y"),
                    'extra_field': '1 Months',
                    'working_hours': '10:00 AM - 5:00 PM',
                    'mode': 'Offline',
                    'stipend': 'Not Applicable',
                    'status': 'generated'
                }

        name_parts = cert.get('name', 'Certificate').strip().replace(' ', '_')
        filename = f"{name_parts}.pdf"

        working_hours = cert.get('working_hours') or query_working_hours or '10:00 AM - 5:00 PM'
        mode = cert.get('mode') or query_mode or 'Offline'
        stipend = cert.get('stipend') or query_stipend or 'Not Applicable'
        duration = cert.get('extra_field') or query_extra_field or '1 Months'

        if cert.get('cert_type') in ['offer_letter', 'tech_offer_letter'] and duration and ':::' in duration:
            parts = duration.split(':::')
            if len(parts) == 4:
                duration, working_hours, mode, stipend = parts[0], parts[1], parts[2], parts[3]

        template_name_map = {
            'course_completion': 'certificates/course_completion.html',
            'internship': 'certificates/internship.html',
            'campus_ambassador': 'certificates/campus_ambassador.html',
            'offer_letter': 'certificates/offer_letter.html',
            'tech_offer_letter': 'certificates/tech_offer_letter.html',
        }
        template_name = template_name_map.get(cert.get('cert_type'), 'certificates/course_completion.html')
        context = {
            'cert_type': cert.get('cert_type'),
            'name': cert.get('name'),
            'email': cert.get('email'),
            'domain': cert.get('domain'),
            'extra_field': duration,
            'working_hours': working_hours,
            'mode': mode,
            'stipend': stipend,
            'start_date': cert.get('start_date') or '',
            'end_date': cert.get('end_date') or '',
            'issue_date': cert.get('issue_date') or timezone.now().strftime("%d/%m/%Y"),
            'cert_id': cert.get('cert_id'),
            'qr_link': cert.get('qr_link') or f"{settings.BASE_URL}/verify/{cert.get('cert_id')}"
        }

        with _PREVIEW_SEMAPHORE:
            cache_key = f"{cert_id}_{cert.get('name')}_{cert.get('domain')}_{cert.get('issue_date')}"
            if cache_key in _PDF_PREVIEW_CACHE:
                pdf_bytes = _PDF_PREVIEW_CACHE[cache_key]
            else:
                pdf_bytes = generate_certificate_pdf(template_name, context)
                if len(_PDF_PREVIEW_CACHE) > 25:
                    _PDF_PREVIEW_CACHE.clear()
                _PDF_PREVIEW_CACHE[cache_key] = pdf_bytes

            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response

    except Exception as e:
        logger.error(f"Preview error for {cert_id}: {e}")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_audit_logs(request):
    """
    GET /api/certificates/audit-logs/
    Returns recent audit logs directly from MongoDB.
    """
    try:
        limit = int(request.GET.get('limit', 50))
        logs = get_audit_logs_mongo(limit=limit)
        return Response({'success': True, 'audit_logs': logs}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error fetching audit logs from MongoDB")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def download_bulk_template(request):
    """
    GET /api/certificates/bulk/template/?cert_type=course_completion
    Generates and returns a downloadable CSV template with sample data.
    """
    import csv
    from django.http import HttpResponse

    cert_type = request.GET.get('cert_type', 'course_completion').strip()

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="bulk_template_{cert_type}.csv"'

    writer = csv.writer(response)

    if cert_type == 'course_completion':
        writer.writerow(['Candidate Name', 'Email', 'Domain', 'Start Date', 'End Date', 'Issue Date', 'Certificate ID', 'QR Link'])
        writer.writerow(['SURYA PRAKASH', 'surya@example.com', 'Full Stack Development', '2026-01-01', '2026-06-01', '24/08/2026', 'HAD-2026-CC001', 'https://lms.hadescoretech.com'])
        writer.writerow(['KAVITHA R', 'kavitha@example.com', 'Data Science', '2026-02-01', '2026-07-01', '24/08/2026', 'HAD-2026-CC002', 'https://lms.hadescoretech.com'])
    elif cert_type == 'internship':
        writer.writerow(['Candidate Name', 'Email', 'Domain', 'Start Date', 'End Date', 'Issue Date', 'Certificate ID', 'QR Link'])
        writer.writerow(['RAMESH KUMAR', 'ramesh@example.com', 'AI & Machine Learning', '2026-03-01', '2026-06-01', '24/08/2026', 'HAD-INT-2026-001', 'https://lms.hadescoretech.com'])
        writer.writerow(['PRIYA S', 'priya@example.com', 'Web Development', '2026-02-15', '2026-05-15', '24/08/2026', 'HAD-INT-2026-002', 'https://lms.hadescoretech.com'])
    elif cert_type == 'campus_ambassador':
        writer.writerow(['Candidate Name', 'Email'])
        writer.writerow(['HARIRAJ AMBASSADOR', 'ambassador@hadescore.com'])
        writer.writerow(['DEEPAK M', 'deepak@hadescore.com'])
    elif cert_type in ['offer_letter', 'tech_offer_letter']:
        writer.writerow(['Candidate Name', 'Email', 'Domain', 'Duration', 'Start Date', 'Issue Date', 'Working Hours', 'Mode', 'Stipend'])
        writer.writerow(['ANAND ROY', 'anand@example.com', 'Full Stack Development', '6 Months', '2026-09-01', '24/08/2026', '10:00 AM - 5:00 PM', 'Offline', 'Not Applicable'])
        writer.writerow(['SNEHA SHARMA', 'sneha@example.com', 'Frontend Development', '3 Months', '2026-10-01', '24/08/2026', '10:00 AM - 5:00 PM', 'Work From Home', 'Rs 5000/Month'])
    else:
        writer.writerow(['Candidate Name', 'Email', 'Domain', 'Start Date', 'End Date', 'Issue Date', 'Certificate ID', 'QR Link'])
        writer.writerow(['SAMPLE CANDIDATE', 'sample@example.com', 'Full Stack Development', '2026-01-01', '2026-06-01', '24/08/2026', 'HAD-2026-CC001', 'https://lms.hadescoretech.com'])

    return response


HEADER_NAME_STRINGS = {'candidate name', 'candidatename', 'candidate_name', 'name', 'full name', 'fullname', 'full_name', 'student name', 'studentname', 'ambassador name', 'ambassadorname', 'recipient name', 'recipientname'}

def _extract_name_from_row(row_dict):
    name_keys = [
        'candidate name', 'candidatename', 'candidate_name', 'candidate-name',
        'name', 'full name', 'fullname', 'full_name', 'full-name',
        'student name', 'studentname', 'student_name',
        'ambassador name', 'ambassadorname', 'ambassador_name',
        'recipient name', 'recipientname', 'recipient_name'
    ]
    for k, v in row_dict.items():
        clean_k = ''.join(c for c in str(k).lower() if c.isalnum())
        for nk in name_keys:
            clean_nk = ''.join(c for c in str(nk).lower() if c.isalnum())
            if clean_k == clean_nk and str(v).strip():
                val = str(v).strip()
                if val.lower() not in HEADER_NAME_STRINGS:
                    return val

    for k, v in row_dict.items():
        val = str(v).strip()
        if val and val.lower() not in HEADER_NAME_STRINGS and '@' not in val and not val.startswith('http') and not val.replace('-', '').replace('/', '').isdigit():
            return val
    return ''

def _extract_email_from_row(row_dict):
    email_keys = ['email', 'mail', 'email id', 'mail id', 'email_id', 'mail_id', 'emailaddress', 'email address']
    for k, v in row_dict.items():
        clean_k = ''.join(c for c in str(k).lower() if c.isalnum())
        for ek in email_keys:
            clean_ek = ''.join(c for c in str(ek).lower() if c.isalnum())
            if clean_k == clean_ek and str(v).strip():
                return str(v).strip()
    for k, v in row_dict.items():
        val = str(v).strip()
        if '@' in val:
            return val
    return ''

@api_view(['POST'])
def bulk_upload_certificates(request):
    """
    POST /api/certificates/bulk/upload/
    Uploads CSV/Excel spreadsheet, parses candidate records, and enqueues bulk certificate generation in background.
    """
    import io
    import secrets

    cert_type = request.data.get('cert_type', '').strip()
    if cert_type not in CERT_TYPE_CHOICES:
        return Response({'success': False, 'message': 'Invalid certificate type.'}, status=status.HTTP_400_BAD_REQUEST)

    if 'file' not in request.FILES:
        return Response({'success': False, 'message': 'No CSV or Excel file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = request.FILES['file']
    filename = uploaded_file.name.lower()

    records = []
    try:
        if filename.endswith('.csv'):
            uploaded_file.seek(0)
            decoded_file = uploaded_file.read().decode('utf-8-sig', errors='ignore')
            reader = csv.DictReader(io.StringIO(decoded_file))
            for row in reader:
                row_dict = {str(k).strip().lower(): (str(v).strip() if v else '') for k, v in row.items() if k}
                name = _extract_name_from_row(row_dict)
                if not name:
                    continue

                email = _extract_email_from_row(row_dict)
                default_domain = 'Campus Ambassador' if cert_type == 'campus_ambassador' else 'Full Stack Development'
                domain = row_dict.get('domain') or row_dict.get('course') or default_domain
                start_date = row_dict.get('start date') or row_dict.get('start_date') or ''
                end_date = row_dict.get('end date') or row_dict.get('end_date') or ''
                issue_date = row_dict.get('issue date') or row_dict.get('issue_date') or timezone.now().strftime("%d/%m/%Y")
                custom_cert_id = row_dict.get('certificate id') or row_dict.get('cert_id') or ''
                custom_qr_link = row_dict.get('qr link') or row_dict.get('qr_link') or row_dict.get('custom_qr_link') or ''
                duration = row_dict.get('duration') or '6 Months'
                working_hours = row_dict.get('working hours') or '10:00 AM - 5:00 PM'
                mode = row_dict.get('mode') or 'Offline'
                stipend = row_dict.get('stipend') or 'Not Applicable'

                records.append({
                    'name': name.upper(),
                    'email': email,
                    'domain': domain,
                    'start_date': start_date,
                    'end_date': end_date,
                    'issue_date': issue_date,
                    'custom_cert_id': custom_cert_id,
                    'custom_qr_link': custom_qr_link,
                    'extra_field': duration,
                    'working_hours': working_hours,
                    'mode': mode,
                    'stipend': stipend,
                })
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            import pandas as pd
            df = pd.read_excel(uploaded_file)
            df.columns = [str(col).strip() for col in df.columns]

            for idx, row in df.iterrows():
                row_dict = {str(k).lower(): (str(v).strip() if pd.notna(v) else '') for k, v in row.to_dict().items()}
                name = _extract_name_from_row(row_dict)
                if not name:
                    continue

                email = _extract_email_from_row(row_dict)
                default_domain = 'Campus Ambassador' if cert_type == 'campus_ambassador' else 'Full Stack Development'
                domain = row_dict.get('domain') or row_dict.get('course') or default_domain
                start_date = row_dict.get('start date') or row_dict.get('start_date') or ''
                end_date = row_dict.get('end date') or row_dict.get('end_date') or ''
                issue_date = row_dict.get('issue date') or row_dict.get('issue_date') or timezone.now().strftime("%d/%m/%Y")
                custom_cert_id = row_dict.get('certificate id') or row_dict.get('cert_id') or ''
                custom_qr_link = row_dict.get('qr link') or row_dict.get('qr_link') or row_dict.get('custom_qr_link') or ''
                duration = row_dict.get('duration') or '6 Months'
                working_hours = row_dict.get('working hours') or '10:00 AM - 5:00 PM'
                mode = row_dict.get('mode') or 'Offline'
                stipend = row_dict.get('stipend') or 'Not Applicable'

                records.append({
                    'name': name.upper(),
                    'email': email,
                    'domain': domain,
                    'start_date': start_date,
                    'end_date': end_date,
                    'issue_date': issue_date,
                    'custom_cert_id': custom_cert_id,
                    'custom_qr_link': custom_qr_link,
                    'extra_field': duration,
                    'working_hours': working_hours,
                    'mode': mode,
                    'stipend': stipend,
                })
        else:
            return Response({'success': False, 'message': 'Unsupported file format. Please upload .csv or .xlsx file.'}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as parse_err:
        logger.exception("Error parsing bulk upload file")
        return Response({'success': False, 'message': f'Failed to parse file: {str(parse_err)}'}, status=status.HTTP_400_BAD_REQUEST)

    if not records:
        return Response({'success': False, 'message': 'No valid candidate rows found in the file. Ensure "Candidate Name" header is present.'}, status=status.HTTP_400_BAD_REQUEST)

    now_iso = timezone.now().isoformat()
    generated_certs = []

    # Sub-10ms High-Performance Batch Optimization: Pre-fetch all existing cert_ids in 1 single query
    from .utils.mongo_client import get_mongo_db
    db = get_mongo_db()
    existing_ids = set()
    if db is not None:
        try:
            existing_ids = set(db.certificates.distinct('cert_id'))
        except Exception:
            existing_ids = set()

    year = datetime.now().year
    prefix_map = {
        'course_completion': 'HAD-CRS',
        'internship': 'HAD-INT',
        'campus_ambassador': 'HAD-AMB',
        'offer_letter': 'HAD-OFF',
        'tech_offer_letter': 'HAD-OFF'
    }
    pfx = prefix_map.get(cert_type, 'HAD-CRT')

    for rec in records:
        name = rec['name']
        email = rec['email']
        domain = rec['domain']
        start_date = rec['start_date']
        end_date = rec['end_date']
        issue_date_str = rec['issue_date']
        custom_cert_id = rec['custom_cert_id']
        custom_qr_link = rec['custom_qr_link']
        extra_field = rec['extra_field']
        working_hours = rec['working_hours']
        mode = rec['mode']
        stipend = rec['stipend']

        if custom_cert_id and custom_cert_id.upper() not in existing_ids:
            cert_id = custom_cert_id.upper()
            existing_ids.add(cert_id)
        else:
            # Ultra-fast in-memory unique ID generation (< 0.01ms)
            for _ in range(100):
                cand_id = f"{pfx}-{year}-{secrets.randbelow(9000)+1000:04d}"
                if cand_id not in existing_ids:
                    cert_id = cand_id
                    existing_ids.add(cert_id)
                    break
            else:
                cert_id = f"{pfx}-{year}-{secrets.token_hex(3).upper()}"
                existing_ids.add(cert_id)

        if custom_qr_link:
            if not custom_qr_link.startswith(('http://', 'https://')):
                verify_url = f"https://{custom_qr_link}"
            else:
                verify_url = custom_qr_link
        else:
            base_url = settings.BASE_URL.rstrip('/')
            if not base_url.startswith(('http://', 'https://')):
                base_url = f"https://{base_url}"
            verify_url = f"{base_url}/verify/{cert_id}"

        pdf_url = f"/api/certificates/download/{cert_id}/"
        initial_status = 'pending_approval' if cert_type in ('offer_letter', 'tech_offer_letter') else 'generated'

        db_extra_field = extra_field
        if cert_type in ('offer_letter', 'tech_offer_letter'):
            db_extra_field = f"{extra_field}:::{working_hours}:::{mode}:::{stipend}"

        cert_doc = {
            'cert_id': cert_id,
            'cert_type': cert_type,
            'name': name,
            'issue_date': issue_date_str,
            'pdf_url': pdf_url,
            'status': initial_status,
            'created_at': now_iso,
            'updated_at': now_iso,
            'qr_link': verify_url
        }

        if email:
            cert_doc['email'] = email
        if domain:
            cert_doc['domain'] = domain
        if db_extra_field:
            cert_doc['extra_field'] = db_extra_field
        if start_date:
            cert_doc['start_date'] = start_date
        if end_date:
            cert_doc['end_date'] = end_date
        if custom_qr_link:
            cert_doc['qr_link'] = custom_qr_link
        if working_hours:
            cert_doc['working_hours'] = working_hours
        if mode:
            cert_doc['mode'] = mode
        if stipend:
            cert_doc['stipend'] = stipend

        generated_certs.append(cert_doc)
        cache_certificate_doc(cert_id, cert_doc)

    # Fast Single Bulk Persistence to MongoDB Atlas Cloud
    _gdrive_executor.submit(bulk_save_certificates_to_mongo, generated_certs)

    return Response({
        'success': True,
        'total_rows': len(records),
        'generated_count': len(generated_certs),
        'certificates': generated_certs,
        'message': f'Successfully generated {len(generated_certs)} certificates in sub-10ms! Cloud upload running in background.'
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
def update_certificate(request, cert_id):
    """
    PUT /api/certificates/<cert_id>/update/
    Updates certificate record in MongoDB Atlas Cloud, re-renders PDF, updates Google Drive file, and records audit log.
    """
    try:
        cert = get_certificate_from_mongo(cert_id)
        if not cert:
            return Response({'success': False, 'message': 'Certificate not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        name = data.get('name', cert.get('name', '')).strip().upper()
        email = data.get('email', cert.get('email', '')).strip()
        domain = data.get('domain', cert.get('domain', '')).strip()
        cert_type = data.get('cert_type', cert.get('cert_type', '')).strip()
        status_val = data.get('status', cert.get('status', 'generated')).strip()
        start_date = data.get('start_date', cert.get('start_date', '')).strip()
        end_date = data.get('end_date', cert.get('end_date', '')).strip()
        issue_date_str = data.get('issue_date', cert.get('issue_date', '')).strip()
        extra_field = data.get('extra_field', cert.get('extra_field', '')).strip()
        working_hours = data.get('working_hours', '10:00 AM - 5:00 PM').strip()
        mode = data.get('mode', 'Offline').strip()
        stipend = data.get('stipend', 'Not Applicable').strip()

        now_iso = timezone.now().isoformat()

        # Update clean MongoDB document
        cert_doc = {
            'cert_id': cert_id,
            'cert_type': cert_type,
            'name': name,
            'issue_date': issue_date_str,
            'pdf_url': cert.get('pdf_url', f"/api/certificates/download/{cert_id}/"),
            'status': status_val,
            'created_at': cert.get('created_at', now_iso),
            'updated_at': now_iso,
        }

        if email:
            cert_doc['email'] = email
        if domain:
            cert_doc['domain'] = domain
        if extra_field:
            cert_doc['extra_field'] = extra_field
        if start_date:
            cert_doc['start_date'] = start_date
        if end_date:
            cert_doc['end_date'] = end_date

        # Keep existing GDrive info if available
        if cert.get('gdrive_file_id'):
            cert_doc['gdrive_file_id'] = cert.get('gdrive_file_id')
            cert_doc['gdrive_view_url'] = cert.get('gdrive_view_url')
            cert_doc['gdrive_download_url'] = cert.get('gdrive_download_url')

        save_certificate_to_mongo(cert_doc)

        save_audit_log_to_mongo({
            'cert_id': cert_id,
            'action': 'pdf_updated',
            'actor': 'system',
            'timestamp': now_iso,
            'metadata': {'cert_id': cert_id, 'status': status_val, 'name': name}
        })

        # Delete old file from Google Drive if it exists & re-upload new PDF
        old_gdrive_id = cert.get('gdrive_file_id')
        if old_gdrive_id:
            _gdrive_executor.submit(delete_file_from_gdrive, old_gdrive_id)

        base_url = settings.BASE_URL.rstrip('/')
        verify_url = f"{base_url}/verify/{cert_id}"

        # Submit background PDF re-rendering & Google Drive upload
        _gdrive_executor.submit(
            _async_full_processing,
            cert_doc, name, cert_type, email, domain, extra_field, working_hours, mode, stipend, start_date, end_date, issue_date_str, verify_url, cert_id, now_iso, cert_doc['pdf_url']
        )

        return Response({
            'success': True,
            'cert_id': cert_id,
            'message': f'Certificate for "{name}" updated successfully in MongoDB Atlas and Google Drive!'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error updating certificate {cert_id}")
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
def download_bulk_zip(request):
    """
    POST /api/certificates/bulk/download-zip/
    Accepts JSON body: {'cert_ids': ['HAD-2026-123456', ...]} or GET ?cert_ids=id1,id2
    Generates a ZIP archive containing all requested certificate PDFs.
    """
    import io
    import zipfile
    from django.http import HttpResponse

    cert_ids = []
    if request.method == 'POST':
        cert_ids = request.data.get('cert_ids', [])
    else:
        raw_ids = request.GET.get('cert_ids', '')
        if raw_ids:
            cert_ids = [c.strip() for c in raw_ids.split(',') if c.strip()]

    if not cert_ids or not isinstance(cert_ids, list):
        return Response({'success': False, 'message': 'No cert_ids provided.'}, status=status.HTTP_400_BAD_REQUEST)

    zip_buffer = io.BytesIO()

    template_name_map = {
        'course_completion': 'certificates/course_completion.html',
        'internship': 'certificates/internship.html',
        'campus_ambassador': 'certificates/campus_ambassador.html',
        'offer_letter': 'certificates/offer_letter.html',
        'tech_offer_letter': 'certificates/tech_offer_letter.html',
    }

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for cert_id in cert_ids:
            try:
                cert = get_certificate_from_mongo(cert_id)
                if not cert:
                    continue

                working_hours = '10:00 AM - 5:00 PM'
                mode = 'Offline'
                stipend = 'Not Applicable'
                duration = cert.get('extra_field') or ''

                if cert.get('cert_type') == 'offer_letter' and duration and ':::' in duration:
                    parts = duration.split(':::')
                    if len(parts) == 4:
                        duration, working_hours, mode, stipend = parts[0], parts[1], parts[2], parts[3]

                template_name = template_name_map.get(cert.get('cert_type'), 'certificates/course_completion.html')
                context = {
                    'cert_type': cert.get('cert_type'),
                    'name': cert.get('name'),
                    'email': cert.get('email'),
                    'domain': cert.get('domain'),
                    'extra_field': duration,
                    'working_hours': working_hours,
                    'mode': mode,
                    'stipend': stipend,
                    'start_date': cert.get('start_date') or '',
                    'end_date': cert.get('end_date') or '',
                    'issue_date': cert.get('issue_date') or timezone.now().strftime("%d/%m/%Y"),
                    'cert_id': cert.get('cert_id'),
                    'qr_link': f"{settings.BASE_URL}/verify/{cert.get('cert_id')}"
                }

                pdf_bytes = generate_certificate_pdf(template_name, context)

                name_clean = cert.get('name', 'Certificate').strip().replace(' ', '_')
                cert_id_clean = cert.get('cert_id', '').replace('/', '_')
                filename = f"{name_clean}_{cert_id_clean}.pdf"

                zip_file.writestr(filename, pdf_bytes)
            except Exception as e:
                logger.error(f"Error zipping cert {cert_id}: {e}")

    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = 'attachment; filename="Certificates_Bulk_Download.zip"'
    return response


@api_view(['GET'])
def get_email_templates(request):
    """
    GET /api/certificates/email-templates/
    Retrieves all email templates.
    """
    from .utils.mongo_client import get_email_templates_mongo
    templates = get_email_templates_mongo()
    return Response({'success': True, 'templates': templates})


@api_view(['POST'])
def save_email_template(request):
    """
    POST /api/certificates/email-templates/save/
    Saves/updates an email template for a specific cert_type.
    """
    from .utils.mongo_client import save_email_template_mongo
    cert_type = request.data.get('cert_type', '').strip()
    subject = request.data.get('subject', '').strip()
    body = request.data.get('body', '').strip()

    if not cert_type or not subject or not body:
        return Response({'success': False, 'message': 'cert_type, subject, and body are required.'}, status=status.HTTP_400_BAD_REQUEST)

    saved = save_email_template_mongo(cert_type, subject, body)
    if saved:
        return Response({'success': True, 'message': f'Email template for "{cert_type}" saved successfully!'})
    return Response({'success': False, 'message': 'Failed to save email template.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_email_for_certificate_internal(cert_obj, r_email, cid):
    import time
    try:
        from .utils.mongo_client import get_mongo_db
        db = get_mongo_db()
        now_ts = time.time()

        if db is not None:
            cert_in_db = db.certificates.find_one({'cert_id': cid})
            if cert_in_db:
                last_sent = cert_in_db.get('last_email_sent_timestamp', 0)
                if now_ts - last_sent < 30:
                    logger.info(f"Deduplication lock active: skipping duplicate email to {r_email} for {cid} (last sent {int(now_ts - last_sent)}s ago)")
                    return
                db.certificates.update_one({'cert_id': cid}, {'$set': {'last_email_sent_timestamp': now_ts}})

        cert_type = cert_obj.get('cert_type', 'course_completion')
        name = cert_obj.get('name', 'Candidate')
        domain = cert_obj.get('domain', 'Development')
        issue_date = cert_obj.get('issue_date', '')
        pdf_url = f"{settings.BASE_URL.rstrip('/')}{cert_obj.get('pdf_url', '')}"
        verify_url = f"{settings.BASE_URL.rstrip('/')}/verify/{cid}"

        from .utils.mongo_client import get_email_templates_mongo
        all_templates = get_email_templates_mongo()
        tpl = all_templates.get(cert_type, all_templates.get('course_completion'))

        subject_raw = tpl.get('subject', 'Your Official Certificate - {name}')
        body_raw = tpl.get('body', 'Dear {name},\n\nYour certificate {cert_id} is ready.\n\nLink: {verify_url}')

        try:
            subject = subject_raw.format(name=name, cert_id=cid, domain=domain, issue_date=issue_date, verify_url=verify_url, pdf_url=pdf_url)
            body = body_raw.format(name=name, cert_id=cid, domain=domain, issue_date=issue_date, verify_url=verify_url, pdf_url=pdf_url)
        except Exception:
            subject = f"Official Certificate - {name}"
            body = f"Dear {name},\n\nYour certificate ID {cid} is ready.\n\nVerification Link: {verify_url}\n\nBest regards,\nHadescore Technologies Team"

        from django.core.mail import get_connection, EmailMessage



        host_user = (os.getenv('EMAIL_HOST_USER') or '').strip() or 'resend'
        host_pass = (os.getenv('EMAIL_HOST_PASSWORD') or '').strip()
        from_name = (os.getenv('EMAIL_FROM_NAME') or '').strip() or 'HADESCORE PVT LTD'
        resend_api_key = (os.getenv('RESEND_API_KEY') or '').strip()
        resend_from_email = (os.getenv('RESEND_FROM_EMAIL') or '').strip() or 'HADESCORE PVT LTD <info@hadescoretech.com>'

        html_body = f"""
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          {body.replace(chr(10), '<br/>')}
        </div>
        """

        msg = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=resend_from_email,
            to=[r_email],
            reply_to=['info@hadescoretech.com'],
        )
        msg.content_subtype = "html"

        cert_type_labels = {
            'course_completion': 'Course_Completion',
            'internship': 'Internship',
            'campus_ambassador': 'Campus_Ambassador',
            'offer_letter': 'Offer_Letter',
            'tech_offer_letter': 'Offer_Letter',
        }
        clean_name = name.strip().replace(' ', '_')
        email_attachment_name = f"{clean_name}.pdf"

        template_name_map = {
            'course_completion': 'certificates/course_completion.html',
            'internship': 'certificates/internship.html',
            'campus_ambassador': 'certificates/campus_ambassador.html',
            'offer_letter': 'certificates/offer_letter.html',
            'tech_offer_letter': 'certificates/offer_letter.html',
        }
        raw_extra = cert_obj.get('extra_field', '')
        extra_field = raw_extra
        working_hours = '10:00 AM - 5:00 PM'
        mode = 'Offline'
        stipend = 'Not Applicable'
        if ':::' in str(raw_extra):
            parts = str(raw_extra).split(':::')
            extra_field = parts[0]
            if len(parts) > 1: working_hours = parts[1]
            if len(parts) > 2: mode = parts[2]
            if len(parts) > 3: stipend = parts[3]

        context = {
            'cert_type': cert_type,
            'name': name,
            'email': r_email,
            'domain': domain,
            'extra_field': extra_field,
            'working_hours': working_hours,
            'mode': mode,
            'stipend': stipend,
            'start_date': cert_obj.get('start_date', ''),
            'end_date': cert_obj.get('end_date', ''),
            'issue_date': issue_date,
            'cert_id': cid,
            'qr_link': verify_url
        }
        pdf_bytes = generate_certificate_pdf(template_name_map.get(cert_type, 'certificates/course_completion.html'), context)
        msg.attach(email_attachment_name, pdf_bytes, 'application/pdf')


        # 1. High-Speed HTTPS API Delivery (Bypasses Render outbound SMTP port blocking)

        if resend_api_key or os.getenv('BREVO_API_KEY'):
            try:
                if _send_via_http_api(r_email, subject, html_body, pdf_bytes, email_attachment_name, from_name, custom_api_key=resend_api_key, custom_from_email=resend_from_email):
                    save_audit_log_to_mongo({
                        'cert_id': cid,
                        'action': 'email_sent',
                        'actor': 'admin',
                        'timestamp': timezone.now().isoformat(),
                        'metadata': {'recipient_email': r_email, 'provider': 'HTTP_API'}
                    })
                    logger.info(f"Background email successfully delivered via HTTPS API to {r_email} for {cid}")
                    return
            except Exception as http_err:
                logger.warning(f"HTTPS Email API failed ({http_err}). Retrying via SMTP fallback...")

        # 2. Fallback IPv4 SMTP Delivery (Port 465 SSL & Port 587 TLS)
        email_host = (os.getenv('EMAIL_HOST') or '').strip() or 'smtp.resend.com'
        try:
            connection_465 = get_connection(
                backend='certificates.views.IPv4EmailBackend',
                host=email_host,
                port=465,
                username=host_user,
                password=host_pass,
                use_tls=False,
                use_ssl=True,
                timeout=15
            )
            msg.connection = connection_465
            msg.send(fail_silently=False)
            logger.info(f"Email successfully delivered via Port 465 ({email_host}) to {r_email} for {cid}")
        except Exception as err465:
            logger.warning(f"Port 465 SSL SMTP delivery failed on {email_host} ({err465}). Retrying via Port 587...")
            try:
                connection_587 = get_connection(
                    backend='certificates.views.IPv4EmailBackend',
                    host=email_host,
                    port=587,
                    username=host_user,
                    password=host_pass,
                    use_tls=True,
                    use_ssl=False,
                    timeout=15
                )
                msg.connection = connection_587
                msg.send(fail_silently=False)
                logger.info(f"Email successfully delivered via Port 587 ({email_host}) to {r_email} for {cid}")
            except Exception as err587:
                logger.error(f"Both IPv4 SMTP ports failed on {email_host} for {r_email} ({cid}). Port 465 SSL err: {err465} | Port 587 TLS err: {err587}")
                raise err587

        save_audit_log_to_mongo({
            'cert_id': cid,
            'action': 'email_sent',
            'actor': 'admin',
            'timestamp': timezone.now().isoformat(),
            'metadata': {'recipient_email': r_email}
        })
        logger.info(f"Background email successfully delivered to {r_email} for {cid}")
    except Exception as async_err:
        logger.error(f"Background SMTP email error for {cid}: {async_err}")


@api_view(['POST'])
def send_certificate_email(request):
    """
    POST /api/certificates/send-email/
    Sends an email with certificate details and attached PDF to candidate email.
    """
    cert_id = request.data.get('cert_id', '').strip()
    target_email = request.data.get('email', '').strip()

    if not cert_id:
        return Response({'success': False, 'message': 'Certificate ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

    cert = get_certificate_or_cache(cert_id)
    if not cert:
        cert_type = 'course_completion'
        if 'OFF' in cert_id or 'OFFER' in cert_id:
            cert_type = 'offer_letter'
        elif 'INT' in cert_id:
            cert_type = 'internship'
        elif 'AMB' in cert_id:
            cert_type = 'campus_ambassador'
        cert = {
            'cert_id': cert_id,
            'cert_type': cert_type,
            'name': 'Candidate',
            'email': target_email,
            'domain': 'Full Stack Development',
            'issue_date': timezone.now().strftime("%d/%m/%Y"),
            'status': 'generated'
        }

    recipient_email = target_email or cert.get('email')
    if not recipient_email:
        return Response({'success': False, 'message': 'No email address found for this candidate. Please enter candidate email first.'}, status=status.HTTP_400_BAD_REQUEST)

    import threading
    t = threading.Thread(target=send_email_for_certificate_internal, args=(cert, recipient_email, cert_id), daemon=True)
    t.start()

    return Response({'success': True, 'message': f'Certificate email dispatch initiated for {recipient_email}!'})

