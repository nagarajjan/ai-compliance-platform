import os, json, re

def load_document(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def simple_summary(text):
    # Very naive: first two sentences
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return ' '.join(sentences[:2]) if sentences else ''

def extract_key_points(text):
    # Find bullet lines starting with '-'
    points = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith('- '):
            points.append(line[2:])
    return '\n'.join(points)

def render_template(template_path, data):
    with open(template_path, 'r', encoding='utf-8') as f:
        tmpl = f.read()
    for k, v in data.items():
        tmpl = tmpl.replace(f'{{{{ {k} }}}}', v)
    # missing placeholders handling is already in backend; here we assume all present
    return tmpl

def main():
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'workspaces', 'demo'))
    doc_path = os.path.join(workspace_root, 'raw', 'sample_doc.md')
    template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates', 'report_template.md'))
    doc_text = load_document(doc_path)
    summary = simple_summary(doc_text)
    key_points = extract_key_points(doc_text)
    report = render_template(template_path, {'summary': summary, 'key_points': key_points})
    out_path = os.path.join(workspace_root, 'reports', 'demo_report.md')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print('Report generated at', out_path)

if __name__ == '__main__':
    main()
