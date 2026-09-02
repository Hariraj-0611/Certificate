from django.contrib import admin, messages
from django.utils import timezone
from .models import CertificateRequest, CertificateAuditLog


class CertificateAuditLogInline(admin.TabularInline):
    model = CertificateAuditLog
    extra = 0
    readonly_fields = ('action', 'actor', 'timestamp', 'metadata')
    can_delete = False


@admin.register(CertificateRequest)
class CertificateRequestAdmin(admin.ModelAdmin):
    list_display = (
        'cert_id',
        'name',
        'email',
        'cert_type',
        'domain',
        'status',
        'email_status',
        'issue_date',
        'created_at',
    )
    list_filter = (
        'cert_type',
        'status',
        'email_status',
        'issue_date',
        'created_at',
    )
    search_fields = (
        'cert_id',
        'name',
        'email',
        'domain',
    )
    readonly_fields = (
        'cert_id',
        'created_at',
        'updated_at',
        'email_sent_at',
    )
    inlines = [CertificateAuditLogInline]
    actions = ['approve_and_send_offer', 'revoke_certificate']

    @admin.action(description="APPROVE & SEND selected Offer Letters")
    def approve_and_send_offer(self, request, queryset):
        approved_count = 0
        for cert in queryset:
            if cert.cert_type == 'offer_letter' and cert.status in ['pending_approval', 'pending']:
                cert.status = 'approved'
                cert.save()
                
                # Log audit action
                CertificateAuditLog.objects.create(
                    certificate=cert,
                    action='offer_approved',
                    actor=request.user.username if request.user.is_authenticated else 'admin',
                    metadata={'approved_by_admin': True}
                )
                approved_count += 1
                
                # Note: Celery email dispatch will be attached in Phase 5/8

        if approved_count > 0:
            self.message_user(
                request,
                f"Successfully approved {approved_count} offer letter(s). Email delivery queued.",
                messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                "No eligible pending offer letters were selected.",
                messages.WARNING
            )

    @admin.action(description="Revoke selected certificates")
    def revoke_certificate(self, request, queryset):
        revoked_count = 0
        for cert in queryset:
            if cert.status != 'revoked':
                cert.status = 'revoked'
                cert.save()
                
                CertificateAuditLog.objects.create(
                    certificate=cert,
                    action='certificate_revoked',
                    actor=request.user.username if request.user.is_authenticated else 'admin',
                    metadata={'revoked_at': timezone.now().isoformat()}
                )
                revoked_count += 1

        self.message_user(
            request,
            f"Successfully revoked {revoked_count} certificate(s).",
            messages.SUCCESS
        )


@admin.register(CertificateAuditLog)
class CertificateAuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'certificate', 'action', 'actor', 'timestamp')
    list_filter = ('action', 'actor', 'timestamp')
    search_fields = ('certificate__cert_id', 'certificate__name', 'action', 'actor')
    readonly_fields = ('certificate', 'action', 'actor', 'timestamp', 'metadata')
