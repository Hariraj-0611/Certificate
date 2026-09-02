from django.test import TestCase
from django.utils import timezone
from .models import CertificateRequest, CertificateAuditLog


class CertificateModelTests(TestCase):
    def test_cert_id_generation_format(self):
        cert_id = CertificateRequest.generate_unique_cert_id()
        current_year = timezone.now().year
        self.assertTrue(cert_id.startswith(f"HAD-{current_year}-"))
        self.assertEqual(len(cert_id), 15)  # HAD-YYYY-XXXXXX = 3+1+4+1+6 = 15 chars

    def test_certificate_request_creation(self):
        cert_id = CertificateRequest.generate_unique_cert_id()
        cert = CertificateRequest.objects.create(
            cert_id=cert_id,
            cert_type='course_completion',
            name='Hari Raj',
            email='hari@example.com',
            domain='Python Full Stack',
            start_date='2026-08-01',
            end_date='2026-08-22'
        )
        self.assertEqual(cert.status, 'pending')
        self.assertEqual(cert.email_status, 'queued')
        self.assertEqual(str(cert), f"{cert_id} - Hari Raj (Course Completion)")

    def test_audit_log_creation(self):
        cert_id = CertificateRequest.generate_unique_cert_id()
        cert = CertificateRequest.objects.create(
            cert_id=cert_id,
            cert_type='offer_letter',
            name='Jane Doe',
            email='jane@example.com',
            domain='Software Engineer'
        )
        audit = CertificateAuditLog.objects.create(
            certificate=cert,
            action='offer_created',
            actor='system'
        )
        self.assertEqual(audit.action, 'offer_created')
        self.assertEqual(cert.audit_logs.count(), 1)
