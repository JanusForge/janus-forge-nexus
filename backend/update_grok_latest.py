import re

# Read the current app.py
with open('app.py', 'r') as f:
    content = f.read()

# Update Grok model to latest version
if 'model="grok-3"' in content:
    content = content.replace('model="grok-3"', 'model="grok-4-latest"')
    print("✅ Updated Grok model to grok-4-latest for SuperGrok")

# Write the fixed content back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Grok model updated to latest version")
