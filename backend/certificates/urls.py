from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('generate/', views.generate_certificate, name='generate_certificate'),
    path('verify/<path:cert_id>/', views.verify_certificate, name='verify_certificate'),
    path('download/<path:cert_id>/', views.download_certificate, name='download_certificate'),
    path('preview/<path:cert_id>/', views.preview_certificate, name='preview_certificate'),
    path('dashboard/stats/', views.get_dashboard_stats, name='dashboard_stats'),
    path('history/', views.get_certificate_history, name='certificate_history'),
    path('audit-logs/', views.get_audit_logs, name='audit_logs'),
    path('bulk/template/', views.download_bulk_template, name='download_bulk_template'),
    path('bulk/upload/', views.bulk_upload_certificates, name='bulk_upload_certificates'),
    path('bulk/download-zip/', views.download_bulk_zip, name='download_bulk_zip'),
    path('email-templates/', views.get_email_templates, name='get_email_templates'),
    path('email-templates/save/', views.save_email_template, name='save_email_template'),
    path('send-email/', views.send_certificate_email, name='send_certificate_email'),
    path('delete-all/', views.delete_all_certificates, name='delete_all_certificates'),
    path('<path:cert_id>/update/', views.update_certificate, name='update_certificate'),
    path('<path:cert_id>/delete/', views.delete_certificate, name='delete_certificate'),
]
