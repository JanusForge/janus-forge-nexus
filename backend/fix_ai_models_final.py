import re

# Read the current app.py
with open('app.py', 'r') as f:
    content = f.read()

# Fix 1: Update Grok model to correct xAI model
if 'model="mixtral-8x7b-32768"' in content:
    content = content.replace('model="mixtral-8x7b-32768"', 'model="grok-beta"')
    print("✅ Updated Grok model to grok-beta")

# Fix 2: Update Gemini model - try different versions
if "'gemini-1.5-flash'" in content:
    content = content.replace("'gemini-1.5-flash'", "'models/gemini-1.5-flash'")
    print("✅ Updated Gemini model to models/gemini-1.5-flash")

# Write the fixed content back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Final AI model fixes applied")
