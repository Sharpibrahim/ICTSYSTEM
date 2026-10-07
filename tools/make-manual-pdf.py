#!/usr/bin/env python3
"""Builds docs/MRHS-ICT-Club-Master-User-Manual.pdf from the app's own manual
content.

    node tools/dump-manual.js            # writes tools/manual.json
    python3 tools/make-manual-pdf.py     # writes the PDF   (needs: pip install fpdf2)

The PDF is generated rather than written twice, so the printed handbook can
never drift from the manual inside the app.
"""
import datetime
import html
import io
import json
import os
import re

from fpdf import FPDF

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'manual.json')
OUT = os.path.join(HERE, '..', 'docs', 'MRHS-ICT-Club-Master-User-Manual.pdf')

INK = (16, 26, 46)
BLUE = (36, 80, 216)
GREY = (110, 124, 150)
LINE = (222, 228, 240)


def clean(text):
    """HTML in the manual content -> plain text the core fonts can print."""
    if text is None:
        return ''
    s = str(text)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'</(p|li|div|h\d)>', '\n', s)
    s = re.sub(r'<li>', '- ', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    for a, b in (('\u2019', "'"), ('\u2018', "'"), ('\u201c', '"'), ('\u201d', '"'),
                 ('\u2014', ' - '), ('\u2013', '-'), ('\u00b7', '-'), ('\u2022', '-'),
                 ('\u2026', '...'), ('\u00a0', ' '), ('\u201a', ','), ('\u201e', '"')):
        s = s.replace(a, b)
    s = s.replace('\u2192', '->')
    # core PDF fonts are Latin-1 only
    s = ''.join(ch if ord(ch) < 256 else '?' for ch in s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


class Manual(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_x(self.l_margin)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, 'MRHS ICT CLUB MASTER - User Manual', align='L')
        self.cell(0, 6, 'Mbazzi Riverside High School ICT Club', align='R')
        self.ln(8)
        self.set_draw_color(*LINE)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_x(self.l_margin)
        self.set_y(-14)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, 'Page %d' % self.page_no(), align='C')

    def h1(self, text):
        self.set_x(self.l_margin)
        self.set_font('Helvetica', 'B', 21)
        self.set_text_color(*BLUE)
        self.multi_cell(0, 10, text)
        self.ln(1)

    def h3(self, text):
        self.set_x(self.l_margin)
        self.ln(2)
        self.set_font('Helvetica', 'B', 10.5)
        self.set_text_color(*INK)
        self.multi_cell(0, 6, clean(text))
        self.ln(1)

    def para(self, text, size=10, style='', colour=INK):
        self.set_x(self.l_margin)
        self.set_font('Helvetica', style, size)
        self.set_text_color(*colour)
        self.multi_cell(0, 5.4, clean(text))
        self.ln(1)

    def bullet(self, text, marker='-'):
        if not (self.l_margin <= self.get_x() < self.w - self.r_margin - 1):
            self.set_x(self.l_margin)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*INK)
        x = self.get_x()
        self.cell(5, 5.4, marker)
        self.set_x(x + 5)
        self.multi_cell(self.w - self.r_margin - (x + 5), 5.4, clean(text))
        self.set_x(self.l_margin)
        self.ln(.6)


def build():
    with io.open(SRC, encoding='utf-8') as fh:
        data = json.load(fh)

    pdf = Manual(format='A4', unit='mm')
    pdf.set_auto_page_break(True, margin=18)
    pdf.set_margins(18, 18, 18)

    # cover
    pdf.add_page()
    pdf.ln(26)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 6, 'MBAZZI RIVERSIDE HIGH SCHOOL', align='C')
    pdf.ln(8)
    pdf.set_font('Helvetica', 'B', 30)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 14, 'MRHS ICT CLUB MASTER', align='C')
    pdf.ln(15)
    pdf.set_font('Helvetica', '', 13)
    pdf.set_text_color(*INK)
    pdf.cell(0, 8, 'User Manual', align='C')
    pdf.ln(12)
    pdf.set_draw_color(*BLUE)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.ln(12)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(*GREY)
    pdf.multi_cell(0, 6, 'The administrator handbook for the club management platform:\n'
                         'members, cabinet, meetings, attendance, courses, projects, reports,\n'
                         'certificates, finance, equipment, analytics, accounts, permissions,\n'
                         'colour schemes, screen sizes, backups and hosting.', align='C')
    pdf.ln(14)
    pdf.set_font('Helvetica', '', 9.5)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 6, 'Generated %s   -   %d sections   -   Hosted on Vercel as a static site'
                    % (datetime.date.today().isoformat(), len(data)), align='C')

    # contents
    pdf.add_page()
    pdf.h1('Contents')
    pdf.ln(2)
    for i, sec in enumerate(data, 1):
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(*INK)
        pdf.cell(8, 6, '%d.' % i)
        pdf.cell(0, 6, clean(sec.get('title', '')))
        pdf.ln(6)
        tag = clean(sec.get('tagline', ''))
        if tag:
            pdf.set_font('Helvetica', '', 8.5)
            pdf.set_text_color(*GREY)
            pdf.set_x(26)
            pdf.multi_cell(0, 4.6, tag)
            pdf.ln(1)

    # sections
    for i, sec in enumerate(data, 1):
        pdf.add_page()
        pdf.h1('%d. %s' % (i, clean(sec.get('title', ''))))
        tag = clean(sec.get('tagline', ''))
        if tag:
            pdf.para(tag, 10.5, 'I', GREY)
        if sec.get('intro'):
            pdf.ln(1)
            pdf.para(sec['intro'])
        if sec.get('steps'):
            pdf.h3('Step by step')
            for s in sec['steps']:
                pdf.bullet(s)
        if sec.get('notes'):
            pdf.h3('Good to know')
            for s in sec['notes']:
                pdf.bullet(s)
        if sec.get('table'):
            t = sec['table']
            head = t.get('head') or []
            rows = t.get('rows') or []
            if head:
                pdf.ln(2)
                pdf.set_font('Helvetica', 'B', 9.5)
                pdf.set_text_color(*INK)
                widths = [40, 132]
                for j, h in enumerate(head):
                    pdf.cell(widths[j] if j < len(widths) else 40, 6, clean(h), border='B')
                pdf.ln(6)
                pdf.set_font('Helvetica', '', 9.5)
                for row in rows:
                    y0 = pdf.get_y()
                    for j, cellv in enumerate(row):
                        x = pdf.get_x()
                        pdf.multi_cell(widths[j] if j < len(widths) else 40, 5, clean(cellv))
                        pdf.set_xy(x + (widths[j] if j < len(widths) else 40), y0)
                    pdf.ln(max(6, 5 * (1 + len(clean(row[-1])) // 60)))
        if sec.get('faq'):
            pdf.h3('Questions')
            for q in sec['faq']:
                pdf.set_font('Helvetica', 'B', 10)
                pdf.set_text_color(*INK)
                pdf.multi_cell(0, 5.4, clean(q.get('q', '')))
                pdf.para(q.get('a', ''), 10, '', INK)

    pdf.output(OUT)
    print('wrote %s - %d pages, %d sections' % (os.path.normpath(OUT), pdf.page_no(), len(data)))


if __name__ == '__main__':
    build()
