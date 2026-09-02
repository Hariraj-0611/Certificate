import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Lazy imports for google drive packages
try:
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    GDRIVE_AVAILABLE = True
except ImportError:
    GDRIVE_AVAILABLE = False


def get_gdrive_service():
    """
    Initializes and returns Google Drive API v3 service client.
    Supports OAuth token.json (User Storage) or Service Account credentials.
    """
    if not GDRIVE_AVAILABLE:
        logger.warning("Google Drive client libraries not available.")
        return None

    scopes = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']

    # 0. Try GOOGLE_DRIVE_CREDENTIALS_JSON env variable first (Ideal for Render/Cloud hosting)
    creds_json_str = os.getenv('GOOGLE_DRIVE_CREDENTIALS_JSON', '').strip()
    if creds_json_str:
        try:
            import json
            info = json.loads(creds_json_str)
            credentials = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            service = build('drive', 'v3', credentials=credentials)
            return service
        except Exception as e:
            logger.warning(f"Failed to load GOOGLE_DRIVE_CREDENTIALS_JSON env var: {e}")

    # 1. Try OAuth User Credentials (token.json) first for personal Google Drive storage
    token_path = os.path.join(settings.BASE_DIR, 'token.json')
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, scopes)
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            service = build('drive', 'v3', credentials=creds)
            return service
        except Exception as e:
            logger.warning(f"Failed to load OAuth token.json: {e}")

    # 2. Fallback to Service Account credentials
    creds_file = os.getenv('GOOGLE_DRIVE_CREDENTIALS_FILE', 'service_account.json').strip()
    possible_paths = [
        creds_file,
        os.path.join(settings.BASE_DIR, creds_file),
        os.path.join(settings.BASE_DIR, 'config', creds_file)
    ]

    resolved_creds_path = None
    for p in possible_paths:
        if os.path.exists(p):
            resolved_creds_path = p
            break

    if not resolved_creds_path:
        logger.info(f"Google Drive credentials ('token.json' / '{creds_file}') not found. Drive uploads will be skipped.")
        return None

    try:
        credentials = service_account.Credentials.from_service_account_file(
            resolved_creds_path,
            scopes=scopes
        )
        service = build('drive', 'v3', credentials=credentials)
        return service
    except Exception as e:
        logger.exception(f"Failed to initialize Google Drive service: {e}")
        return None


def upload_pdf_to_gdrive(pdf_input, filename):
    """
    Uploads PDF bytes (in-memory) or a local file path to Google Drive folder.
    Sets public view permissions and returns a dict with Google Drive metadata.
    Returns None if Google Drive is not configured or upload fails.
    """
    service = get_gdrive_service()
    if not service:
        return None

    folder_id = os.getenv('GOOGLE_DRIVE_FOLDER_ID', '').strip()

    try:
        file_metadata = {
            'name': filename,
            'mimeType': 'application/pdf'
        }
        if folder_id:
            file_metadata['parents'] = [folder_id]

        import io
        from googleapiclient.http import MediaIoBaseUpload, MediaFileUpload

        if isinstance(pdf_input, bytes):
            media = MediaIoBaseUpload(io.BytesIO(pdf_input), mimetype='application/pdf', resumable=True)
        elif isinstance(pdf_input, str) and os.path.exists(pdf_input):
            media = MediaFileUpload(pdf_input, mimetype='application/pdf', resumable=True)
        else:
            logger.error("Invalid PDF input provided to upload_pdf_to_gdrive")
            return None

        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, webContentLink',
            supportsAllDrives=True
        ).execute()

        file_id = uploaded_file.get('id')

        # Make file publicly readable by anyone with the link
        try:
            service.permissions().create(
                fileId=file_id,
                body={'type': 'anyone', 'role': 'reader'},
                supportsAllDrives=True
            ).execute()
        except Exception as perm_err:
            logger.warning(f"Could not set public permissions on GDrive file {file_id}: {perm_err}")

        web_view_link = uploaded_file.get('webViewLink', '')
        web_content_link = uploaded_file.get('webContentLink', '')

        logger.info(f"Successfully uploaded '{filename}' to Google Drive (ID: {file_id})")

        return {
            'gdrive_file_id': file_id,
            'gdrive_view_url': web_view_link,
            'gdrive_download_url': web_content_link
        }

    except Exception as e:
        logger.exception(f"Error uploading file to Google Drive: {e}")
        return None


def delete_file_from_gdrive(file_id):
    """
    Deletes a file from Google Drive by its file ID.
    """
    if not file_id:
        return False

    service = get_gdrive_service()
    if not service:
        return False

    try:
        service.files().delete(
            fileId=file_id,
            supportsAllDrives=True
        ).execute()
        logger.info(f"Successfully deleted file from Google Drive (ID: {file_id})")
        return True
    except Exception as e:
        logger.warning(f"Error deleting file {file_id} from Google Drive: {e}")
        return False
