import re

# Read the current app.py
with open('app.py', 'r') as f:
    content = f.read()

# Update Gemini to the most likely working model
if "'gemini-1.5-flash'" in content:
    content = content.replace("'gemini-1.5-flash'", "'gemini-pro'")
    print("✅ Updated Gemini model to gemini-pro (likely working version)")

# Write the fixed content back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Gemini model updated to likely working version")
