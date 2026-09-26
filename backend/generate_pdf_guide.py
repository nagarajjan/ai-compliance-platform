import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def create_pdf(filename="C:\\Users\\User\\AI_Platform_Reference_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=5
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceBefore=7,
        spaceAfter=3
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )
    
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F8FAFC'),
        borderColor=colors.HexColor('#E2E8F0'),
        borderWidth=0.5,
        borderPadding=5,
        spaceBefore=3,
        spaceAfter=5
    )

    story = []

    # Header
    story.append(Paragraph("Enterprise AI RAG & Multi-LLM Platform", title_style))
    story.append(Paragraph("Complete Operations, Multi-Provider Setup & JEV Audit Manual", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6366F1'), spaceAfter=12))

    # Section 1: Overview
    story.append(Paragraph("1. Architecture & Core Capabilities", h1_style))
    arch_text = """
    The platform is a multi-provider AI Document Intelligence & Compliance engine supporting local Ollama models (Llama 3.2, Mistral, Phi-3, Qwen) alongside Cloud Providers (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, and Google Gemini). It features vector indexing via ChromaDB, pdfplumber table extraction, and Journal Entry Verification (JEV) audit reporting.
    """
    story.append(Paragraph(arch_text.strip(), body_style))

    # Components Table
    data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Path / Endpoint</b>", body_style), Paragraph("<b>Functionality</b>", body_style)],
        [Paragraph("FastAPI Backend", body_style), Paragraph("backend/main.py", body_style), Paragraph("Multi-provider REST API & RAG pipeline", body_style)],
        [Paragraph("Environment Config", body_style), Paragraph("backend/.env", body_style), Paragraph("API Keys & default Ollama settings", body_style)],
        [Paragraph("ChromaDB Vector Store", body_style), Paragraph("vectorstore/chroma_db", body_style), Paragraph("Persistent vector database", body_style)],
        [Paragraph("Next.js Dashboard UI", body_style), Paragraph("frontend/app/page.tsx", body_style), Paragraph("Multi-LLM selector & JEV Audit presets", body_style)],
        [Paragraph("Template Engine", body_style), Paragraph("templates/", body_style), Paragraph("PDF & Markdown layout templates", body_style)]
    ]
    t = Table(data, colWidths=[120, 140, 270])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EEF2FF')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#312E81')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    # Section 2: Multi-LLM Provider Support
    story.append(Paragraph("2. Multi-LLM Provider & API Key Configuration", h1_style))
    story.append(Paragraph("Configure keys in backend/.env or directly in the UI Header Settings bar:", body_style))
    
    prov_data = [
        [Paragraph("<b>Provider</b>", body_style), Paragraph("<b>Supported Models</b>", body_style), Paragraph("<b>API Key Variable (.env)</b>", body_style)],
        [Paragraph("Ollama (Local)", body_style), Paragraph("llama3.2, mistral, phi3, qwen2.5:7b, deepseek-r1:8b", body_style), Paragraph("None (Runs locally on :11435)", body_style)],
        [Paragraph("OpenAI", body_style), Paragraph("gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo", body_style), Paragraph("OPENAI_API_KEY", body_style)],
        [Paragraph("Anthropic", body_style), Paragraph("claude-3-5-sonnet-20240620, claude-3-haiku, claude-3-opus", body_style), Paragraph("ANTHROPIC_API_KEY", body_style)],
        [Paragraph("Google Gemini", body_style), Paragraph("gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro", body_style), Paragraph("GEMINI_API_KEY", body_style)]
    ]
    t_prov = Table(prov_data, colWidths=[100, 240, 190])
    t_prov.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(t_prov)
    story.append(Spacer(1, 8))

    # Section 3: JEV Audit Feature
    story.append(Paragraph("3. Journal Entry Verification (JEV) Audit Support", h1_style))
    jev_text = """
    <b>Journal Entry Verification (JEV)</b> audit compliance is supported via pdfplumber table extraction which extracts accounting ledgers, account numbers, line items, and debit/credit balances from financial PDFs. The RAG pipeline matches query scopes against financial entries and generates cited audit summaries flagging missing documentation or abnormal postings.
    """
    story.append(Paragraph(jev_text.strip(), body_style))

    # Section 4: 4 Windows Operations
    story.append(Paragraph("4. Four-Terminal Operations Guide", h1_style))
    
    story.append(Paragraph("Window 1: Start FastAPI Server", h2_style))
    w1 = "cd C:\\Users\\User\\.gemini\\antigravity\\scratch\\ai-platform\\backend<br/>" \
         ".\\.venv\\Scripts\\Activate.ps1<br/>" \
         "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    story.append(Paragraph(w1, code_style))

    story.append(Paragraph("Window 2: RAG & JEV Query API Commands", h2_style))
    w2 = "# Run JEV Audit Query via REST API<br/>" \
         "$body = @{<br/>" \
         "    workspace = 'demo'<br/>" \
         "    query     = 'Perform Journal Entry Verification (JEV) audit on all financial statements'<br/>" \
         "    top_k     = 5<br/>" \
         "    provider  = 'ollama'<br/>" \
         "    model_name= 'llama3.2'<br/>" \
         "} | ConvertTo-Json<br/>" \
         "Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/query' -ContentType 'application/json' -Body $body"
    story.append(Paragraph(w2, code_style))

    story.append(Paragraph("Window 3: Start Next.js Web Dashboard", h2_style))
    w3 = "cd C:\\Users\\User\\.gemini\\antigravity\\scratch\\ai-platform\\frontend<br/>" \
         "npm run dev<br/>" \
         "# Open in browser: http://localhost:3000"
    story.append(Paragraph(w3, code_style))

    story.append(Paragraph("Window 4: Ollama Local Service", h2_style))
    w4 = "ollama serve  # Running on http://localhost:11435"
    story.append(Paragraph(w4, code_style))

    # Section 5: API Reference Table
    story.append(Paragraph("5. API Endpoints Reference", h1_style))
    api_data = [
        [Paragraph("<b>Endpoint</b>", body_style), Paragraph("<b>Method</b>", body_style), Paragraph("<b>Description & Multi-LLM Parameters</b>", body_style)],
        [Paragraph("/health", body_style), Paragraph("GET", body_style), Paragraph("Returns server health status", body_style)],
        [Paragraph("/api/models", body_style), Paragraph("GET", body_style), Paragraph("Lists installed Ollama models dynamically", body_style)],
        [Paragraph("/api/upload", body_style), Paragraph("POST", body_style), Paragraph("Upload source PDFs/DOCX to workspace", body_style)],
        [Paragraph("/api/index", body_style), Paragraph("POST", body_style), Paragraph("Chunk & embed files via nomic-embed-text into ChromaDB", body_style)],
        [Paragraph("/api/query", body_style), Paragraph("POST", body_style), Paragraph("Accepts provider, model_name, api_key, top_k & synthesizes answer", body_style)],
        [Paragraph("/api/generate-report", body_style), Paragraph("POST", body_style), Paragraph("Maps query answer into template and returns filled Markdown report", body_style)]
    ]
    t2 = Table(api_data, colWidths=[130, 50, 350])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(t2)

    doc.build(story)
    print(f"Updated PDF created at: {filename}")

if __name__ == "__main__":
    create_pdf()
