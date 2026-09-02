import random
import string
from django.db import models
from django.utils import timezone


class CertificateRequest(models.Model):
    CERT_TYPE_CHOICES = [
        ('course_completion', 'Course Completion'),
        ('internship', 'Internship Completion'),
        ('campus_ambassador', 'Campus / Brand Ambassador'),
        ('offer_letter', 'Internship Offer Letter'),
        ('tech_offer_letter', 'Tech Offer Letter'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('generated', 'Generated'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('emailed', 'Emailed'),
        ('revoked', 'Revoked'),
        ('failed', 'Failed'),
    ]

    EMAIL_STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    cert_id = models.CharField(max_length=64, unique=True, db_index=True)
    cert_type = models.CharField(max_length=32, choices=CERT_TYPE_CHOICES)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    domain = models.CharField(max_length=255, blank=True, null=True, help_text="Domain / Role / Position / Course")
    extra_field = models.CharField(max_length=255, blank=True, null=True, help_text="Additional custom field")
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    issue_date = models.DateField(default=timezone.now)
    pdf_url = models.URLField(max_length=500, blank=True, null=True)
    
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    email_status = models.CharField(max_length=32, choices=EMAIL_STATUS_CHOICES, default='queued')
    email_sent_at = models.DateTimeField(blank=True, null=True)
    email_attempts = models.IntegerField(default=0)
    email_error = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Certificate Request'
        verbose_name_plural = 'Certificate Requests'

    def __str__(self):
        return f"{self.cert_id} - {self.name} ({self.get_cert_type_display()})"

    @classmethod
    def generate_unique_cert_id(cls):
        """Generates a unique Certificate ID in format: HAD-<YEAR>-<RANDOM6> (e.g. HAD-2026-A8K291)"""
        year = timezone.now().year
        while True:
            random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            cert_id = f"HAD-{year}-{random_code}"
            if not cls.objects.filter(cert_id=cert_id).exists():
                return cert_id


class CertificateAuditLog(models.Model):
    certificate = models.ForeignKey(
        CertificateRequest,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=64, help_text="Action performed e.g. created, pdf_generated, emailed, approved, revoked")
    actor = models.CharField(max_length=255, default='system')
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, default=dict)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Certificate Audit Log'
        verbose_name_plural = 'Certificate Audit Logs'

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.certificate.cert_id} - {self.action}"


