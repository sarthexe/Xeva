"""
Document Parser Service - Extract text from various file types

Supports:
- PDF files (with OCR fallback for scanned documents)
- Word documents (.docx)
- Images (.png, .jpg, .jpeg, .gif, .bmp, .webp) with OCR
- Plain text (.txt, .md, .csv, .json)
"""

import io
import os
from typing import Tuple, Optional
from pathlib import Path

# PDF parsing
try:
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("⚠️ PyPDF2 not available - PDF parsing disabled")

# Word document parsing
try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    print("⚠️ python-docx not available - DOCX parsing disabled")

# Image OCR
try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️ Pillow/pytesseract not available - Image OCR disabled")

# PDF to image for OCR fallback
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    print("⚠️ pdf2image not available - PDF OCR fallback disabled")


class DocumentParser:
    """
    Universal document parser for extracting text from various file formats.
    """
    
    # Supported file extensions by category
    SUPPORTED_TEXT = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm']
    SUPPORTED_PDF = ['.pdf']
    SUPPORTED_DOCX = ['.docx', '.doc']
    SUPPORTED_IMAGES = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.tif']
    
    @classmethod
    def get_supported_extensions(cls) -> list:
        """Get all supported file extensions."""
        extensions = cls.SUPPORTED_TEXT.copy()
        if PDF_AVAILABLE:
            extensions.extend(cls.SUPPORTED_PDF)
        if DOCX_AVAILABLE:
            extensions.extend(cls.SUPPORTED_DOCX)
        if OCR_AVAILABLE:
            extensions.extend(cls.SUPPORTED_IMAGES)
        return extensions
    
    @classmethod
    def is_supported(cls, filename: str) -> bool:
        """Check if a file type is supported."""
        ext = cls._get_extension(filename)
        return ext in cls.get_supported_extensions()
    
    @staticmethod
    def _get_extension(filename: str) -> str:
        """Get lowercase file extension."""
        return Path(filename).suffix.lower()
    
    @classmethod
    async def parse(cls, content: bytes, filename: str) -> Tuple[str, dict]:
        """
        Parse document content and extract text.
        
        Args:
            content: Raw file bytes
            filename: Original filename (used to detect file type)
            
        Returns:
            Tuple of (extracted_text, metadata)
        """
        ext = cls._get_extension(filename)
        metadata = {
            "filename": filename,
            "file_type": ext,
            "parser_used": None
        }
        
        try:
            # Plain text files
            if ext in cls.SUPPORTED_TEXT:
                text = content.decode('utf-8')
                metadata["parser_used"] = "text"
                return text.strip(), metadata
            
            # PDF files
            elif ext in cls.SUPPORTED_PDF:
                if not PDF_AVAILABLE:
                    raise ValueError("PDF parsing not available. Install PyPDF2.")
                text, pdf_meta = cls._parse_pdf(content)
                metadata.update(pdf_meta)
                metadata["parser_used"] = "pdf"
                return text.strip(), metadata
            
            # Word documents
            elif ext in cls.SUPPORTED_DOCX:
                if not DOCX_AVAILABLE:
                    raise ValueError("DOCX parsing not available. Install python-docx.")
                text, docx_meta = cls._parse_docx(content)
                metadata.update(docx_meta)
                metadata["parser_used"] = "docx"
                return text.strip(), metadata
            
            # Images (OCR)
            elif ext in cls.SUPPORTED_IMAGES:
                if not OCR_AVAILABLE:
                    raise ValueError("Image OCR not available. Install Pillow and pytesseract.")
                text, img_meta = cls._parse_image(content)
                metadata.update(img_meta)
                metadata["parser_used"] = "ocr"
                return text.strip(), metadata
            
            else:
                raise ValueError(f"Unsupported file type: {ext}")
                
        except Exception as e:
            raise ValueError(f"Error parsing {filename}: {str(e)}")
    
    @staticmethod
    def _parse_pdf(content: bytes) -> Tuple[str, dict]:
        """Extract text from PDF file."""
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        text_parts = []
        total_pages = len(reader.pages)
        
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        extracted_text = "\n\n".join(text_parts)
        
        # If no text extracted, try OCR fallback
        if not extracted_text.strip() and PDF2IMAGE_AVAILABLE and OCR_AVAILABLE:
            try:
                images = convert_from_bytes(content)
                ocr_parts = []
                for img in images:
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text.strip():
                        ocr_parts.append(ocr_text)
                extracted_text = "\n\n".join(ocr_parts)
                return extracted_text, {
                    "pages": total_pages,
                    "ocr_used": True
                }
            except Exception as e:
                print(f"PDF OCR fallback failed: {e}")
        
        return extracted_text, {
            "pages": total_pages,
            "ocr_used": False
        }
    
    @staticmethod
    def _parse_docx(content: bytes) -> Tuple[str, dict]:
        """Extract text from Word document."""
        docx_file = io.BytesIO(content)
        doc = DocxDocument(docx_file)
        
        text_parts = []
        
        # Extract paragraphs
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text)
        
        # Extract tables
        table_count = 0
        for table in doc.tables:
            table_count += 1
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    text_parts.append(row_text)
        
        return "\n\n".join(text_parts), {
            "paragraphs": len(doc.paragraphs),
            "tables": table_count
        }
    
    @staticmethod
    def _parse_image(content: bytes) -> Tuple[str, dict]:
        """Extract text from image using OCR."""
        image = Image.open(io.BytesIO(content))
        
        # Get image info
        width, height = image.size
        format_type = image.format
        
        # Perform OCR
        try:
            text = pytesseract.image_to_string(image)
        except Exception as e:
            if "tesseract is not installed" in str(e).lower():
                raise ValueError("Tesseract OCR is not installed on the server. Please install it to process images.")
            raise ValueError(f"OCR failed: {str(e)}")
        
        return text, {
            "image_width": width,
            "image_height": height,
            "image_format": format_type
        }


# Singleton instance
document_parser = DocumentParser()
