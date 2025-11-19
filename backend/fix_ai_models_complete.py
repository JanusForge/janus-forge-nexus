import re

# Read the current app.py
with open('app.py', 'r') as f:
    content = f.read()

# Fix 1: Update Grok to grok-3 (as per error message)
if 'model="grok-beta"' in content:
    content = content.replace('model="grok-beta"', 'model="grok-3"')
    print("✅ Updated Grok model to grok-3")

# Fix 2: Update Gemini model - remove 'models/' prefix
if "'models/gemini-1.5-flash'" in content:
    content = content.replace("'models/gemini-1.5-flash'", "'gemini-1.5-flash-001'")
    print("✅ Updated Gemini model to gemini-1.5-flash-001")

# Write the fixed content back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Complete AI model fixes applied")
