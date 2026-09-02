from django.utils import timezone
import io
import os
import logging
import qrcode
from pathlib import Path
from django.conf import settings
import pymupdf

logger = logging.getLogger(__name__)

_TEMPLATE_CACHE = {}
_FONT_CACHE = {}


def preload_templates():
    """Preloads all PDF template files into RAM cache at server startup for sub-millisecond rendering."""
    templates_dir = Path(settings.BASE_DIR) / 'certificates' / 'static' / 'templates'
    if not templates_dir.exists():
        return
    for t_file in templates_dir.glob('*.pdf'):
        try:
            path_str = str(t_file)
            if path_str not in _TEMPLATE_CACHE:
                with open(t_file, 'rb') as f:
                    _TEMPLATE_CACHE[path_str] = f.read()
                logger.info(f"Preloaded template: {t_file.name}")
        except Exception as e:
            logger.warning(f"Could not preload {t_file.name}: {e}")


def generate_certificate_pdf(template_name: str, context: dict) -> bytes:
    """
    Fast certificate PDF generation with optimized rendering pipeline.
    """
    # 1. Identify PDF template file path (cached path lookup)
    cert_type = context.get('cert_type', '')
    if not cert_type:
        if 'tech_offer' in template_name:
            cert_type = 'tech_offer_letter'
        elif 'internship' in template_name:
            cert_type = 'internship'
        elif 'ambassador' in template_name:
            cert_type = 'campus_ambassador'
        elif 'offer' in template_name:
            cert_type = 'offer_letter'
        else:
            cert_type = 'course_completion'

    template_filename_map = {
        'course_completion': 'course_completion_template.pdf',
        'internship': 'internship_template.pdf',
        'campus_ambassador': 'campus_ambassador_template.pdf',
        'offer_letter': 'offer_letter_template.pdf',
        'tech_offer_letter': 'tech_offer_letter_template.pdf',
    }

    filename = template_filename_map.get(cert_type, 'course_completion_template.pdf')
    templates_dir = Path(settings.BASE_DIR) / 'certificates' / 'static' / 'templates'
    pdf_template_path = templates_dir / filename

    if not pdf_template_path.exists():
        logger.error(f"Template file not found at {pdf_template_path}")
        raise FileNotFoundError(f"Template file not found: {pdf_template_path}")

    # 2. Open PDF document with PyMuPDF (in-memory cached stream for instant 0ms load)
    path_str = str(pdf_template_path)
    if path_str not in _TEMPLATE_CACHE:
        with open(pdf_template_path, 'rb') as f:
            _TEMPLATE_CACHE[path_str] = f.read()

    doc = pymupdf.open(stream=_TEMPLATE_CACHE[path_str], filetype="pdf")
    page = doc[0]

    # Extract context variables
    name = context.get('name', '').strip()
    raw_domain = context.get('domain', '').strip() or 'Full Stack Development'
    start_date = str(context.get('start_date', '') or '')
    end_date = str(context.get('end_date', '') or '')
    raw_issue_date = str(context.get('issue_date', '') or '').strip()
    cert_id = str(context.get('cert_id', '') or '')
    custom_qr_link = str(context.get('qr_link', '') or '').strip()
    extra_field = str(context.get('extra_field', '') or '1 Month').strip()
    working_hours = str(context.get('working_hours', '') or '10:00 AM - 5:00 PM').strip()
    mode = str(context.get('mode', '') or 'Offline').strip()
    stipend = str(context.get('stipend', '') or 'Not Applicable').strip()

    # Deduplicate repeated words in domain string (e.g. "Full Stack Development Course Course" -> "Full Stack Development")
    clean_domain = raw_domain
    if cert_type == 'course_completion':
        if clean_domain.lower().endswith(' course'):
            clean_domain = clean_domain[:-7].strip()
    elif cert_type == 'internship':
        if clean_domain.lower().endswith(' internship'):
            clean_domain = clean_domain[:-11].strip()
        elif clean_domain.lower().endswith(' program'):
            clean_domain = clean_domain[:-8].strip()
    elif cert_type in ['offer_letter', 'tech_offer_letter']:
        if clean_domain.lower().startswith('role:'):
            clean_domain = clean_domain[5:].strip()

    domain = clean_domain

    # Clean issue date prefix duplication (e.g. "Issued on: 24/08/2026" -> "24/08/2026")
    issue_date = raw_issue_date
    if issue_date.lower().startswith('issued on:'):
        issue_date = issue_date[10:].strip()
    elif issue_date.lower().startswith('issued on'):
        issue_date = issue_date[9:].strip()
    
    # Calculate year
    year_str = issue_date.split('/')[-1] if '/' in issue_date else '2026'

    # Determine verification URL for QR Code
    if custom_qr_link:
        if not custom_qr_link.startswith(('http://', 'https://')):
            verify_url = f"https://{custom_qr_link}"
        else:
            verify_url = custom_qr_link
    else:
        base_url = getattr(settings, 'BASE_URL', 'https://certificate-frontend.onrender.com').rstrip('/')
        if not base_url.startswith(('http://', 'https://')):
            base_url = f"https://{base_url}"
        verify_url = f"{base_url}/verify/{cert_id}"

    # ----------------------------------------------------
    # OFFER LETTER SPECIAL HANDLING (PORTRAIT TEMPLATE)
    # ----------------------------------------------------
    if cert_type in ['offer_letter', 'tech_offer_letter']:
        # 1. Top Issue Date ("Date: 14/05/2026")
        page.add_redact_annot(pymupdf.Rect(400, 160, 545, 185), fill=None)
        page.apply_redactions()
        page.insert_text(pymupdf.Point(435, 176), "Date: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
        page.insert_text(pymupdf.Point(470, 176), issue_date, fontsize=12, fontname="tiro", color=(0, 0, 0))

        # 2. Recipient Name ("Name" under "To,")
        name_rects = page.search_for('Name')
        if name_rects:
            r = name_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 3, 450, r.y1 + 5), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(72.3, r.y1 - 2.5), name, fontsize=13, fontname="tibo", color=(0, 0, 0))

        # 3. Role: ("Role: Full - stack Developer")
        role_rects = page.search_for('Role:')
        if role_rects:
            r = role_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Role: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
            page.insert_text(pymupdf.Point(102, r.y1 - 2.5), domain, fontsize=12, fontname="tiro", color=(0, 0, 0))

        # 4. Duration: ("Duration: 1 Months")
        dur_rects = page.search_for('Duration:')
        if dur_rects:
            r = dur_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Duration: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
            page.insert_text(pymupdf.Point(125, r.y1 - 2.5), extra_field, fontsize=12, fontname="tiro", color=(0, 0, 0))

        # 5. Date: ("Date: DD/MM/YYYY") under Duration
        joining_date_val = start_date if start_date else issue_date
        if '-' in str(joining_date_val):
            parts = str(joining_date_val).split('-')
            if len(parts) == 3:
                joining_date_val = f"{parts[2]}/{parts[1]}/{parts[0]}"

        date_rects = page.search_for('Date:')
        for r in date_rects:
            if r.y0 > 350: # Offer details section date box
                page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
                page.apply_redactions()
                page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Date: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
                page.insert_text(pymupdf.Point(102, r.y1 - 2.5), str(joining_date_val), fontsize=12, fontname="tiro", color=(0, 0, 0))
                break

        # 6. Working Hours: ("Working Hours: 10:00 AM - 5:00 PM")
        wh_rects = page.search_for('Working Hours:')
        if wh_rects:
            r = wh_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Working Hours: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
            page.insert_text(pymupdf.Point(160, r.y1 - 2.5), working_hours, fontsize=12, fontname="tiro", color=(0, 0, 0))

        # 7. Mode: ("Mode: Offline")
        mode_rects = page.search_for('Mode:')
        if mode_rects:
            r = mode_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Mode: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
            page.insert_text(pymupdf.Point(108, r.y1 - 2.5), mode, fontsize=12, fontname="tiro", color=(0, 0, 0))

        # 8. Stipend: ("Stipend: Not Applicable")
        stipend_rects = page.search_for('Stipend:')
        if stipend_rects:
            r = stipend_rects[0]
            page.add_redact_annot(pymupdf.Rect(70, r.y0 - 2, 450, r.y1 + 4), fill=None)
            page.apply_redactions()
            page.insert_text(pymupdf.Point(70.8, r.y1 - 2.5), "Stipend: ", fontsize=12, fontname="tibo", color=(0, 0, 0))
            page.insert_text(pymupdf.Point(118, r.y1 - 2.5), stipend, fontsize=12, fontname="tiro", color=(0, 0, 0))

    # ----------------------------------------------------
    # LANDSCAPE CERTIFICATES HANDLING
    # ----------------------------------------------------
    else:
        # Helper to format date YYYY-MM-DD -> DD/MM/YYYY
        def format_date_slash(d_str):
            if not d_str: return ""
            if '-' in str(d_str):
                parts = str(d_str).split('-')
                if len(parts) == 3:
                    return f"{parts[2]}/{parts[1]}/{parts[0]}"
            return str(d_str)

        # 3. Candidate Name Overlay (Dynamic Font Sizing based on length)
        clean_name = name.upper()
        if len(clean_name) <= 16:
            name_font_size = 24
        elif len(clean_name) <= 30:
            name_font_size = 21
        elif len(clean_name) <= 45:
            name_font_size = 17
        else:
            name_font_size = 14

        page_width = page.rect.width

        if cert_type == 'campus_ambassador':
            # Redact existing placeholder area
            page.add_redact_annot(pymupdf.Rect(280, 205, 550, 275), fill=None)
            page.apply_redactions()

            amb_display_name = name.strip().upper()

            if len(amb_display_name) <= 12:
                amb_sz = 42
            elif len(amb_display_name) <= 22:
                amb_sz = 36
            elif len(amb_display_name) <= 34:
                amb_sz = 28
            else:
                amb_sz = 24

            amb_draw_rect = pymupdf.Rect(20, 230, 822, 298)
            fonts_dir = Path(settings.BASE_DIR) / 'certificates' / 'static' / 'fonts'
            font_archive = pymupdf.Archive(fonts_dir) if fonts_dir.exists() else None

            amb_html = f"""
            <style>
            @font-face {{
                font-family: 'Shrikhand';
                src: url('Shrikhand-Regular.ttf');
            }}
            </style>
            <div style="font-family: 'Shrikhand', 'Lexend Deca', 'Helvetica', sans-serif; font-size: {amb_sz}pt; font-weight: 800; text-align: center; color: #000000; line-height: 1.0; margin: 0; padding: 0;">
              {amb_display_name}
            </div>
            """
            page.insert_htmlbox(amb_draw_rect, amb_html, archive=font_archive)
        else:
            name_rects = page.search_for('NAME')
            main_name_rect = None
            for r in name_rects:
                if r.y0 < 270:
                    main_name_rect = r
                    break
            if not main_name_rect and name_rects:
                main_name_rect = name_rects[0]

            if main_name_rect:
                page.add_redact_annot(pymupdf.Rect(180, main_name_rect.y0 - 2, 670, main_name_rect.y1 + 2), fill=None)
                page.apply_redactions()
                
                # Position name slightly above the decorative underline (y=238..262)
                name_draw_rect = pymupdf.Rect(40, 238, page_width - 40, 262)
                name_html = f"""
                <div style="font-family: 'Lexend Deca', 'Helvetica', sans-serif; font-size: {name_font_size}pt; font-weight: 800; text-align: center; color: #000000; line-height: 1.0; margin: 0; padding: 0;">
                  {clean_name}
                </div>
                """
                page.insert_htmlbox(name_draw_rect, name_html)

        # 4. Body Text Overlays for Course & Internship Certificates
        if cert_type in ['course_completion', 'internship']:
            # Remove old template paragraphs completely for both internship and course_completion
            full_para_rect = pymupdf.Rect(30, 274, 780, 420)
            page.add_redact_annot(full_para_rect, fill=(1, 1, 1))
            page.apply_redactions()

            s_date = format_date_slash(start_date)
            e_date = format_date_slash(end_date)
            
            if not e_date:
                e_date = issue_date or timezone.now().strftime("%d/%m/%Y")
            if not s_date:
                try:
                    if '/' in str(e_date):
                        eparts = str(e_date).split('/')
                        d_day, d_m, d_y = int(eparts[0]), int(eparts[1]), int(eparts[2])
                        start_m = d_m - 6
                        start_y = d_y
                        if start_m <= 0:
                            start_m += 12
                            start_y -= 1
                        s_date = f"{d_day:02d}/{start_m:02d}/{start_y}"
                    else:
                        s_date = "01/01/2026"
                except Exception:
                    s_date = "01/01/2026"
            
            rect_body = pymupdf.Rect(84.2, 280, 762.5, 420)
            
            if cert_type == 'course_completion':
                html_content = f"""
                <div style="font-family: 'Lexend Deca', 'Helvetica', sans-serif; font-size: 11.5pt; text-align: justify; line-height: 1.55; color: #000000;">
                  has successfully completed the <b>{domain}</b> Course conducted by HADESCORE APEX &amp; TECHNOLOGIES, a Branch of HADESCORE PRIVATE LIMITED, from <b>{s_date}</b> to <b>{e_date}</b>.
                  <div style="margin-top: 4px; text-align: justify;">
                    During the program, the candidate actively participated in the training sessions, completed the required assessments and projects, and demonstrated dedication, commitment, and satisfactory performance. The candidate has acquired valuable theoretical knowledge and practical skills in the respective domain and has successfully fulfilled the requirements of the program.
                  </div>
                </div>
                """
                page.insert_htmlbox(rect_body, html_content)
                
            else:  # internship - FULLY JUSTIFIED HTMLBOX (Left & Right edges straight)
                html_content = f"""
                <div style="font-family: 'Lexend Deca', 'Helvetica', sans-serif; font-size: 11.5pt; text-align: justify; line-height: 1.55; color: #000000;">
                  has successfully completed the <b>{domain}</b> Internship at HADESCORE APEX &amp; TECHNOLOGIES, a Branch of HADESCORE PRIVATE LIMITED, from <b>{s_date}</b> to <b>{e_date}</b>.
                  <div style="margin-top: 4px; text-align: justify;">
                    During the internship, the candidate actively participated in assigned training, tasks, projects, and practical activities, demonstrating dedication, commitment, and satisfactory performance. The candidate has gained valuable practical knowledge, technical skills, and industry exposure in the respective domain and has successfully fulfilled the requirements of the internship program.
                  </div>
                </div>
                """
                page.insert_htmlbox(rect_body, html_content)

        # 5. Certificate No Box (Skipped for Campus Ambassador, Offer Letter, Tech Offer Letter)
        if cert_type not in ['campus_ambassador', 'offer_letter', 'tech_offer_letter']:
            # Redact ONLY the template placeholder line "HAT/ADM/[Year]/[Unique ID]" below "Certificate No"
            cert_no_rect = pymupdf.Rect(570, 503, 718, 520)
            page.add_redact_annot(cert_no_rect, fill=None)
            page.apply_redactions()
            
            # Use exact cert_id string from form (no added prefix, regular font)
            full_cert_no = cert_id
                
            page.insert_textbox(pymupdf.Rect(550, 503, 716, 522), full_cert_no, fontsize=8.5, fontname="helv", color=(0.15, 0.15, 0.15), align=2)

        # 6. Issued on Box ("Issued on: [DD/MM/YYYY]")
        if cert_type != 'campus_ambassador':
            issued_on_rect = pymupdf.Rect(550, 524, 716, 542)
            page.add_redact_annot(issued_on_rect, fill=None)
            page.apply_redactions()
            issued_on_text = f"Issued on: {issue_date}"
            
            for i_sz in [8.5, 8.0, 7.5]:
                rc = page.insert_textbox(pymupdf.Rect(550, 524, 716, 542), issued_on_text, fontsize=i_sz, fontname="hebo", color=(0.1, 0.1, 0.1), align=2)
                if rc >= 0:
                    break

            # 7. QR Code handling: 100% Always generate dynamic QR code for custom link or verification URL
            qr_rect = pymupdf.Rect(728, 439, 801, 512)  # Centered and padded inside box
            target_qr_url = verify_url
            
            if target_qr_url:
                try:
                    # Erase old static template placeholder underneath with solid fill
                    page.add_redact_annot(qr_rect, fill=(1, 1, 1))
                    page.apply_redactions()

                    qr = qrcode.QRCode(
                        version=1,
                        error_correction=qrcode.constants.ERROR_CORRECT_H,
                        box_size=10,
                        border=1,
                    )
                    qr.add_data(target_qr_url)
                    qr.make(fit=True)
                    qr_img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
                    
                    qr_buffer = io.BytesIO()
                    # pyrefly: ignore [unexpected-keyword]
                    qr_img.save(qr_buffer, format="PNG")
                    qr_bytes = qr_buffer.getvalue()

                    # Insert new dynamic QR image
                    page.insert_image(qr_rect, stream=qr_bytes, keep_proportion=True)
                    logger.info(f"Successfully overlaid dynamic QR code for {target_qr_url}")
                except Exception as e:
                    logger.error(f"Failed to insert QR code into PDF: {e}")

    # 8. Return PDF Bytes with stream compression (deflate=True, garbage=3) for sub-1.5MB file size
    output_buffer = io.BytesIO()
    doc.save(output_buffer, deflate=True, garbage=3)
    pdf_bytes = output_buffer.getvalue()
    doc.close()
    del doc
    del page
    import gc
    gc.collect()

    logger.info("Successfully generated clean non-overlapping PDF via PyMuPDF vector overlay")
    return pdf_bytes
