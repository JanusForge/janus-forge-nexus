import re

# Read the current app.py
with open('app.py', 'r') as f:
    content = f.read()

# Fix 1: Update Gemini model name from 'gemini-pro' to 'gemini-1.5-flash'
if 'gemini-pro' in content:
    content = content.replace("'gemini-pro'", "'gemini-1.5-flash'")
    print("✅ Updated Gemini model to gemini-1.5-flash")

# Fix 2: Find and fix the Grok client variable mismatch
# Look for the get_grok_response function and fix the variable name
if 'groq_client' in content:
    content = content.replace('groq_client', 'grok_client')
    print("✅ Fixed Grok client variable name from groq_client to grok_client")

# Write the fixed content back
with open('app.py', 'w') as f:
    f.write(content)

print("✅ All AI client fixes applied")
