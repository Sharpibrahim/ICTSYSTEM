import io
p = 'js/modules/manual.js'
s = io.open(p, encoding='utf-8').read()
anchor = "'The same window is available in <strong>Settings → Club information → Certificate background</strong>, where you can click either tile to switch designs, remove your image, or preview a real certificate at any time. The design you pick applies to every certificate, every print-out and every download.',"
assert s.count(anchor) == 1, 'anchor'
add = anchor + "\n        'If your background leaves its clear space somewhere else, use <strong>Align the content</strong> in the same window: choose Top / Middle / Bottom and Left / Center / Right, nudge the block sideways or up and down, and change the text size. A live sample certificate below the controls updates as you drag, so you can see exactly where the name and signatures will land. <strong>Reset alignment</strong> puts everything back in the centre.',"
s = s.replace(anchor, add)
io.open(p, 'w', encoding='utf-8').write(s)
print('manual updated')

p = 'README.md'
s = io.open(p, encoding='utf-8').read()
old = "The design is switched from **Certificates → Certificate background**"
new = "The design and the **content alignment** (top/middle/bottom, left/center/right, nudges and text size) are set from **Certificates → Certificate background**"
assert s.count(old) == 1, 'readme anchor'
s = s.replace(old, new, 1)
old2 = "(also on every certificate page, inside every certificate preview, and in **Settings → Club information → Certificate background**), where an A4-landscape PNG/JPEG can be uploaded as well"
new2 = "(the same window is on every certificate page, inside every certificate preview, and in **Settings → Club information → Certificate background**), where an A4-landscape PNG/JPEG can be uploaded as well"
assert s.count(old2) == 1, 'readme anchor 2'
s = s.replace(old2, new2)
io.open(p, 'w', encoding='utf-8').write(s)
print('README updated')
