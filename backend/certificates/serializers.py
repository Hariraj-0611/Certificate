from rest_framework import serializers
from .models import CertificateRequest


class CertificateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateRequest
        fields = [
            'id',
            'cert_id',
            'cert_type',
            'name',
            'email',
            'domain',
            'extra_field',
            'start_date',
            'end_date',
            'issue_date',
            'pdf_url',
            'status',
            'email_status',
            'created_at',
        ]
        read_only_fields = ['id', 'cert_id', 'pdf_url', 'status', 'email_status', 'created_at']


class CertificateVerificationSerializer(serializers.ModelSerializer):
    valid = serializers.SerializerMethodField()

    class Meta:
        model = CertificateRequest
        fields = [
            'valid',
            'cert_id',
            'name',
            'cert_type',
            'domain',
            'issue_date',
            'status',
        ]

    def get_valid(self, obj):
        return obj.status != 'revoked'
