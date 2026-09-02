from django.apps import AppConfig


class CertificatesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'certificates'

    def ready(self):
        try:
            from .utils.pdf_generator import preload_templates
            preload_templates()
        except Exception:
            pass
