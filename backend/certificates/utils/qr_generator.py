import io
import base64
import qrcode
from qrcode.image.pil import PilImage


def generate_qr_base64(verify_url: str) -> str:
    """
    Generates a high-resolution QR code encoding the verification URL.
    Returns the QR code as a base64 encoded data URI string suitable for inline HTML images.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=1,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
    
    buffer = io.BytesIO()
    # pyrefly: ignore [unexpected-keyword]
    img.save(buffer, format="PNG")
    qr_bytes = buffer.getvalue()
    
    base64_encoded = base64.b64encode(qr_bytes).decode('utf-8')
    return f"data:image/png;base64,{base64_encoded}"
