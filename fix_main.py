import re

with open(r"C:\suspicious activity detection\ai_pipeline\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the simulation block and nested try blocks with a ultra-clean loop
old_block_pattern = re.compile(
    r"    try:\s+while True:\s+try:\s+if not use_simulation:\s+try:",
    re.MULTILINE
)

print("Found match:", bool(old_block_pattern.search(content)))
